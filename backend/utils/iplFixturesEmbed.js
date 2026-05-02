/** Cricbuzz fixtures embed JSON with backslash-quote instead of ASCII quotes (`\\"`). */

const IPL_SERIES_ID = 9241;
const IST = "Asia/Kolkata";

const MATCH_EMBED_MARKER = "\u005c\u0022match\u005c\u0022:{";

function ymdPartsInTimeZone(epochMs, timeZone, offsetDays = 0) {
  const d = new Date(epochMs);
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function formatLocalClock(epochMs, timeZone) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: timeZone || IST,
    }).format(new Date(epochMs));
  } catch {
    return new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: IST,
    }).format(new Date(epochMs));
  }
}

/** Brace-balance `{...}` on normalized JSON (`"` delimiters). */
function sliceBalancedJsonObjectSubstring(normalizedSlice, braceStartIdx) {
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = braceStartIdx; i < normalizedSlice.length; i += 1) {
    const ch = normalizedSlice[i];

    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
        continue;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return normalizedSlice.slice(braceStartIdx, i + 1);
    }
  }
  return null;
}

/** Map normalized substring length → raw Tail length (handles `\"` collapsing to `"`). */
function rawPrefixLengthForNormalizedLength(rawTail, normalizedLen) {
  let r = 0;
  let n = 0;

  while (n < normalizedLen && r < rawTail.length) {
    if (rawTail.charCodeAt(r) === 92 && rawTail.charCodeAt(r + 1) === 34) {
      r += 2;
      n += 1;
    } else {
      r += 1;
      n += 1;
    }
  }

  return r;
}

