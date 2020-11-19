const assert = require("assert").strict;
const MongoClient = require("mongodb").MongoClient;

let cacheDb = null;
async function connectToDatabase() {
  if (cacheDb) return cacheDb;

  const uri = process.env.MONGODB_URI || `mongodb://localhost:27017/shici`;
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  await client.connect();
  const db = await client.db(new URL(uri).pathname.slice(1));
  cacheDb = db;

  return db;
}

// 返回诗词作品大于或等于 LIMIT 的作者
async function topAuthors(limit = 10) {
  const db = await connectToDatabase();

  const [shi, ci] = await Promise.all([
    db.collection("shi")
      .aggregate([
        { $group: { _id: "$author", number: { $sum: 1 } } },
        { $sort: { number: -1 } },
        { $match: { number: { $gte: limit } } },
      ])
      .toArray(),
    db.collection("ci")
      .aggregate([
        { $group: { _id: "$author", number: { $sum: 1 } } },
        { $sort: { number: -1 } },
        { $match: { number: { $gte: limit } } },
      ])
      .toArray(),
  ]);
  console.log(shi);
  return [shi, ci];
}

async function searchByAuthor(author) {
  const db = await connectToDatabase();

  return await Promise.all([
    db.collection("shi").find({ author }).project({ title: 1 }).toArray(),
    db.collection("ci").find({ author }).project({ rhythmic: 1 }).toArray(),
  ]);
}

async function random() {
  const db = await connectToDatabase();
  const collection = await db.collection(shiOrCi());
  const cursor = await collection.aggregate([
    { $sample: { size: 1 } },
    { $project: { _id: 0 } },
  ]);
  const arr = await cursor.toArray();
  return arr[0];

  function shiOrCi() {
    // db.collection("shi").count()
    const totalShi = 311860;
    // db.collection("ci").count()
    const totalCi = 21050;
    const total = totalShi + totalCi;
    if (Math.random() * total <= totalCi) return "ci";
    else return "shi";
  }
}

function randomHandler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  random()
    .then((data) => {
      console.log(data);
      res.statusCode = 200;
      res.end(JSON.stringify(data, null, 2));
    })
    .catch((error) => {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: error.message }, null, 2));
    });
}

async function search(author, title) {
  const db = await connectToDatabase();
  let found = await find("shi");
  if (!found) {
    found = await find("ci");
  }
  if (found) {
    // XXX work-around 见下
    delete found._id;
  }
  return found;

  async function find(collectionName) {
    const collection = await db.collection(collectionName);
    const query =
      collectionName === "shi"
        ? { author, title }
        : { author, rhythmic: title };
    return await collection.findOne(
      query,
      // XXX 没效果
      { _id: 0 }
    );
  }
}

function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", `max-age=0, s-maxage=${30 * 24 * 3600}`);

  const url = new URL(
    req.url,
    // this localhost does not matter
    "http://localhost"
  );
  const author = url.searchParams.get("author");
  const title = url.searchParams.get("title");
  if (!(author && title)) {
    myResponse(400, {
      error: `缺少参数：author="${author}", title="${title}"`,
    });
    return;
  }

  search(author, title)
    .then((result) => {
      if (!result) {
        myResponse(400, {
          error: `找不到作者为 "${author}"，标题为 "${title}" 的作品。
请注意：如果搜索的是「诗」，需要用繁体；如果搜索的是「词」，需要用简体。`,
        });
      } else {
        myResponse(200, result);
      }
    })
    .catch((error) => {
      console.log(error);
      myResponse(500, { error });
    });

  function myResponse(code, data) {
    res.statusCode = code;
    res.end(JSON.stringify(data, null, 2));
  }
}

async function realSearchHandler(r, s) {
  s.setHeader("Content-Type", "application/json");
  s.setHeader("Access-Control-Allow-Origin", "*");
  s.setHeader("Cache-Control", `max-age=0, s-maxage=${30 * 24 * 3600}`);

  const { author, title, type } = r.query;
  if (!author || !["shi", "ci"].includes(type)) {
    s.status(400).json({
      error:
        "Invalid argument, search by author/title/type, type is either shi or ci",
    });
    return;
  }
  const collectionName = type;

  const db = await connectToDatabase();
  const collection = db.collection(collectionName);
  let query = { author };
  if (title) {
    if (collectionName === "shi") {
      query.title = title;
    } else {
      query.rhythmic = title;
    }
  }
  console.log(query);
  const projection = { _id: 0 };
  const limit = 10;
  const cursor = await collection.find(query).limit(limit).project(projection);
  const array = await cursor.toArray();
  s.status(200).json({ count: array.length, results: array });
}

// https://stackoverflow.com/questions/4981891/node-js-equivalent-of-pythons-if-name-main
if (require.main === module) require("http").createServer(handler).listen(4000);

module.exports = {
  handler,
  randomHandler,
  realSearchHandler,
  searchByAuthor,
  topAuthors,
};
