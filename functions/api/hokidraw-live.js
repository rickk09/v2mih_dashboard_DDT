
// V46.3 - HOKIDRAW LIVE RESULT
// Cloudflare Pages Functions + D1
// Verified 5D first prize -> last 4 digits
// Includes upstream diagnostics and safe D1 persistence.

const HEAD = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store'
};

const respond = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: HEAD
  });

const API =
  'https://www.hokidraw.com/api/livelottery-watchprize/games/getHistory';

function jakartaNow() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date());

  const x = Object.fromEntries(
    parts.map(p => [p.type, p.value])
  );

  return {
    date: `${x.year}-${x.month}-${x.day}`,
    time: `${x.hour}:${x.minute}:${x.second}`,
    timestamp:
      `${x.year}-${x.month}-${x.day} ` +
      `${x.hour}:${x.minute}:${x.second}`
  };
}

function validDate(date) {
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(date)) return false;

  const d = new Date(date + 'T00:00:00Z');

  return (
    !Number.isNaN(d.getTime()) &&
    d.toISOString().slice(0, 10) === date
  );
}

async function init(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS hokidraw_live_results (
      draw_date TEXT NOT NULL,
      market TEXT NOT NULL,
      draw_time TEXT NOT NULL,
      number TEXT NOT NULL,
      original_five TEXT NOT NULL,
      session_period TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY(draw_date, market)
    )
  `).run();
}

async function authorized(req, secret) {
  if (!secret) return false;

  const cookie = (req.headers.get('cookie') || '')
    .split(';')
    .map(x => x.trim())
    .find(x => x.startsWith('ddt_admin='));

  if (!cookie) return false;

  let parts;

  try {
    parts = decodeURIComponent(
      cookie.slice('ddt_admin='.length)
    ).split('.');
  } catch {
    return false;
  }

  if (
    parts.length !== 3 ||
    parts[0] !== 'admin' ||
    !Number.isFinite(Number(parts[1])) ||
    Number(parts[1]) < Date.now() / 1000
  ) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    {
      name: 'HMAC',
      hash: 'SHA-256'
    },
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
  ]
    .map(x => x.toString(16).padStart(2, '0'))
    .join('');

  return (
    signature.length === parts[2].length &&
    [...signature].reduce(
      (difference, character, index) =>
        difference |
        (character.charCodeAt(0) ^
          parts[2].charCodeAt(index)),
      0
    ) === 0
  );
}

function buildSourceUrl(date) {
  const start = Date.parse(
    date + 'T00:00:00+07:00'
  );

  if (!Number.isFinite(start)) {
    throw Error('Tanggal tidak valid');
  }

  const end = start + 86400000 - 1000;

  const url = new URL(API);

  url.searchParams.set('gameId', '3');
  url.searchParams.set('startTime', String(start));
  url.searchParams.set('endTime', String(end));

  return url.toString();
}

async function fetchSource(date) {
  const url = buildSourceUrl(date);

  let response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        accept:
          'application/json, text/javascript, */*; q=0.01',
        'content-type':
          'application/x-www-form-urlencoded',
        origin: 'https://www.hokidraw.com',
        referer:
          'https://www.hokidraw.com/live-draw.html'
      },
      body: '',
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
      cf: {
        cacheTtl: 0
      }
    });
  } catch (error) {
    const diagnostics = {
      stage: 'fetch',
      sourceUrl: url,
      message: String(error?.message || error),
      name: String(error?.name || 'Error')
    };

    console.error(
      'HOKIDRAW FETCH ERROR',
      JSON.stringify(diagnostics)
    );

    throw Object.assign(
      Error('Gagal menghubungi API HOKIDRAW'),
      { diagnostics }
    );
  }

  const contentType =
    response.headers.get('content-type') || '';

  const body = await response.text();

  const diagnostics = {
    stage: 'upstream',
    sourceUrl: url,
    finalUrl: response.url,
    httpStatus: response.status,
    statusText: response.statusText,
    contentType,
    server: response.headers.get('server'),
    cfRay: response.headers.get('cf-ray'),
    bodyPreview: body.slice(0, 500)
  };

  if (!response.ok) {
    console.error(
      'HOKIDRAW UPSTREAM ERROR',
      JSON.stringify(diagnostics)
    );

    throw Object.assign(
      Error(
        'HOKIDRAW upstream HTTP ' +
        response.status
      ),
      { diagnostics }
    );
  }

  let obj;

  try {
    obj = JSON.parse(body);
  } catch {
    console.error(
      'HOKIDRAW INVALID JSON',
      JSON.stringify(diagnostics)
    );

    throw Object.assign(
      Error('API HOKIDRAW tidak mengembalikan JSON'),
      { diagnostics }
    );
  }

  if (
    String(obj?.code) !== '0' ||
    !Array.isArray(obj?.data)
  ) {
    throw Object.assign(
      Error('Respons riwayat HOKIDRAW tidak valid'),
      {
        diagnostics: {
          ...diagnostics,
          apiCode: obj?.code ?? null,
          apiMessage: obj?.msg ?? null,
          dataIsArray: Array.isArray(obj?.data)
        }
      }
    );
  }

  return {
    data: obj.data,
    diagnostics: {
      ...diagnostics,
      bodyPreview: undefined,
      apiCode: obj.code,
      apiMessage: obj.msg,
      totalRecords: obj.data.length
    }
  };
}

function parseVerified(records, date) {
  const now = jakartaNow();
  const results = new Map();

  const stats = {
    totalRecords: records.length,
    finishedRecords: 0,
    matchedDate: 0,
    validResults: 0,
    pendingAnnouncement: 0
  };

  for (const rec of records) {
    const finished =
      String(rec?.state) === '8' ||
      String(rec?.stateName || '')
        .toLowerCase() === 'finish';

    if (!finished) continue;

    stats.finishedRecords++;

    const stamp = String(rec?.presetTime || '');

    const match =
      /^(20\d{2}-\d{2}-\d{2}) (\d{2}):00:00$/
        .exec(stamp);

    if (!match) continue;
    if (match[1] !== date) continue;
    if (Number(match[2]) > 23) continue;

    stats.matchedDate++;

    // The source's startTime indicates when the
    // session result becomes available.
    // Never publish a result before that time.
    const announcementTime =
      String(rec?.startTime || '');

    if (
      !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/
        .test(announcementTime)
    ) {
      continue;
    }

    if (announcementTime > now.timestamp) {
      stats.pendingAnnouncement++;
      continue;
    }

    const winners = Array.isArray(rec?.wins)
      ? rec.wins.filter(
          w => Number(w?.winBatch) === 1
        )
      : [];

    if (winners.length !== 1) continue;

    const raw = String(
      winners[0]?.winNo ?? ''
    );

    if (!/^\d{5}$/.test(raw)) continue;

    const period = String(
      rec?.sessionPeriod ?? ''
    );

    if (!/^\d+$/.test(period)) continue;

    const market =
      'HOKIDRAW ' + match[2] + ':00';

    const entry = {
      market,
      date,
      time: match[2] + ':00:00',
      number: raw.slice(-4),
      originalFive: raw,
      sessionPeriod: period
    };

    if (results.has(market)) {
      const previous = results.get(market);

      if (
        previous.number !== entry.number ||
        previous.sessionPeriod !== entry.sessionPeriod
      ) {
        throw Error(
          'Konflik dua hasil sumber untuk ' +
          market
        );
      }
    }

    results.set(market, entry);
    stats.validResults = results.size;
  }

  return {
    verified: [...results.values()],
    stats
  };
}

export async function onRequestGet({
  request,
  env
}) {
  const url = new URL(request.url);

  const date =
    url.searchParams.get('date') ||
    jakartaNow().date;

  if (!validDate(date)) {
    return respond({
      ok: false,
      error: 'Tanggal tidak valid'
    }, 400);
  }

  // Diagnostic mode: admin only.
  // Does not modify D1.
  if (url.searchParams.get('diagnose') === '1') {
    if (
      !await authorized(
        request,
        env.ADMIN_PASSWORD
      )
    ) {
      return respond({
        ok: false,
        error: 'Admin login diperlukan'
      }, 401);
    }

    try {
      const source = await fetchSource(date);

      const parsed = parseVerified(
        source.data,
        date
      );

      return respond({
        ok: true,
        date,
        diagnostics: source.diagnostics,
        stats: parsed.stats,
        verified: parsed.verified
      });
    } catch (error) {
      return respond({
        ok: false,
        date,
        error: String(
          error?.message || error
        ),
        diagnostics:
          error?.diagnostics || null
      }, 502);
    }
  }

  if (!env.DB) {
    return respond({
      ok: false,
      error: 'D1 DB offline'
    }, 503);
  }

  try {
    await init(env.DB);

    const query = await env.DB.prepare(`
      SELECT
        market,
        draw_time,
        number,
        original_five,
        session_period
      FROM hokidraw_live_results
      WHERE draw_date = ?
      ORDER BY draw_time
    `).bind(date).all();

    const results = Object.fromEntries(
      (query.results || []).map(x => [
        x.market,
        {
          number: x.number,
          time: x.draw_time,
          originalFive: x.original_five,
          sessionPeriod: x.session_period
        }
      ])
    );

    return respond({
      ok: true,
      date,
      results
    });
  } catch (error) {
    console.error(
      'HOKIDRAW D1 READ ERROR',
      String(error?.message || error)
    );

    return respond({
      ok: false,
      error: String(
        error?.message || error
      )
    }, 500);
  }
}

export async function onRequestPost({
  request,
  env
}) {
  if (
    !await authorized(
      request,
      env.ADMIN_PASSWORD
    )
  ) {
    return respond({
      ok: false,
      error: 'Admin login diperlukan'
    }, 401);
  }

  if (!env.DB) {
    return respond({
      ok: false,
      error: 'D1 DB offline'
    }, 503);
  }

  const date = jakartaNow().date;

  let parsed;
  let sourceDiagnostics;

  try {
    const source = await fetchSource(date);

    sourceDiagnostics = source.diagnostics;

    parsed = parseVerified(
      source.data,
      date
    );
  } catch (error) {
    return respond({
      ok: false,
      date,
      error: String(
        error?.message || error
      ),
      diagnostics:
        error?.diagnostics || null
    }, 502);
  }

  try {
    await init(env.DB);

    let inserted = 0;
    let unchanged = 0;

    const conflicts = [];

    for (const result of parsed.verified) {
      const old = await env.DB.prepare(`
        SELECT number, session_period
        FROM hokidraw_live_results
        WHERE draw_date = ?
          AND market = ?
      `).bind(
        date,
        result.market
      ).first();

      if (old) {
        if (
          old.number !== result.number ||
          old.session_period !==
            result.sessionPeriod
        ) {
          conflicts.push(result.market);
        } else {
          unchanged++;
        }

        continue;
      }

      const saved = await env.DB.prepare(`
        INSERT OR IGNORE INTO hokidraw_live_results (
          draw_date,
          market,
          draw_time,
          number,
          original_five,
          session_period,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        date,
        result.market,
        result.time,
        result.number,
        result.originalFive,
        result.sessionPeriod,
        new Date().toISOString()
      ).run();

      if (saved.meta?.changes) {
        inserted++;
      }
    }

    return respond({
      ok: true,
      date,
      verified: parsed.verified.length,
      inserted,
      unchanged,
      conflicts,
      stats: parsed.stats,
      sourceStatus:
        sourceDiagnostics.httpStatus
    });
  } catch (error) {
    console.error(
      'HOKIDRAW D1 SAVE ERROR',
      String(error?.message || error)
    );

    return respond({
      ok: false,
      date,
      error: String(
        error?.message || error
      )
    }, 500);
  }
}