/** @returns {{ parsed: object, rawAdvance: number } | null} */
function sliceAndParseEscapedBraceObject(htmlStr, openBraceIdx) {
  if (htmlStr[openBraceIdx] !== "{") return null;

  let hi = Math.min(htmlStr.length, openBraceIdx + 8000);

  while (hi <= htmlStr.length) {
    const rawTail = htmlStr.slice(openBraceIdx, hi);
    const normalizedTail = rawTail.replace(/\\"/g, '"');
    const balanced = sliceBalancedJsonObjectSubstring(normalizedTail, 0);

    if (balanced) {
      try {
        const parsed = JSON.parse(balanced);
        const rawAdvance = rawPrefixLengthForNormalizedLength(rawTail, balanced.length);
        return { parsed, rawAdvance };
      } catch {
        /* likely truncated slice; widen window unless already at eof */
      }
    }

    if (hi >= htmlStr.length) return null;
    const bump = Math.max(8000, (hi - openBraceIdx) * 2);
    hi = Math.min(htmlStr.length, hi + bump);
  }

  return null;
}

function isFinishedResult(status, stateTitle) {
  const s = `${status || ""}`;
  const t = `${stateTitle || ""}`.trim();
  if (!s && !t) return false;
  if (/won\s+by|lost\s+by|no\s+result/i.test(s) || /\b(won|lost)\s+by\b/i.test(t)) return true;
  if (/\b(SRH|MI|GT|RR|RCB|CSK|KKR|PBKS|DC|LSG)\s+won\b/i.test(t)) return true;
  if (/won$/i.test(s.trim())) return true;
  return /tied\b|abandon/i.test(`${s} ${t}`);
}

function classifyMatchInfo(info) {
  const state = `${info?.state || ""}`.trim();
  const status = `${info?.status || ""}`;
  const stateTitle = `${info?.stateTitle || info?.shortStatus || ""}`;
  const desc = `${info?.matchDesc || ""}`;

  const todayKw = /today/i.test(`${status} ${stateTitle} ${desc}`);
  const tomorrowKw = /tomorrow/i.test(`${status} ${stateTitle} ${desc}`);

  if (/^complete$/i.test(state) || isFinishedResult(status, stateTitle)) {
    return { kind: "completed", todayKw, tomorrowKw };
  }

  if (/^(Preview|Upcoming)$/i.test(state) || /match starts at/i.test(status)) {
    return { kind: "upcoming", todayKw, tomorrowKw };
  }

  if (/^In Progress$/i.test(state) || /^live\b/i.test(status) || /\bIn Progress\b/i.test(stateTitle)) {
    return { kind: "live", todayKw, tomorrowKw };
  }

  if (/need\s+\d+|runs\s+(left|required|to)|trail|lead|^[\w]+\s+opt\s+to\b|^[\w]+\s+\d+\/\d+/i.test(status)) {
    return { kind: "live", todayKw, tomorrowKw };
  }

  return { kind: "upcoming", todayKw, tomorrowKw };
}

function formatInnings(teamShort, innings) {
  if (!innings?.inngs1) return null;
  const { runs, wickets, overs } = innings.inngs1;
  if (runs === undefined || runs === null) return null;
  const ovtxt = overs === undefined ? "" : ` (${overs})`;
  const rk = wickets === undefined ? `${runs}${ovtxt}` : `${runs}/${wickets}${ovtxt}`;
  return `${teamShort} ${rk}`;
}

function buildNormalizedRow(embedMatch) {
  const matchBlock = embedMatch?.match ?? embedMatch;
  const info = matchBlock?.matchInfo;
  if (!info) return null;
  if (Number(info.seriesId) !== IPL_SERIES_ID) return null;

  const ms = typeof info.startDate === "string" ? Number(info.startDate) : info.startDate;
  if (!Number.isFinite(ms)) return null;

  const classification = classifyMatchInfo(info);
  const kind = classification.kind;

  let isToday = classification.todayKw;
  let isTomorrow = classification.tomorrowKw;
  let statusLabel = isToday ? "Today" : "Upcoming";

  // 1. Precise time/date classification
  const status = (info.status || "").toLowerCase();
  const desc = (info.matchDesc || "").toLowerCase();

  if (status.includes("today") || desc.includes("today")) {
    isToday = true;
    statusLabel = "Today";
  } else if (status.includes("tomorrow") || desc.includes("tomorrow")) {
    isTomorrow = true;
    statusLabel = "Upcoming";
  }

  // 2. If we have a timestamp, use it as a secondary check for Today/Tomorrow
  if (ms && !isToday && !isTomorrow) {
    const now = new Date();
    const matchDate = new Date(ms);
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: IST,
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });

    const istNowStr = formatter.format(now);
    const istMatchStr = formatter.format(matchDate);

    if (istNowStr === istMatchStr) {
      isToday = true;
      statusLabel = "Today";
    } else {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const istTomorrowStr = formatter.format(tomorrow);

      if (istMatchStr === istTomorrowStr) {
        isTomorrow = true;
        statusLabel = "Upcoming";
      }
    }
  }

  const finished = kind === "completed";
  const tz = IST;
  const team1Name = info.team1?.teamName || "Team A";
  const team2Name = info.team2?.teamName || "Team B";
  const short1 = info.team1?.teamSName || team1Name.slice(0, 3).toUpperCase();
  const short2 = info.team2?.teamSName || team2Name.slice(0, 3).toUpperCase();
  const live = kind === "live";

  const matchYmd = ymdPartsInTimeZone(ms, tz);
  const t1Line = formatInnings(short1, matchBlock.matchScore?.team1Score);
  const t2Line = formatInnings(short2, matchBlock.matchScore?.team2Score);

  let scoreLine = "";
  if (live) {
    const parts = [];
    if (t1Line) parts.push(t1Line);
    if (t2Line) parts.push(t2Line);
    scoreLine = parts.join("\n");
    if (!scoreLine && matchBlock.matchScore) scoreLine = "N/A";
  }

  const venueRaw = `${info.venueInfo?.ground || ""}, ${info.venueInfo?.city || ""}`
    .replace(/^,\s*/, "")
    .replace(/,\s*$/, "");

  return {
    matchId: String(info.matchId),
    title: `${team1Name} vs ${team2Name}, ${info.matchDesc || "Match"}, Indian Premier League 2026`,
    teamA: team1Name,
    teamB: team2Name,
    teamAShort: short1,
    teamBShort: short2,
    venue: venueRaw,
    matchDesc: info.matchDesc,
    startDateEpochMs: ms,
    date: matchYmd,
    dateTimeIso: new Date(ms).toISOString(),
    localStartTimeDisplay: `${formatLocalClock(ms, tz)} IST`,
    isLive: live,
    isToday,
    isTomorrow,
    isCompleted: finished,
    uiListBadge: live ? "LIVE" : (isToday ? "TODAY" : (isTomorrow ? "TOMORROW" : "")),
    uiTopStatus: live ? "LIVE" : statusLabel,
    statusDetail: `${info.status || ""}`,
    scoreLive: live ? (scoreLine.split("\n")[0] || "N/A") : undefined,
    scoreLiveLine2:
      live && scoreLine.includes("\n") ? scoreLine.split("\n")[1] : undefined,
    scoreLineLive: live ? scoreLine : undefined,
  };
}

