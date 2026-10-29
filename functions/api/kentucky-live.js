
const HEAD = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store'
};

const reply = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: HEAD });

// Kentucky V46.12.1 - sumber arsip publik
const SOURCE_ROOT =
  'https://bitsandodds.com/kentucky/lottery/results/';

const wibDate = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);

const validDate = s =>
  /^20\d{2}-\d{2}-\d{2}$/.test(s) &&
  !Number.isNaN(Date.parse(s + 'T00:00:00Z'));

const previousDate = s =>
  new Date(Date.parse(s + 'T12:00:00Z') - 86400000)
    .toISOString().slice(0, 10);

function plain(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&ndash;|&mdash;/gi, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function parse(html, sourceDate) {
  const text = plain(html);
  const start = text.search(/\bPick\s*4\b/i);

  if (start < 0) {
    throw Object.assign(Error('Pick 4 heading missing'), {
      details: { preview: text.slice(0, 250) }
    });
  }

  const section = text.slice(start, start + 1100)
    .split(/\b(?:Cash Ball|Powerball|Mega Millions|Pick 3)\b/i)[0];

  const result = {};

  for (const [session, market] of [
    ['Midday', 'KENTUCKYMID'],
    ['Evening', 'KENTUCKYEVE']
  ]) {
    const pattern = new RegExp(
      '\\b' + session +
      '\\s*[:–-]?\\s*([0-9](?:\\s*[-–]\\s*[0-9]){3})\\b',
      'i'
    );

    const match = section.match(pattern);

    if (match) {
      const number = match[1].replace(/\D/g, '');

      if (/^\d{4}$/.test(number)) {
        result[market] = {
          number,
          sourceDate,
          sourceTime: session,
          drawId: 'archive-' + sourceDate +
            '-' + session.toLowerCase()
        };
      }
    }
  }

  if (!Object.keys(result).length) {
    throw Object.assign(
      Error('No confirmed Pick 4 digits found'),
      { details: { preview: section.slice(0, 450) } }
    );
  }

  return result;
}

async function source(date) {
  const sourceDate = previousDate(date);
  const url = SOURCE_ROOT + sourceDate + '/';

  const response = await fetch(url, {
    headers: { accept: 'text/html,application/xhtml+xml' },
    signal: AbortSignal.timeout(14000)
  });

  const html = await response.text();

  if (!response.ok) {
    throw Object.assign(
      Error('Kentucky public archive HTTP ' + response.status),
      {
        details: {
          status: response.status,
          url,
          preview: html.slice(0, 200)
        }
      }
    );
  }

  return {
    results: parse(html, sourceDate),
    url,
    sourceDate
  };
}

async function init(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS kentucky_live_results (
      draw_date TEXT NOT NULL,
      market TEXT NOT NULL,
      number TEXT NOT NULL,
      source_date TEXT NOT NULL,
      source_time TEXT NOT NULL,
      draw_id TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY(draw_date, market)
    )
  `).run();
}

async function admin(req, secret) {
  if (!secret) return false;

  let cookie = '';

  try {
    cookie = decodeURIComponent(
      (req.headers.get('cookie') || '')
        .split(';')
        .map(x => x.trim())
        .find(x => x.startsWith('ddt_admin='))
        ?.slice(10) || ''
    );
  } catch {
    return false;
  }

  const parts = cookie.split('.');

  if (
    parts.length !== 3 ||
    parts[0] !== 'admin' ||
    !Number.isFinite(+parts[1]) ||
    +parts[1] < Date.now() / 1000
  ) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = [
    ...new Uint8Array(
      await crypto.subtle.sign(
        'HMAC',
        key,
        new TextEncoder().encode('admin.' + parts[1])
      )
    )
  ].map(x => x.toString(16).padStart(2, '0')).join('');

  return signature.length === parts[2].length &&
    [...signature].reduce(
      (a, x, i) =>
        a | (x.charCodeAt(0) ^ parts[2].charCodeAt(i)),
      0
    ) === 0;
}

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get('date') || wibDate();

    if (!validDate(date)) {
      return reply({ ok: false, error: 'Invalid date' }, 400);
    }

    if (url.searchParams.get('diagnose') === '1') {
      const found = await source(date);

      return reply({
        ok: true,
        date,
        source: found.url,
        sourceDate: found.sourceDate,
        results: found.results,
        note: 'Diagnosis only; no database writes'
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
      SELECT market, number, source_date,
             source_time, draw_id
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
            sourceTime: x.source_time,
            drawId: x.draw_id
          }
        ])
      )
    });
  } catch (e) {
    return reply({
      ok: false,
      error: String(e.message || e),
      details: e.details || null
    }, 502);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    if (!await admin(request, env.ADMIN_PASSWORD)) {
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

    const date =
      new URL(request.url).searchParams.get('date') ||
      wibDate();

    if (!validDate(date)) {
      return reply({ ok: false, error: 'Invalid date' }, 400);
    }

    const mapped = (await source(date)).results;

    await init(env.DB);

    const saved = [];

    for (const [market, item] of Object.entries(mapped)) {
      await env.DB.prepare(`
        INSERT INTO kentucky_live_results
          (draw_date, market, number, source_date,
           source_time, draw_id, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(draw_date, market)
        DO UPDATE SET
          number = excluded.number,
          source_date = excluded.source_date,
          source_time = excluded.source_time,
          draw_id = excluded.draw_id,
          updated_at = excluded.updated_at
      `).bind(
        date,
        market,
        item.number,
        item.sourceDate,
        item.sourceTime,
        item.drawId,
        new Date().toISOString()
      ).run();

      saved.push(market);
    }

    return reply({
      ok: true,
      date,
      saved,
      results: mapped
    });
  } catch (e) {
    return reply({
      ok: false,
      error: String(e.message || e),
      details: e.details || null
    }, 502);
  }
}
