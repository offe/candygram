async function loadMongoModule() {
  return import('mongodb')
    .then((mongodb) => {
      const candidateModule =
        mongodb && mongodb.MongoClient
          ? mongodb
          : mongodb && mongodb.default && mongodb.default.MongoClient
          ? mongodb.default
          : null;

      if (!candidateModule || !candidateModule.MongoClient) {
        const exportError = new Error(
          'MongoDB driver is installed but did not expose a MongoClient export.'
        );
        exportError.code = 'MONGODB_DRIVER_EXPORT_MISSING';
        exportError.__mongodbImport = true;
        throw exportError;
      }

      const ObjectId =
        candidateModule.ObjectId ||
        (candidateModule.BSON && candidateModule.BSON.ObjectId) ||
        null;

      return {
        MongoClient: candidateModule.MongoClient,
        ObjectId,
      };
    })
    .catch((error) => {
      if (error) {
        error.__mongodbImport = true;
      }
      throw error;
    });
}

module.exports = {
  loadMongoModule,
};
