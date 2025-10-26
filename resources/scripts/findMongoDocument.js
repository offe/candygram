#!/usr/bin/env node

const { loadMongoModule } = require('./mongodbClientLoader');

async function main() {
  const uri = process.argv[2];
  const objectIdValue = process.argv[3];

  if (!uri || !objectIdValue) {
    console.error('Missing MongoDB connection URI or ObjectId.');
    process.exit(2);
    return;
  }

  let MongoClient;
  let ObjectId;

  try {
    const mongodb = await loadMongoModule();
    MongoClient = mongodb.MongoClient;
    ObjectId = mongodb.ObjectId;
  } catch (error) {
    if (
      error &&
      error.__mongodbImport &&
      (error.code === 'MODULE_NOT_FOUND' || error.code === 'ERR_MODULE_NOT_FOUND')
    ) {
      console.error(
        [
          'Missing dependency: the "mongodb" Node.js driver is not installed.',
          'Run "npm install" from the Candygram project root to download dependencies, then try again.',
        ].join(' ')
      );
      process.exit(1);
      return;
    }

    const message = error && error.stack ? error.stack : String(error);
    console.error(message);
    process.exit(1);
    return;
  }

  if (!ObjectId) {
    console.error('MongoDB driver did not expose an ObjectId constructor.');
    process.exit(1);
    return;
  }

  let targetId;
  try {
    targetId = new ObjectId(objectIdValue);
  } catch (parseError) {
    console.error(`Invalid ObjectId string: ${objectIdValue}`);
    process.exit(3);
    return;
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

  try {
    await client.connect();
    const db = client.db();

    const collections = await db
      .listCollections({}, { nameOnly: true })
      .toArray()
      .then((colls) =>
        colls
          .map((coll) => coll.name)
          .filter((name) => typeof name === 'string' && !name.startsWith('system.'))
      );

    if (!collections || collections.length === 0) {
      console.log(JSON.stringify({ status: 'no_collections', matches: [] }));
      process.exit(0);
      return;
    }

    const [firstCollection, ...remainingCollections] = collections;

    const basePipeline = [
      { $match: { _id: targetId } },
      { $addFields: { __collection: firstCollection } },
    ];

    const unionStages = remainingCollections.flatMap((collectionName) => [
      {
        $unionWith: {
          coll: collectionName,
          pipeline: [
            { $match: { _id: targetId } },
            { $addFields: { __collection: collectionName } },
          ],
        },
      },
    ]);

    const cursor = db.collection(firstCollection).aggregate([
      ...basePipeline,
      ...unionStages,
    ]);

    const documents = await cursor.toArray();

    if (!documents || documents.length === 0) {
      console.log(JSON.stringify({ status: 'not_found', matches: [] }));
      process.exit(0);
      return;
    }

    const matches = documents.map((doc) => {
      const { __collection: collection, ...rest } = doc;
      return {
        collection,
        document: rest,
      };
    });

    console.log(
      JSON.stringify({ status: 'found', matches }, (_, value) => {
        if (value instanceof ObjectId) {
          return value.toHexString();
        }
        return value;
      })
    );
    process.exit(0);
  } catch (error) {
    const message = error && error.stack ? error.stack : String(error);
    console.error(message);
    process.exit(1);
  } finally {
    try {
      await client.close();
    } catch (closeError) {
      // Ignore cleanup failure.
    }
  }
}

main();
