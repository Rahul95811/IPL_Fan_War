const fs = require("fs");
const path = require("path");
const html = fs.readFileSync(path.join(__dirname, "../scraper/fixtures-sample.html"), "utf8");

const cand = '\\"matchInfo\\":{';
const ix = html.indexOf(cand);
console.log("ix", ix);
console.log(JSON.stringify(html.slice(ix, ix + 120)));
