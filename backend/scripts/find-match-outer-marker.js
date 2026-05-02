const fs = require("fs");
const path = require("path");
const html = fs.readFileSync(path.join(__dirname, "../scraper/fixtures-sample.html"), "utf8");
const cand = '\\"match\\":{\\"matchInfo\\":{';
const ix = html.indexOf(cand);
console.log(ix);
console.log(JSON.stringify(html.slice(ix, ix + 80)));
