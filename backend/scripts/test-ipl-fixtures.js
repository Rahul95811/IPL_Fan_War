const fs = require("fs");
const path = require("path");
const { buildFixturePayloadFromHtml } = require("../utils/iplFixturesEmbed");

const html = fs.readFileSync(path.join(__dirname, "../scraper/fixtures-sample.html"), "utf8");
const out = buildFixturePayloadFromHtml(html);
console.log(JSON.stringify(out, null, 2));
