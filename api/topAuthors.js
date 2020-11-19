const { topAuthors } = require("../server.js");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", `max-age=${3600 * 24}, s-maxage=${30 * 24 * 3600}`);

  let { limit } = req.query;
  limit = parseInt(limit) || 10;
  const [shi, ci] = await topAuthors(limit);
  let authors = {};
  shi.forEach(({ _id: author, number }) => {
    authors[author] = number;
  });
  ci.forEach(({ _id: author, number }) => {
    if (author in authors) authors[author] += number;
    else authors[author] = number;
  });
  const data = Object.entries(authors)
    .map(([author, number]) => {
      return { author, number };
    })
    .sort(({ number: n1 }, { number: n2 }) => n2 - n1);
  res.json({ count: data.length, data });
};
