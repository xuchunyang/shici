const { searchByAuthor } = require("../server.js");

module.exports = async (req, res) => {
  const { author } = req.query;
  if (!author) {
    res.status(400).json({ error: "Missing author" });
    return;
  }
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", `max-age=${3600 * 24}, s-maxage=${30 * 24 * 3600}`);
  const [shi, ci] = await searchByAuthor(author);
  res.json({ count: shi.length + ci.length, data: { shi, ci } });
};
