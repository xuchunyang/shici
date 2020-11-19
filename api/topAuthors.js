const { topAuthors } = require("../server.js");

module.exports = async (req, res) => {
  let { limit } = req.query;
  limit = parseInt(limit) || 10;
  const [shi, ci] = await topAuthors(limit);
  const shici = shi.map(({ _id }) => _id).concat(ci.map(({ _id }) => _id));
  const authors = Array.from(new Set(shici));
  res.json({ count: authors.length, data: authors });
};
