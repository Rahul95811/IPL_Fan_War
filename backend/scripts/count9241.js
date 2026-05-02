const fs = require("fs");
const path = require("path");
const html = fs.readFileSync(path.join(__dirname, "../scraper/fixtures-sample.html"), "utf8");

const needle = '\\"seriesId\\":9241';
let c = 0;
let ix = html.indexOf(needle);
while (ix !== -1) {
  c += 1;
  ix = html.indexOf(needle, ix + 1);
}
console.log("count", c);
