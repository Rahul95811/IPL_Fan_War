const axios = require('axios');
const cheerio = require('cheerio');

axios.get('https://www.cricbuzz.com/cricket-match/live-scores/upcoming-matches', {headers:{'User-Agent': 'Mozilla/5.0'}})
.then(res => {
  const $ = cheerio.load(res.data);
  const matches = [];
  $('a[href^="/live-cricket-scores/"].bg-cbWhite').each((i, el) => {
    matches.push($(el).attr('href'));
  });
  console.log(matches.slice(0, 10));
});
