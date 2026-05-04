const axios = require("axios");
const cheerio = require("cheerio");

let lastScores = {};

const SCRAPE_URL = "https://www.cricbuzz.com/cricket-match/live-scores";
const IPL_FILTER_RE = /(ipl|indian[- ]premier[- ]league)/i;

async function fetchLiveScores() {
  try {
    const urls = [
      'https://www.cricbuzz.com/cricket-match/live-scores',
      'https://www.cricbuzz.com/cricket-match/live-scores/upcoming-matches'
    ];

    const responses = await Promise.all(urls.map(url => 
      axios.get(url, { 
          timeout: 1500,
          headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
          }
      }).catch(err => ({ data: '' })) // ignore individual errors
    ));

    const matches = [];
    const seenIds = new Set();
    
    for (const { data } of responses) {
        if (!data) continue;
        const $ = cheerio.load(data);
        
        $('a[href^="/live-cricket-scores/"]').each((i, el) => {
            const href = $(el).attr('href') || '';
            const titleAttr = ($(el).attr("title") || "").trim();
            const idCandidate = href.split('/')[2] || '';
            const textBlob = `${href} ${titleAttr} ${$(el).text()}`;
            if (!IPL_FILTER_RE.test(textBlob)) return;
      
            const matchId = /^\d+$/.test(idCandidate) ? idCandidate : '';
            
            if (!matchId || seenIds.has(matchId)) return;
            seenIds.add(matchId);
      
            const teamNodes = $(el).find('.hidden.wb\\:block.truncate, .truncate.font-semibold');
            const scoreNodes = $(el).find('.font-medium.wb\\:font-semibold.truncate, .font-medium.truncate');
            
            let team1 = '';
            let team2 = '';
            if (teamNodes.length >= 2) {
                team1 = $(teamNodes[0]).text().trim();
                team2 = $(teamNodes[1]).text().trim();
            }

            let score1 = '';
            if (scoreNodes.length > 0) {
                score1 = $(scoreNodes[0]).text().trim();
            }
            
            let status = $(el).find('.text-cbLive, .text-cbLiveDark, .text-cbTxtLive, .text-cbComplete').first().text().trim();
            if (!status) status = "Upcoming";
      
            let scoreText = score1;
            let oversText = "N/A";
            if (score1.includes('(')) {
              const parts = score1.split('(');
              scoreText = parts[0].trim();
              oversText = parts[1].replace(')', '').trim();
            }
      
            matches.push({
                matchId: matchId,
                score: scoreText || "N/A",
                overs: oversText || "N/A",
                status: status
            });
        });
    }
    return matches;
  } catch (error) {
    console.error("ScoreScraper: Failed to fetch live data.", error.message);
    return [];
  }
}

function startScorePolling(io) {
  setInterval(async () => {
    const newMatches = await fetchLiveScores();
    
    for (const match of newMatches) {
        const lastData = lastScores[match.matchId] || {};
        
        if (
            match.score !== lastData.score ||
            match.overs !== lastData.overs ||
            match.status !== lastData.status
        ) {
            lastScores[match.matchId] = match;
            // Emit to all connected clients
            io.emit("score_update", match);
        }
    }
  }, 2000);
}

module.exports = { startScorePolling };
