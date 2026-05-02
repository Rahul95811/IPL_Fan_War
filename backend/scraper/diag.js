const fs = require('fs');
const content = fs.readFileSync('c:\\Rahul\\Rahul\\Ongoing\\IPL_Fan_War-main\\IPL_Fan_War-main\\backend\\scraper\\test_match.html', 'utf8');
const lines = content.split('\n');
const line43 = lines[42];

const col = 265760;
console.log('Context at 265760:');
console.log(line43.substring(col - 50, col + 50));
