
const HEAD = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store'
};

const reply = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: HEAD });

const SOURCES = [
  {
    market: 'KENTUCKYMID',
    session: 'Midday',
    url: 'https://bitsandodds.com/kentucky/lottery/pick-4/midday/'
  },
  {
    market: 'KENTUCKYEVE',
    session: 'Evening',
    url: 'https://bitsandodds.com/kentucky/lottery/pick-4/evening/'
  }
];

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4,
  may: 5, jun: 6, jul: 7, aug: 8,
  sep: 9, oct: 10, nov: 11, dec: 12
};

const pad = n => String(n).padStart(2, '0');

function todayWIB() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());

  const p = Object.fromEntries(
    parts.map(x => [x.type, x.value])
  );

  return `${p.year}-${p.month}-${p.day}`;
}

function previousDate(date) {
  const d = new Date(date + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function validDate(date) {
  return /^20\d{2}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(date + 'T00:00:00Z'));
}

function plain(html) {
  return String(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parse(html, sourceDate, session) {
  const text = plain(html);
  const [year, month, day] = sourceDate.split('-').map(Number);

  const monthName = Object.keys(MONTHS)
    .find(k => MONTHS[k] === month);

  const datePattern = new RegExp(
    '\\b' + monthName + '[a-z]*\\s+' +
    day + ',?\\s+' + year + '\\b',
    'gi'
  );

  const matches = [...text.matchAll(datePattern)];
  const numbers = new Set();

  for (const match of matches) {
    const section = text.slice(
      match.index + match[0].length,
      match.index + match[0].length + 100
    );

    const numberMatch = section.match(
      /^\s*(?:[-–:]\s*)?([0-9](?:\s*[-–]\s*[0-9]){3})\b/
    );

    if (!numberMatch) continue;

    const number = numberMatch[1].replace(/\D/g, '');

    if (/^\d{4}$/.test(number)) {
      numbers.add(number);
    }
  }

  if (numbers.size !== 1) {
    throw Error(
      session + ': expected one confirmed number for ' +
      sourceDate + ', found ' + numbers.size
    );
  }

  return [...numbers][0];
}

async function fetchResults(date) {
  const sourceDate = previousDate(date);
  const results = {};
  const diagnostics = [];

  for (const item of SOURCES) {
    try {
      const response = await fetch(item.url, {
        headers: { accept: 'text/html' },
        redirect: 'follow',
        signal: AbortSignal.timeout(12000),
        cf: { cacheTtl: 0 }
      });

      if (!response.ok) {
        throw Error('Source HTTP ' + response.status);
      }

      const html = await response.text();
      const number = parse(
        html, sourceDate, item.session
      );

      results[item.market] = {
        number,
        sourceDate,
        sourceTime: item.session,
        drawId: 'archive-' + sourceDate + '-' +
          item.session.toLowerCase()
      };

      diagnostics.push({
        market: item.market,
        status: 'FOUND',
        number,
        sourceDate,
        url: item.url
      });
    } catch (error) {
      diagnostics.push({
        market: item.market,
        status: 'NOT_FOUND',
        sourceDate,
        error: String(error.message || error),
        url: item.url
      });
    }
  }

  return { results, diagnostics, sourceDate };
}

async function authorized(request, secret) {
  if (!secret) return false;

  let cookie = '';

  try {
    cookie = decodeURIComponent(
      (request.headers.get('cookie') || '')
        .split(';')
        .map(x => x.trim())
        .find(x => x.startsWith('ddt_admin='))
        ?.slice(10) || ''
    );
  } catch {
    return false;
  }

  const p = cookie.split('.');

  if (
    p.length !== 3 ||
    p[0] !== 'admin' ||
    !Number.isFinite(+p[1]) ||
    +p[1] < Date.now() / 1000
  ) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const bytes = new Uint8Array(
    await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode('admin.' + p[1])
    )
  );

  const sig = [...bytes]
    .map(x => x.toString(16).padStart(2, '0'))
    .join('');

  return sig.length === p[2].length &&
    [...sig].reduce(
      (a, x, i) =>
        a | (x.charCodeAt(0) ^ p[2].charCodeAt(i)),
      0
    ) === 0;
}

async function init(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS kentucky_live_results (
      draw_date TEXT NOT NULL,
      market TEXT NOT NULL,
      source_date TEXT NOT NULL,
      source_time TEXT NOT NULL,
      draw_id TEXT NOT NULL,
      number TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (draw_date, market)
    )
  `).run();
}

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get('date') || todayWIB();

    if (!validDate(date)) {
      return reply({ ok: false, error: 'Invalid date' }, 400);
    }

    if (url.searchParams.get('diagnose') === '1') {
      const data = await fetchResults(date);

      return reply({
        ok: true,
        date,
        sourceDate: data.sourceDate,
        verified: Object.keys(data.results).length > 0,
        results: data.results,
        diagnostics: data.diagnostics,
        note: 'Read-only diagnosis. No data saved.'
      });
    }

    if (!env.DB) {
      return reply({
        ok: false,
        error: 'D1 DB binding missing'
      }, 503);
    }

    await init(env.DB);

    const rows = await env.DB.prepare(`
      SELECT market, number, source_date, source_time
      FROM kentucky_live_results
      WHERE draw_date = ?
    `).bind(date).all();

    return reply({
      ok: true,
      date,
      results: Object.fromEntries(
        (rows.results || []).map(x => [
          x.market,
          {
            number: x.number,
            sourceDate: x.source_date,
            sourceTime: x.source_time
          }
        ])
      )
    });
  } catch (error) {
    return reply({
      ok: false,
      error: String(error.message || error)
    }, 502);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    if (!await authorized(request, env.ADMIN_PASSWORD)) {
      return reply({
        ok: false,
        error: 'Admin login required'
      }, 401);
    }

    if (!env.DB) {
      return reply({
        ok: false,
        error: 'D1 DB binding missing'
      }, 503);
    }

    const date = todayWIB();
    const data = await fetchResults(date);

    await init(env.DB);

    let inserted = 0;
    let unchanged = 0;
    const conflicts = [];

    for (const [market, item] of Object.entries(data.results)) {
      const old = await env.DB.prepare(`
        SELECT number
        FROM kentucky_live_results
        WHERE draw_date = ? AND market = ?
      `).bind(date, market).first();

      if (old) {
        if (old.number !== item.number) {
          conflicts.push(market);
        } else {
          unchanged++;
        }
        continue;
      }       
const result = await env.DB.prepare(`
  INSERT OR IGNORE INTO kentucky_live_results
    source_time, draw_id, number,
    updated_at, created_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).bind(
  date,
  market,
  item.sourceDate,
  item.sourceTime,
  item.drawId,
  item.number,
  new Date().toISOString(),
  new Date().toISOString()
).run();
      if (result.meta?.changes) inserted++;
    }

    return reply({
      ok: true,
      date,
      inserted,
      unchanged,
      conflicts,
      results: data.results,
      diagnostics: data.diagnostics
    });
  } catch (error) {
    return reply({
      ok: false,
      error: String(error.message || error)
    }, 502);
  }
}
