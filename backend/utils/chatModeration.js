const sanitizeHtml = require("sanitize-html");

const bannedWords = ["bc", "mc", "idiot", "stupid", "abuse"];

const sanitizeMessage = (message = "") =>
  sanitizeHtml(message, { allowedTags: [], allowedAttributes: {} }).trim();

const hasAbusiveWord = (message = "") => {
  const normalized = message.toLowerCase();
  return bannedWords.some((word) => normalized.includes(word));
};

module.exports = { sanitizeMessage, hasAbusiveWord };
