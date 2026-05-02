const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('cricbuzz_html.html', 'utf8');
const $ = cheerio.load(html);

const matches = [];

$('a[href^="/live-cricket-scores/"].bg-cbWhite').each((i, el) => {
  const href = $(el).attr('href');
  
  const titleAttr = $(el).attr('title') || '';
  const matchIdMatch = href.split('/');
  let matchId = '';
  if (matchIdMatch.length > 2) {
    matchId = matchIdMatch[2]; // e.g., '151891'
  }
  
  if (!matchId || matches.find(m => m.matchId === matchId)) return;

  const teamNodes = $(el).find('span.hidden.wb\\:block.truncate');
  const scoreNodes = $(el).find('.font-medium.wb\\:font-semibold.truncate');

  const team1 = $(teamNodes[0]).text().trim();
  const team2 = $(teamNodes[1]).text().trim();

  let score1 = $(scoreNodes[0]).text().trim();
  let score2 = $(scoreNodes[1]).text().trim();
  
  let status = $(el).find('.text-cbLive, .text-cbLiveDark').text().trim();
  if (!status) {
      status = "Upcoming/Preview";
  }

  let scoreText = score1;
  let oversText = "0.0";
  if (score1.includes('(')) {
    const parts = score1.split('(');
    scoreText = parts[0].trim();
    oversText = parts[1].replace(')', '').trim();
  }

  // Parse title: "Delhi Capitals vs Punjab Kings, 35th Match - Live " -> "Delhi Capitals vs Punjab Kings, 35th Match"
  let matchTitle = titleAttr.split('-')[0].trim() || team1 + " vs " + team2;

  matches.push({
    matchId: matchId,
    title: matchTitle,
    score: scoreText || "N/A",
    overs: oversText || "N/A",
    status: status,
    teamA: team1 || "Team A",
    teamB: team2 || "Team B",
  });
});

console.log(JSON.stringify(matches.slice(0, 5), null, 2));
