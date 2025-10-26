function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
}

function normalizeUsername(username) {
  if (!username) {
    return "";
  }

  return username.trim().toLowerCase();
}

function inferAccessLevelFromUsername(username) {
  const normalized = normalizeUsername(username);

  if (!normalized) {
    return null;
  }

  if (
    normalized.includes("readonly") ||
    normalized.includes("read-only") ||
    /(^|[-_.])ro($|[-_.\d])/i.test(normalized)
  ) {
    return "read-only";
  }

  if (
    normalized.includes("readwrite") ||
    normalized.includes("read-write") ||
    /(^|[-_.])rw($|[-_.\d])/i.test(normalized)
  ) {
    return "read/write";
  }

  if (normalized.includes("admin")) {
    return "admin";
  }

  if (normalized.includes("writer") || normalized.includes("write")) {
    return "write";
  }

  if (normalized.includes("reader") || normalized.includes("read")) {
    return "read";
  }

  return null;
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

    const accessLevel = inferAccessLevelFromUsername(username);

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
      accessLevel,
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
      accessLevel: null,
      error,
      targetLabel: null,
    };
  }
}

function logMongoConnectionDetails(uri, logger = console) {
  const info = describeMongoConnection(uri);
  const messages = [];

  if (info.error) {
    messages.push("Connected to MongoDB but failed to parse the URI for access details.");
    messages.push(`Reason: ${info.error.message || info.error}`);
  } else {
    const target = info.targetLabel || "MongoDB deployment";
    let connectionSummary = `Connected to ${target}`;

    if (info.username) {
      connectionSummary += ` as \"${info.username}\"`;
    } else {
      connectionSummary += " without a username in the URI";
    }

    if (info.accessLevel) {
      connectionSummary += ` (detected access: ${info.accessLevel})`;
    } else if (info.username) {
      connectionSummary += " (access level: unknown)";
    }

    messages.push(connectionSummary + ".");
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
  inferAccessLevelFromUsername,
  logMongoConnectionDetails,
};
