const { searchByAuthor } = require("../server.js");

module.exports = async (req, res) => {
  const { author } = req.query;
  if (!author) {
    res.status(400).json({ error: "Missing author" });
    return;
  }
  const [shi, ci] = await searchByAuthor(author);
  res.json({ count: shi.length + ci.length, data: { shi, ci } });
};
