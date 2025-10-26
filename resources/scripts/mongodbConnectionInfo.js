function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
}

function describeMongoConnection(uri) {
  if (typeof uri !== "string" || !uri.trim()) {
    return {
      uri,
      username: null,
      host: null,
      database: null,
      protocol: null,
      accessLevel: null,
      error: new Error("MongoDB URI is missing or empty."),
      targetLabel: null,
    };
  }

  try {
    const parsed = new URL(uri);
    const protocol = parsed.protocol ? parsed.protocol.replace(/:$/, "") : "mongodb";
    const username = parsed.username ? safeDecode(parsed.username) : null;
    const host = parsed.host || null;
    const database = parsed.pathname && parsed.pathname !== "/"
      ? parsed.pathname.replace(/^\//, "")
      : null;

    const targetLabelParts = [];
    const protoLabel = protocol || "mongodb";
    const hostLabel = host || "(unknown host)";
    targetLabelParts.push(`${protoLabel}://${hostLabel}`);

    if (database) {
      targetLabelParts[targetLabelParts.length - 1] += `/${database}`;
    }

    const targetLabel = targetLabelParts.join(" ");

    return {
      uri,
      username,
      host,
      database,
      protocol,
      accessLevel: null,
      error: null,
      targetLabel,
    };
  } catch (error) {
    return {
      uri,
      username: null,
      host: null,
      database: null,
      protocol: null,
      error,
      targetLabel: null,
    };
  }
}

const WRITE_ACTIONS = new Set([
  "insert",
  "update",
  "remove",
  "findAndModify",
  "createCollection",
  "createIndex",
  "collMod",
  "dropCollection",
  "dropDatabase",
  "renameCollection",
]);

async function isEffectivelyReadOnly(client, dbName, collName) {
  if (!client || typeof client.db !== "function") {
    throw new Error("A connected MongoClient instance is required to inspect privileges.");
  }

  const admin = client.db("admin");
  const { authInfo } = await admin.command({
    connectionStatus: 1,
    showPrivileges: true,
  });

  const privs = authInfo?.authenticatedUserPrivileges ?? [];

  const matches = privs.filter((p) => {
    if (!p?.actions?.some((action) => WRITE_ACTIONS.has(action))) {
      return false;
    }

    const resource = p.resource || {};
    if (resource.anyResource === true) {
      return true;
    }

    if (resource.cluster === true) {
      return true;
    }

    if (!resource.db) {
      return false;
    }

    if (!dbName) {
      return true;
    }

    if (!resource.collection && resource.db === dbName) {
      return true;
    }

    if (resource.collection && resource.db === dbName) {
      if (!collName) {
        return true;
      }

      return resource.collection === collName || resource.collection === "";
    }

    return false;
  });

  return { readOnly: matches.length === 0, matches };
}

async function logMongoConnectionDetails(client, uri, logger = console, options = {}) {
  const info = describeMongoConnection(uri);
  const messages = [];

  if (info.error) {
    messages.push(
      "Connected to MongoDB but failed to parse the URI for access details.",
    );
    messages.push(`Reason: ${info.error.message || info.error}`);
  } else {
    const target = info.targetLabel || "MongoDB deployment";
    let connectionSummary = `Connected to ${target}`;

    if (info.username) {
      connectionSummary += ` as \"${info.username}\"`;
    } else {
      connectionSummary += " without a username in the URI";
    }

    let privilegeSummary = null;
    const privilegeInfoFromOptions =
      options && typeof options.privilegeInfo === "object"
        ? options.privilegeInfo
        : null;
    const skipPrivilegeInspection = Boolean(options?.skipPrivilegeInspection);
    const privilegeInspectionErrorMessage = options?.privilegeInspectionError
      ? options.privilegeInspectionError.message
        ? options.privilegeInspectionError.message
        : String(options.privilegeInspectionError)
      : null;
    let privilegeInfo = privilegeInfoFromOptions;

    if (!privilegeInfo) {
      if (skipPrivilegeInspection) {
        if (privilegeInspectionErrorMessage) {
          messages.push(
            `Failed to inspect MongoDB privileges: ${privilegeInspectionErrorMessage}`,
          );
        }
      } else if (client && typeof client.db === "function") {
        try {
          const derivedDb =
            options.dbName ||
            info.database ||
            (client.db && typeof client.db === "function"
              ? client.db().databaseName
              : undefined);

          privilegeInfo = await isEffectivelyReadOnly(
            client,
            derivedDb,
            options.collectionName,
          );
        } catch (error) {
          messages.push(
            `Failed to inspect MongoDB privileges: ${
              (error && error.message) || error
            }`,
          );
        }
      } else {
        messages.push(
          "Unable to inspect MongoDB privileges because a connected client was not provided.",
        );
      }
    }

    if (privilegeInfo && typeof privilegeInfo.readOnly === "boolean") {
      privilegeSummary = privilegeInfo.readOnly ? "read-only" : "read/write";
      info.accessLevel = privilegeSummary;
      info.readOnly = privilegeInfo.readOnly;
      if (Array.isArray(privilegeInfo.matches)) {
        info.privilegeMatches = privilegeInfo.matches;
      }
    }

    if (privilegeSummary) {
      connectionSummary += ` (access: ${privilegeSummary})`;
    }

    messages.push(`${connectionSummary}.`);
  }

  const finalMessage = `[mongodb-connection] ${messages.join(" ")}`;

  if (logger && typeof logger.error === "function") {
    logger.error(finalMessage);
  } else if (logger && typeof logger.log === "function") {
    logger.log(finalMessage);
  }

  return info;
}

module.exports = {
  describeMongoConnection,
  isEffectivelyReadOnly,
  logMongoConnectionDetails,
  WRITE_ACTIONS,
};
