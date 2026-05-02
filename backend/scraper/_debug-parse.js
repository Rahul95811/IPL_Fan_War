const fs = require("fs");
const path = require("path");

const h = fs.readFileSync(path.join(__dirname, "fixtures-sample.html"), "utf8");
const patterns = [
  '"matchesList":{"matches":[{"match"',
  '\\"matchesList\\":{\\"matches\\":[{\\"match\\":',
  '\\\\"matchesList\\\\":{\\\\"matches\\\\":[{\\\\"match\\\\":',
];
patterns.forEach((p) => console.log(p.slice(0, 40), h.indexOf(p)));
