#!/usr/bin/env node

const { loadMongoModule } = require('./mongodbClientLoader');
const {
  logMongoConnectionDetails,
  isEffectivelyReadOnly,
} = require('./mongodbConnectionInfo');

async function main() {
  const uri = process.argv[2];
  if (!uri) {
    console.error('Missing MongoDB connection URI.');
    process.exit(2);
    return;
  }

  let MongoClient;
  try {
    const mongodb = await loadMongoModule();
    MongoClient = mongodb.MongoClient;
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
    const db = client.db();
    let privilegeInfo = null;
    let privilegeInspectionError = null;

    try {
      privilegeInfo = await isEffectivelyReadOnly(client, db.databaseName);
    } catch (error) {
      privilegeInspectionError = error;
    }

    await logMongoConnectionDetails(client, uri, console, {
      privilegeInfo,
      dbName: db.databaseName,
      skipPrivilegeInspection: true,
      privilegeInspectionError,
    });
    const result = await db.command({ ping: 1 });
    const ok = result && typeof result.ok !== 'undefined' ? Number(result.ok) : 0;
    const payload = {
      ok,
      readOnly:
        privilegeInfo && typeof privilegeInfo.readOnly === 'boolean'
          ? privilegeInfo.readOnly
          : null,
    };

    if (Array.isArray(privilegeInfo?.matches)) {
      payload.privilegeMatches = privilegeInfo.matches;
    }

    if (typeof payload.readOnly === 'boolean') {
      payload.accessLevel = payload.readOnly ? 'read-only' : 'read/write';
    }

    console.log(JSON.stringify(payload));
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
