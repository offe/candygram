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

    const collectionInfos = await db
      .listCollections({}, { nameOnly: false })
      .toArray()
      .then((colls) =>
        colls.filter((coll) =>
          coll &&
          typeof coll.name === 'string' &&
          !coll.name.startsWith('system.') &&
          (coll.type === undefined || coll.type === 'collection')
        )
      );

    const collections = collectionInfos.map((coll) => coll.name);

    if (!collections || collections.length === 0) {
      console.log(JSON.stringify({ status: 'no_collections', matches: [] }));
      process.exit(0);
      return;
    }

    const matches = [];

    for (const collectionName of collections) {
      try {
        const document = await db.collection(collectionName).findOne({ _id: targetId });
        if (document) {
          matches.push({
            collection: collectionName,
            document,
          });
        }
      } catch (collectionError) {
        const message = collectionError && collectionError.stack
          ? collectionError.stack
          : String(collectionError);
        console.error(
          `Failed to query collection "${collectionName}": ${message}`
        );
      }
    }

    if (matches.length === 0) {
      console.log(JSON.stringify({ status: 'not_found', matches: [] }));
      process.exit(0);
      return;
    }

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
