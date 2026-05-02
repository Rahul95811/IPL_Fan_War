const fs = require("fs");
const path = require("path");
const html = fs.readFileSync(path.join(__dirname, "../scraper/fixtures-sample.html"), "utf8");

const parent = '\\"match\\":{';
const full = '\\"match\\":{\\"matchInfo\\":{';

for (const [label, m] of [
  ["parent", parent],
  ["full", full],
]) {
  const ix = html.indexOf(m);
  const open = ix + m.length - 1;
  console.log(label, {
    ix,
    open,
    atOpen: JSON.stringify(html[open]),
    nearby: html.slice(ix, ix + 80),
  });
}
