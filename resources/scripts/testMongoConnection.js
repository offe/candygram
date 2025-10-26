#!/usr/bin/env node

const { MongoClient } = require('mongodb');

async function main() {
  const uri = process.argv[2];
  if (!uri) {
    console.error('Missing MongoDB connection URI.');
    process.exit(2);
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