function sortRank(row) {
  if (row.isLive) return 0;
  if (row.isToday && !row.isCompleted) return 1;
  if (row.isTomorrow && !row.isCompleted) return 2;
  if (!row.isCompleted) return 3;
  return 4;
}

function stripNonLiveScoreFields(row) {
  if (!row?.isLive) {
    const { scoreLive, scoreLiveLine2, scoreLineLive, ...rest } = row;
    return rest;
  }
  return row;
}

function extractEmbeddedIplMatches(html) {
  const matches = [];
  const markers = [MATCH_EMBED_MARKER, '{"matchInfo":{', '"matchInfo":{'];

  for (const marker of markers) {
    let pos = 0;
    while (pos < html.length) {
      const ix = html.indexOf(marker, pos);
      if (ix === -1) break;

      // Safety: limit total extraction attempts to avoid hangs on massive malformed files
      if (matches.length > 50) break;

      let openBrace = ix + marker.length - 1;
      // Adjust if marker doesn't end with {
      if (html[openBrace] !== "{") {
        const nextBrace = html.indexOf("{", ix);
        if (nextBrace === -1 || nextBrace - ix > 100) {
          pos = ix + 1;
          continue;
        }
        openBrace = nextBrace;
      }

      const hit = sliceAndParseEscapedBraceObject(html, openBrace);
      if (hit && hit.parsed && (hit.parsed.matchId || hit.parsed.matchInfo)) {
        const row = buildNormalizedRow(hit.parsed);
        if (row) {
          // Deduplicate
          if (!matches.some(m => m.matchId === row.matchId)) {
            matches.push(row);
          }
        }
        pos = openBrace + (hit.rawAdvance || 1);
      } else {
        pos = ix + 1;
      }
    }
  }

  return matches;
}

function buildFixturePayloadFromHtml(html) {
  const decoded = extractEmbeddedIplMatches(html);
  if (!decoded || !decoded.length) return null;

  decoded.sort((a, b) => {
    const d = sortRank(a) - sortRank(b);
    if (d !== 0) return d;
    return a.startDateEpochMs - b.startDateEpochMs;
  });

  const topRaw = decoded[0];
  const remainder = decoded.slice(1);

  // Keep remainder sorted by rank then time
  remainder.sort((a, b) => {
    const d = sortRank(a) - sortRank(b);
    if (d !== 0) return d;
    return a.startDateEpochMs - b.startDateEpochMs;
  });

  const topMatchBase = stripNonLiveScoreFields({
    ...topRaw,
    uiTopStatus: topRaw.isLive ? "LIVE" : topRaw.uiTopStatus,
    startTimeUi: topRaw.isLive ? undefined : topRaw.localStartTimeDisplay,
  });

  if (topRaw.isLive) {
    topMatchBase.scoreLive = topRaw.scoreLive;
    topMatchBase.scoreLiveLine2 = topRaw.scoreLiveLine2;
    topMatchBase.scoreLineLive = topRaw.scoreLineLive;
  }

  const upcomingMatches = remainder.map((m) =>
    stripNonLiveScoreFields({
      ...m,
      startTimeUi: m.localStartTimeDisplay,
      uiListBadge: m.isLive ? "LIVE" : (m.isToday ? "TODAY" : (m.isTomorrow ? "TOMORROW" : "")),
      uiTopStatus: m.isLive ? "LIVE" : m.uiTopStatus,
    })
  );

  const matches = [topMatchBase, ...upcomingMatches].filter((m) => m?.matchId);

  return {
    topMatch: topMatchBase,
    upcomingMatches,
    matches,
  };
}

module.exports = {
  IPL_FIXTURES_URL_DEFAULT:
    "https://www.cricbuzz.com/cricket-series/9241/indian-premier-league-2026/matches",
  buildFixturePayloadFromHtml,
  sortRank,
};
