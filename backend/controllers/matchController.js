const axios = require("axios");
const NodeCache = require("node-cache");
const https = require("https");
const { buildFixturePayloadFromHtml, sortRank } = require("../utils/iplFixturesEmbed");

// Shared agent to prevent TLSSocket listener accumulation (memory leak fix)
const httpsAgent = new https.Agent({ 
  keepAlive: true, 
  maxSockets: 10,
  maxFreeSockets: 5
});

const matchCache = new NodeCache({ stdTTL: 1 });
const IPL_FILTER_RE = /(ipl|indian[- ]premier[- ]league)/i;
const IPL_FIXTURES_URL = "https://www.cricbuzz.com/cricket-series/9241/indian-premier-league-2026/matches";
const COMPLETED_STATUS_RE = /(won|abandoned|no result|tied)/i;

const parseLiveMatchesFromHtml = (html) => {
  const cheerio = require("cheerio");
  const $ = cheerio.load(html);
  const matches = [];
  const seenIds = new Set();

  $('a[href^="/live-cricket-scores/"]').each((_, el) => {
    const href = $(el).attr("href") || "";
    const titleAttr = ($(el).attr("title") || "").trim();
    const idCandidate = href.split("/")[2] || "";
    if (!/^\d+$/.test(idCandidate) || seenIds.has(idCandidate)) return;

    const textBlob = `${href} ${titleAttr} ${$(el).text()}`;
    if (!IPL_FILTER_RE.test(textBlob)) return;
    seenIds.add(idCandidate);

    const teamNodes = $(el).find(".hidden.wb\\:block.truncate, .truncate.font-semibold");
    const scoreNodes = $(el).find(".font-medium.wb\\:font-semibold.truncate, .font-medium.truncate");
    let team1 = $(teamNodes[0]).text().trim();
    let team2 = $(teamNodes[1]).text().trim();
    const titleBase = titleAttr.split("-")[0].trim();
    if ((!team1 || !team2) && titleBase.includes(" vs ")) {
      const parsedTeams = titleBase.split(",")[0].split(" vs ").map((t) => t.trim());
      team1 = team1 || parsedTeams[0];
      team2 = team2 || parsedTeams[1];
    }
    team1 = team1 || "Team A";
    team2 = team2 || "Team B";
    const score1 = $(scoreNodes[0]).text().trim();

    let status =
      $(el).find(".text-cbLive, .text-cbLiveDark, .text-cbTxtLive, .text-cbComplete").first().text().trim() ||
      "Upcoming";
    if (status === "Upcoming") {
      const lowerBlob = textBlob.toLowerCase();
      if (lowerBlob.includes("today")) status = "Today";
      else if (lowerBlob.includes("tomorrow")) status = "Tomorrow";
      else if (lowerBlob.includes("preview")) status = "Preview";
      else if (lowerBlob.includes("live")) status = "Live";
      else if (lowerBlob.includes("won")) status = "Completed";
    }

    let scoreText = score1 || "N/A";
    let oversText = "N/A";
    if (score1.includes("(")) {
      const parts = score1.split("(");
      scoreText = parts[0].trim() || "N/A";
      oversText = parts[1]?.replace(")", "").trim() || "N/A";
    }

    let matchTitle = titleBase || `${team1} vs ${team2}`;
    if (!IPL_FILTER_RE.test(matchTitle)) {
      matchTitle = `${matchTitle} (IPL)`;
    }

    matches.push({
      matchId: idCandidate,
      title: matchTitle,
      score: scoreText,
      overs: oversText,
      status,
      teamA: team1,
      teamB: team2,
    });
  });

  return matches;
};

const normalizeMatch = (rawMatch) => ({
  matchId: rawMatch?.id || rawMatch?.unique_id || rawMatch?.match_id,
  title:
    rawMatch?.name ||
    rawMatch?.title ||
    `${rawMatch?.teamInfo?.[0]?.shortname || "Team A"} vs ${rawMatch?.teamInfo?.[1]?.shortname || "Team B"
    }`,
  score: rawMatch?.score?.[0]?.r
    ? `${rawMatch.score[0].r}/${rawMatch.score[0].w || 0}`
    : rawMatch?.score || "N/A",
  overs: rawMatch?.score?.[0]?.o || rawMatch?.overs || "N/A",
  status: rawMatch?.status || "Status unavailable",
  teamA: rawMatch?.teams?.[0] || rawMatch?.teamInfo?.[0]?.shortname || "Team A",
  teamB: rawMatch?.teams?.[1] || rawMatch?.teamInfo?.[1]?.shortname || "Team B",
});

const getLiveMatches = async (req, res, next) => {
  try {
    const cached = matchCache.get("fixture_payload");
    if (cached) {
      return res.json({
        source: "cache",
        ...cached
      });
    }

    const { data } = await axios.get(IPL_FIXTURES_URL, {
      timeout: 10000,
      httpsAgent, // Use the shared agent
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
      },
    });

    const payload = buildFixturePayloadFromHtml(data);
    const parsedMatches = parseLiveMatchesFromHtml(data);

    // Merge and deduplicate
    const allMatchesMap = new Map();
    
    // Add fallback matches
    parsedMatches.forEach(m => allMatchesMap.set(m.matchId, {
      ...m,
      isLive: (m.status || "").toLowerCase().includes("live"),
      isToday: (m.status || "").toLowerCase().includes("today"),
      isTomorrow: (m.status || "").toLowerCase().includes("tomorrow"),
      startTimeUi: m.time || "",
    }));

    // Add embed matches (overwrite fallback)
    if (payload?.matches) {
      payload.matches.forEach(m => allMatchesMap.set(m.matchId, m));
    }

    const mergedMatches = Array.from(allMatchesMap.values());
    
    // Filter: Only Live, Today, or Tomorrow
    const filteredMatches = mergedMatches.filter(m => 
       m.isLive || m.isToday || m.isTomorrow
    );

    // Sort: Live > Today > Tomorrow
    filteredMatches.sort((a, b) => {
      const d = sortRank(a) - sortRank(b);
      if (d !== 0) return d;
      return (a.startDateEpochMs || 0) - (b.startDateEpochMs || 0);
    });

    const finalPayload = {
      matches: filteredMatches,
      count: filteredMatches.length
    };

    matchCache.set("fixture_payload", finalPayload, 1);

    return res.json({
      source: "cricbuzz-relevant-matches",
      ...finalPayload
    });
  } catch (error) {
    if (matchCache.has("fixture_payload")) {
      const stale = matchCache.get("fixture_payload");
      return res.status(200).json({
        source: "stale-cache",
        ...stale,
        warning: "Live score temporarily unavailable. Showing last known score.",
      });
    }

    error.statusCode = 502;
    error.message = "Failed to fetch live scores from Cricbuzz";
    return next(error);
  }
};

