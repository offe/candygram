#!/usr/bin/env node

const { loadMongoModule } = require('./mongodbClientLoader');

function resolveEjson(mongodbModule) {
  if (mongodbModule && mongodbModule.EJSON) {
    return mongodbModule.EJSON;
  }

  try {
    // eslint-disable-next-line global-require
    const bson = require('bson');
    if (bson && bson.EJSON) {
      return bson.EJSON;
    }
  } catch (error) {
    // Ignore failures – fallback to JSON.parse.
  }

  return null;
}

function parseJsonInput(raw, { expectArray = false, ejson } = {}) {
  const parser = ejson && typeof ejson.parse === 'function' ? ejson.parse : JSON.parse;
  let parsed;

  try {
    parsed = parser(raw);
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    throw new Error(`Invalid JSON input: ${message}`);
  }

  if (expectArray && !Array.isArray(parsed)) {
    throw new Error('JSON input must describe an array.');
  }

  return parsed;
}

function parseLimit(raw) {
  if (raw === undefined || raw === null || raw === '') {
    return 20;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('Result limit must be a positive integer.');
  }

  return parsed;
}

async function main() {
  const [uri, collectionName, pipelineJson, limitValue] = process.argv.slice(2);

  if (!uri || !collectionName || !pipelineJson) {
    console.error('Missing MongoDB connection URI, collection name, or pipeline JSON.');
    process.exit(2);
    return;
  }

  let mongodbModule;
  try {
    mongodbModule = await loadMongoModule();
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

  const { MongoClient, ObjectId } = mongodbModule;

  if (!MongoClient) {
    console.error('MongoDB driver did not expose a MongoClient constructor.');
    process.exit(1);
    return;
  }

  const ejson = resolveEjson(mongodbModule);

  let pipeline;
  try {
    pipeline = parseJsonInput(pipelineJson, { expectArray: true, ejson });
  } catch (error) {
    console.error(error.message || 'Failed to parse pipeline JSON.');
    process.exit(3);
    return;
  }

  let limit;
  try {
    limit = parseLimit(limitValue);
  } catch (error) {
    console.error(error.message || 'Invalid result limit.');
    process.exit(4);
    return;
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

  try {
    await client.connect();
    const db = client.db();
    const effectivePipeline = Array.isArray(pipeline) ? [...pipeline] : [];
    if (limit) {
      effectivePipeline.push({ $limit: limit });
    }

    const cursor = db.collection(collectionName).aggregate(effectivePipeline, {
      allowDiskUse: true,
    });
    const documents = await cursor.toArray();

    const replacer = (_, value) => {
      if (ObjectId && value instanceof ObjectId) {
        return value.toHexString();
      }
      return value;
    };

    console.log(
      JSON.stringify(
        {
          status: 'ok',
          results: documents,
        },
        replacer,
      ),
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
      // Ignore cleanup failures.
    }
  }
}

main();
