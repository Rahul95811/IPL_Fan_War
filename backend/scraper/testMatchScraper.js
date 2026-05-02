const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('test_match.html', 'utf8');
const $ = cheerio.load(html);

const batting = [];
const bowling = [];

$('.scorecard-bat-grid').each((i, el) => {
    // If it has Batter/Bowler header, skip
    if ($(el).text().includes('Batter') || $(el).text().includes('Bowler') || $(el).text().includes('Key Stats')) return;
    
    // Batsman or Bowler?
    // Let's check how many children it has
    const children = $(el).children();
    if (children.length >= 6) {
        const name = $(children[0]).text().trim();
        const col1 = $(children[1]).text().trim(); // Runs or Overs
        const col2 = $(children[2]).text().trim(); // Balls or Maidens
        const col3 = $(children[3]).text().trim(); // 4s or Runs
        const col4 = $(children[4]).text().trim(); // 6s or Wickets
        const col5 = $(children[5]).text().trim(); // SR or Econ
        
        // Is it batter or bowler? 
        // We can check if it's the second block of grids, but easiest is to see what the previous header was.
        // Or check if 'name' exists in our list.
        // Actually, we can just push all to batting and bowling if we distinguish them.
        
        // Let's see if we can distinguish by the number of columns? Both have 6-7 columns.
        // For bowler, col4 is usually single digit (wickets), for batter col3, col4 are 4s, 6s.
    }
});

console.log('Grid items:', $('.scorecard-bat-grid').length);