const getMatchById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cacheKey = `match_${id}`;
    const cached = matchCache.get(cacheKey);
    if (cached) {
      return res.json({ source: "cache", match: cached });
    }

    if (id === "fake-ipl-match-123") {
      const fakeMatchDetails = {
        id: "fake-ipl-match-123",
        name: "Chennai Super Kings vs Mumbai Indians, 1st Match, Indian Premier League 2026",
        status: "Mumbai Indians need 21 runs in 10 balls",
        teams: ["Chennai Super Kings", "Mumbai Indians"],
        score: [
          { r: 205, w: 5, o: 20, inning: "Chennai Super Kings Inning 1" },
          { r: 185, w: 4, o: 18.2, inning: "Mumbai Indians Inning 1" }
        ],
        teamInfo: [
          { shortname: "CSK", img: "https://via.placeholder.com/50?text=CSK" },
          { shortname: "MI", img: "https://via.placeholder.com/50?text=MI" }
        ]
      };
      return res.json({ source: "fake", match: fakeMatchDetails });
    }

    const { data } = await axios.get(`https://www.cricbuzz.com/live-cricket-scores/${id}`, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });

    const cheerio = require('cheerio');
    const $ = cheerio.load(data);

    let title = $('h1 span.wb\\:block').text().trim() || $('title').text().replace('Cricket commentary | ', '').trim();
    let teams = title.split(',')[0].split(' vs ').map(t => t.trim());
    if (teams.length !== 2) teams = ["Team A", "Team B"];

    let scoreText = '';
    let oversText = '';
    const scoreDiv = $('.font-bold.text-center.text-3xl.flex').first();
    if (scoreDiv.length) {
      const runs = $(scoreDiv).children().eq(0).text().trim();
      const wkts = $(scoreDiv).children().eq(1).text().replace('-', '').trim();
      const overs = $(scoreDiv).children().eq(2).text().replace('(', '').replace(')', '').trim();
      scoreText = `${runs}/${wkts}`;
      oversText = overs;
    }

    const statusText = $('.text-cbTxtLive, .text-cbLive').first().text().trim() || "Status unavailable";

    // Attempt to extract mini scorecard
    const batting = [];
    const bowling = [];

    let isBatting = true;
    $('.scorecard-bat-grid').each((i, el) => {
      const text = $(el).text();
      if (text.includes('Batter')) { isBatting = true; return; }
      if (text.includes('Bowler')) { isBatting = false; return; }
      if (text.includes('Key Stats')) return;

      const children = $(el).children();
      if (children.length >= 6) {
        const name = $(children[0]).text().trim();
        const col1 = $(children[1]).text().trim();
        const col2 = $(children[2]).text().trim();
        const col3 = $(children[3]).text().trim();
        const col4 = $(children[4]).text().trim();
        const col5 = $(children[5]).text().trim();

        if (isBatting) {
          batting.push({
            batsman: { name: name },
            r: col1,
            b: col2,
            '4s': col3,
            '6s': col4,
            sr: col5,
            dismissal: name.includes('*') ? 'not out' : 'batting'
          });
        } else {
          bowling.push({
            bowler: { name: name },
            o: col1,
            m: col2,
            r: col3,
            w: col4,
            eco: col5
          });
        }
      }
    });

    const matchDetails = {
      id: id,
      name: title,
      status: statusText,
      teams: teams,
      score: [
        { r: scoreText.split('/')[0] || 0, w: scoreText.split('/')[1] || 0, o: oversText, inning: "Current Inning" }
      ],
      teamInfo: [
        { shortname: teams[0], img: "https://via.placeholder.com/50?text=" + teams[0].substring(0, 3).toUpperCase() },
        { shortname: teams[1], img: "https://via.placeholder.com/50?text=" + teams[1].substring(0, 3).toUpperCase() }
      ],
      scorecard: [{
        inning: "Live Innings",
        r: scoreText.split('/')[0] || 0,
        w: scoreText.split('/')[1] || 0,
        o: oversText,
        batting: batting,
        bowling: bowling
      }]
    };

    matchCache.set(cacheKey, matchDetails, 1);
    return res.json({ source: "cricbuzz", match: matchDetails });
  } catch (error) {
    if (matchCache.has(`match_${req.params.id}`)) {
      return res.status(200).json({
        source: "stale-cache",
        match: matchCache.get(`match_${req.params.id}`),
        warning: "Details temporarily unavailable. Showing last known state.",
      });
    }
    error.statusCode = 502;
    error.message = "Failed to fetch match details";
    return next(error);
  }
};

module.exports = { getLiveMatches, getMatchById };
