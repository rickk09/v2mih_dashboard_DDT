
/*
 * HOKIDRAW LIVE V46.5
 * Cloudflare Pages Functions + D1
 * File: functions/api/hokidraw-live.js
 */

const HEAD = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const respond = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: HEAD
  });

const API =
  "https://www.hokidraw.com/api/livelottery-watchprize/games/getHistory";

function jakartaNow() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());

  const x = Object.fromEntries(
    parts.map(p => [p.type, p.value])
  );

  return {
    date: `${x.year}-${x.month}-${x.day}`,
    time: `${x.hour}:${x.minute}:${x.second}`
  };
}

function validDate(date) {
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(date)) return false;
  const t = Date.parse(date + "T00:00:00Z");
  return Number.isFinite(t) &&
    new Date(t).toISOString().slice(0, 10) === date;
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

  const cookie = (req.headers.get("cookie") || "")
    .split(";")
    .map(x => x.trim())
    .find(x => x.startsWith("ddt_admin="));

  if (!cookie) return false;

  let parts;
  try {
    parts = decodeURIComponent(cookie.slice(10)).split(".");
  } catch {
    return false;
  }

  if (
    parts.length !== 3 ||
    parts[0] !== "admin" ||
    !Number.isFinite(Number(parts[1])) ||
    Number(parts[1]) < Date.now() / 1000
  ) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode("admin." + parts[1])
    )
  );

  const expected = [...signature]
    .map(x => x.toString(16).padStart(2, "0"))
    .join("");

  if (expected.length !== parts[2].length) return false;

  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ parts[2].charCodeAt(i);
  }

  return diff === 0;
}

function sourceUrl(date) {
  const start = Date.parse(date + "T00:00:00+07:00");
  const end = start + 86400000 - 1000;

  const url = new URL(API);
  url.searchParams.set("gameId", "3");
  url.searchParams.set("startTime", String(start));
  url.searchParams.set("endTime", String(end));

  return url.toString();
}

async function fetchVerified(date) {
  const url = sourceUrl(date);
  let r;

  try {
    r = await fetch(url, {
      method: "POST",
      headers: {
        "accept": "application/json, text/javascript, */*; q=0.01",
        "content-type": "application/x-www-form-urlencoded",
        "x-requested-with": "XMLHttpRequest",
        "origin": "https://www.hokidraw.com",
        "referer": "https://www.hokidraw.com/live-draw.html"
      },
      body: "",
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      cf: { cacheTtl: 0 }
    });
  } catch (e) {
    throw Object.assign(
      new Error("Gagal menghubungi API HOKIDRAW"),
      {
        diagnostics: {
          stage: "fetch",
          sourceUrl: url,
          message: String(e?.message || e)
        }
      }
    );
  }

  const body = await r.text();

  const diagnostics = {
    stage: "upstream",
    sourceUrl: url,
    finalUrl: r.url,
    httpStatus: r.status,
    statusText: r.statusText,
    contentType: r.headers.get("content-type") || "",
    server: r.headers.get("server") || "",
    cfRay: r.headers.get("cf-ray") || "",
    bodyPreview: body.slice(0, 500)
  };

  if (!r.ok) {
    console.error("HOKIDRAW UPSTREAM", JSON.stringify(diagnostics));

    throw Object.assign(
      new Error("HOKIDRAW upstream HTTP " + r.status),
      { diagnostics }
    );
  }

  let obj;
  try {
    obj = JSON.parse(body);
  } catch {
    throw Object.assign(
      new Error("Respons HOKIDRAW bukan JSON"),
      { diagnostics }
    );
  }

  if (
    String(obj?.code) !== "0" ||
    !Array.isArray(obj?.data)
  ) {
    throw Object.assign(
      new Error("Format riwayat HOKIDRAW tidak valid"),
      { diagnostics }
    );
  }

  const out = new Map();
  const stats = {
    totalRecords: obj.data.length,
    finishedRecords: 0,
    matchedDate: 0,
    validResults: 0,
    invalidRecords: 0
  };

  const pattern =
    /^(20\d{2}-\d{2}-\d{2}) (\d{2}):00(?::00)?$/;

  for (const rec of obj.data) {
    const finished =
      String(rec?.state) === "8" ||
      String(rec?.stateName || "").toLowerCase() === "finish";

    if (!finished) continue;
    stats.finishedRecords++;

    // Jam pasar berasal dari sessionName.
    // Contoh 10:00 -> HOKIDRAW 10:00.
    const session = pattern.exec(
      String(rec?.sessionName || "")
    );

    const preset = pattern.exec(
      String(rec?.presetTime || "")
    );

    const match = session || preset;

    if (!match || Number(match[2]) > 23) {
      stats.invalidRecords++;
      continue;
    }

    // Tolak data jika dua identitas sesi bertentangan.
    if (
      session &&
      preset &&
      (
        session[1] !== preset[1] ||
        session[2] !== preset[2]
      )
    ) {
      stats.invalidRecords++;
      continue;
    }

    if (match[1] !== date) continue;
    stats.matchedDate++;

    const winners = Array.isArray(rec?.wins)
      ? rec.wins.filter(w => Number(w?.winBatch) === 1)
      : [];

    if (winners.length !== 1) {
      stats.invalidRecords++;
      continue;
    }

    const raw = String(winners[0]?.winNo ?? "");
    const period = String(rec?.sessionPeriod ?? "");

    if (
      !/^\d{5}$/.test(raw) ||
      !/^\d+$/.test(period)
    ) {
      stats.invalidRecords++;
      continue;
    }

    const hour = match[2];
    const market = "HOKIDRAW " + hour + ":00";

    const entry = {
      market,
      date,
      time: hour + ":00:00",
      number: raw.slice(-4),
      originalFive: raw,
      sessionPeriod: period
    };

    if (out.has(market)) {
      const previous = out.get(market);

      if (
        previous.number !== entry.number ||
        previous.sessionPeriod !== entry.sessionPeriod
      ) {
        throw new Error(
          "Konflik dua hasil sumber untuk " + market
        );
      }
    }

    out.set(market, entry);
  }

  stats.validResults = out.size;

  return {
    verified: [...out.values()],
    stats,
    diagnostics
  };
}

