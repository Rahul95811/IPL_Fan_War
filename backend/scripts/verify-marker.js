const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "../scraper/fixtures-sample.html"), "utf8");

const embed = '\\"matchesList\\":{\\"matches\\":[';
console.log("embed ix", html.indexOf(embed));

const j = html.indexOf("responseLastUpdated");
console.log("first responseLastUpdated", j);
console.log(JSON.stringify(html.slice(j - 30, j + 80)));
