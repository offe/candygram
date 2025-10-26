#!/usr/bin/env node

async function loadMongoClient() {
  return import('mongodb')
    .then((mongodb) => {
      if (mongodb && mongodb.MongoClient) {
        return mongodb.MongoClient;
      }

      if (mongodb && mongodb.default && mongodb.default.MongoClient) {
        return mongodb.default.MongoClient;
      }

      const exportError = new Error(
        'MongoDB driver is installed but did not expose a MongoClient export.'
      );
      exportError.code = 'MONGODB_DRIVER_EXPORT_MISSING';
      exportError.__mongodbImport = true;
      throw exportError;
    })
    .catch((error) => {
      if (error) {
        error.__mongodbImport = true;
      }
      throw error;
    });
}

async function main() {
  const uri = process.argv[2];
  if (!uri) {
    console.error('Missing MongoDB connection URI.');
    process.exit(2);
    return;
  }

  let MongoClient;
  try {
    MongoClient = await loadMongoClient();
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

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
  });

  try {
    await client.connect();
    const result = await client.db().command({ ping: 1 });
    const ok = result && typeof result.ok !== 'undefined' ? Number(result.ok) : 0;
    console.log(JSON.stringify({ ok }));
    process.exit(ok === 1 ? 0 : 1);
  } catch (error) {
    const message = error && error.stack ? error.stack : String(error);
    console.error(message);
    process.exit(1);
  } finally {
    try {
      await client.close();
    } catch (closeError) {
      // Ignore close errors because we are exiting immediately after this.
    }
  }
}

main();