// GET: baca hasil yang sudah tersimpan di D1.
// GET ?diagnose=1: pemeriksaan sumber, admin saja.
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") || jakartaNow().date;

  if (!validDate(date)) {
    return respond({
      ok: false,
      error: "Tanggal tidak valid"
    }, 400);
  }

  if (url.searchParams.get("diagnose") === "1") {
    if (!await authorized(request, env.ADMIN_PASSWORD)) {
      return respond({
        ok: false,
        error: "Admin login diperlukan"
      }, 401);
    }

    try {
      const data = await fetchVerified(date);

      return respond({
        ok: true,
        date,
        verified: data.verified,
        stats: data.stats,
        diagnostics: data.diagnostics,
        note: "Diagnose tidak menyimpan data ke D1."
      });
    } catch (e) {
      return respond({
        ok: false,
        date,
        error: String(e?.message || e),
        diagnostics: e?.diagnostics || null
      }, 502);
    }
  }

  if (!env.DB) {
    return respond({
      ok: false,
      error: "D1 DB offline"
    }, 503);
  }

  try {
    await init(env.DB);

    const r = await env.DB.prepare(`
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
      (r.results || []).map(x => [
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
  } catch (e) {
    return respond({
      ok: false,
      error: String(e?.message || e)
    }, 500);
  }
}

// POST: sinkronisasi sumber dan simpan ke D1.
export async function onRequestPost({ request, env }) {
  if (!await authorized(request, env.ADMIN_PASSWORD)) {
    return respond({
      ok: false,
      error: "Admin login diperlukan"
    }, 401);
  }

  if (!env.DB) {
    return respond({
      ok: false,
      error: "D1 DB offline"
    }, 503);
  }

  const date = jakartaNow().date;
  let data;

  try {
    data = await fetchVerified(date);
  } catch (e) {
    return respond({
      ok: false,
      date,
      error: String(e?.message || e),
      diagnostics: e?.diagnostics || null
    }, 502);
  }

  try {
    await init(env.DB);

    let inserted = 0;
    let unchanged = 0;
    const conflicts = [];

    for (const v of data.verified) {
      const old = await env.DB.prepare(`
        SELECT number, session_period
        FROM hokidraw_live_results
        WHERE draw_date = ? AND market = ?
      `).bind(date, v.market).first();

      if (old) {
        if (
          old.number !== v.number ||
          old.session_period !== v.sessionPeriod
        ) {
          conflicts.push(v.market);
        } else {
          unchanged++;
        }
        continue;
      }

      const r = await env.DB.prepare(`
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
        v.market,
        v.time,
        v.number,
        v.originalFive,
        v.sessionPeriod,
        new Date().toISOString()
      ).run();

      if (r.meta?.changes) inserted++;
    }

    return respond({
      ok: true,
      date,
      verified: data.verified.length,
      inserted,
      unchanged,
      conflicts,
      stats: data.stats
    });
  } catch (e) {
    return respond({
      ok: false,
      date,
      error: String(e?.message || e)
    }, 500);
  }
}
