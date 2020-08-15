const MongoClient = require("mongodb").MongoClient;

async function search(author, title) {
  const uri = process.env.MONGODB_URI || `mongodb://localhost:27017/shici`;
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  await client.connect();
  const db = await client.db(new URL(uri).pathname.slice(1));

  let found = await find("shi");
  if (!found) {
    found = await find("ci");
  }
  if (found) {
    // XXX work-around 见下
    delete found._id
  }
  return found;

  async function find(collectionName) {
    const collection = await db.collection(collectionName);
    return await collection.findOne({ author, title },
                                    // XXX 没效果
                                    { _id: 0});
  }
}

require("http")
  .createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const url = new URL(req.url, "http://localhost");
    if (url.pathname !== "/") {
      myResponse(404, {error: "Wrong endpoint"});
      return;
    }
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
  })
  .listen(4000);
