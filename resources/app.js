// app.js

// Clipboard monitoring
const CLIPBOARD_MONITORING_ENABLED = true;
const isMacPlatform = typeof NL_OS !== "undefined" && NL_OS === "Darwin";
const unsupportedInputTypes = new Set([
  "button",
  "submit",
  "reset",
  "radio",
  "checkbox",
  "file",
  "color",
  "image",
  "range",
  "date",
  "datetime-local",
  "month",
  "time",
  "week",
  "hidden",
]);

const MENU_EVENT_NAME = "candygram:menu-action";
const MENU_ACTION_MAP = {
  "menu:candygram:quit": "quit",
  "menu:edit:cut": "cut",
  "menu:edit:copy": "copy",
  "menu:edit:paste": "paste",
  "menu:edit:selectAll": "selectAll",
};

const CLIPBOARD_STATUS_ELEMENT_ID = "clipboard-status";
const CLIPBOARD_OUTPUT_ELEMENT_ID = "clipboard-output";
const CLIPBOARD_STATUS_TONES = {
  info: "text-gray-600",
  success: "text-green-600",
  error: "text-red-600",
  warning: "text-yellow-600",
};

const SIDEBAR_TRANSITION_DURATION_MS = 300;

// React icon loading utilities
const REACT_ICON_SOURCES = {
  react: "https://esm.sh/react@18.2.0",
  reactDomServer: "https://esm.sh/react-dom@18.2.0/server?deps=react@18.2.0",
  reactIconsFa: "https://esm.sh/react-icons@4.12.0/fa?deps=react@18.2.0",
};

const ReactIconLoader = (() => {
  let loadPromise = null;

  async function loadModules() {
    if (!loadPromise) {
      loadPromise = Promise.all([
        import(REACT_ICON_SOURCES.react),
        import(REACT_ICON_SOURCES.reactDomServer),
        import(REACT_ICON_SOURCES.reactIconsFa),
      ])
        .then(([reactModule, reactDomServerModule, iconModule]) => {
          const ReactExport = reactModule.default || reactModule;
          if (!ReactExport || typeof ReactExport.createElement !== "function") {
            throw new Error("React.createElement is unavailable.");
          }

          const renderToStaticMarkup =
            reactDomServerModule.renderToStaticMarkup ||
            (reactDomServerModule.default
              ? reactDomServerModule.default.renderToStaticMarkup
              : null);

          if (typeof renderToStaticMarkup !== "function") {
            throw new Error(
              "ReactDOMServer.renderToStaticMarkup is unavailable.",
            );
          }

          return {
            React: ReactExport,
            renderToStaticMarkup,
            icons: iconModule,
          };
        })
        .catch((error) => {
          console.error("Failed to load react-icons bundle:", error);
          loadPromise = null;
          throw error;
        });
    }

    return loadPromise;
  }

  return {
    async renderIcon(targetElement, iconName, { className, title } = {}) {
      if (!targetElement) {
        return;
      }

      try {
        const { React, renderToStaticMarkup, icons } = await loadModules();
        const IconComponent = icons[iconName];

        if (typeof IconComponent !== "function") {
          console.warn(`Icon "${iconName}" could not be found in react-icons/fa.`);
          return;
        }

        const props = {
          focusable: "false",
          "aria-hidden": "true",
        };

        if (className) {
          props.className = className;
        }

        if (title) {
          props.title = title;
        }

        const markup = renderToStaticMarkup(
          React.createElement(IconComponent, props),
        );

        targetElement.innerHTML = markup;
      } catch (error) {
        console.error(`Failed to render icon "${iconName}":`, error);
      }
    },
  };
})();

const ICON_BUTTON_BASE_CLASSES =
  "inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1";

function createIconButton({
  iconName,
  ariaLabel,
  buttonClass = "",
  iconClass = "w-4 h-4",
  title,
  fallbackContent = "",
}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `${ICON_BUTTON_BASE_CLASSES} ${buttonClass}`.trim();

  if (ariaLabel) {
    button.setAttribute("aria-label", ariaLabel);
  }

  if (title || ariaLabel) {
    button.title = title || ariaLabel;
  }

  const srOnly = document.createElement("span");
  srOnly.className = "sr-only";
  srOnly.textContent = ariaLabel || title || "";
  button.appendChild(srOnly);

  const iconContainer = document.createElement("span");
  iconContainer.className = "flex items-center justify-center";
  iconContainer.setAttribute("aria-hidden", "true");
  if (fallbackContent) {
    iconContainer.textContent = fallbackContent;
  }
  button.appendChild(iconContainer);

  ReactIconLoader.renderIcon(iconContainer, iconName, {
    className: iconClass,
    title: title || ariaLabel,
  });

  return button;
}

function isEditableElement(element) {
  if (!element || element.readOnly || element.disabled) {
    return false;
  }

  if (element.tagName === "INPUT") {
    return !unsupportedInputTypes.has(element.type);
  }

  return (
    element.tagName === "TEXTAREA" ||
    element.isContentEditable === true ||
    element.contentEditable === "true" ||
    element.contentEditable === "plaintext-only" ||
    element.getAttribute("contenteditable") === ""
  );
}

async function handleClipboardWrite(text) {
  try {
    await Neutralino.clipboard.writeText(text);
  } catch (clipboardError) {
    console.error("Failed to write clipboard contents:", clipboardError);
  }
}

async function handleClipboardRead() {
  try {
    return await Neutralino.clipboard.readText();
  } catch (clipboardError) {
    console.error("Failed to read clipboard contents:", clipboardError);
    return "";
  }
}

function dispatchInputEvent(element) {
  if (!element) {
    return;
  }
  const event = new Event("input", { bubbles: true });
  element.dispatchEvent(event);
}

function handleSelectAll(event, activeElement) {
  if (isEditableElement(activeElement)) {
    activeElement.select();
    event.preventDefault();
    return true;
  }

  const selection = window.getSelection();
  if (!selection) {
    return false;
  }

  const range = document.createRange();
  range.selectNodeContents(document.body);
  selection.removeAllRanges();
  selection.addRange(range);
  event.preventDefault();
  return true;
}

async function handleCopyOrCut(event, activeElement, intent) {
  const selection = window.getSelection();
  let selectedText = "";

  if (isEditableElement(activeElement)) {
    const { selectionStart, selectionEnd, value } = activeElement;
    if (
      typeof selectionStart === "number" &&
      typeof selectionEnd === "number" &&
      selectionStart !== selectionEnd
    ) {
      selectedText = value.slice(selectionStart, selectionEnd);
    }
  }

  if (!selectedText && selection) {
    selectedText = selection.toString();
  }

  if (!selectedText) {
    return false;
  }

  event.preventDefault();
  await handleClipboardWrite(selectedText);

  if (
    intent === "cut" &&
    isEditableElement(activeElement) &&
    typeof activeElement.selectionStart === "number" &&
    typeof activeElement.selectionEnd === "number"
  ) {
    const start = activeElement.selectionStart;
    const end = activeElement.selectionEnd;
    const value = activeElement.value;
    activeElement.value = `${value.slice(0, start)}${value.slice(end)}`;
    activeElement.setSelectionRange(start, start);
    dispatchInputEvent(activeElement);
  }

  return true;
}

async function handlePaste(event, activeElement) {
  if (!isEditableElement(activeElement)) {
    return false;
  }

  event.preventDefault();
  const pasteText = await handleClipboardRead();

  if (typeof pasteText !== "string") {
    return false;
  }

  const { selectionStart, selectionEnd, value } = activeElement;
  if (typeof selectionStart !== "number" || typeof selectionEnd !== "number") {
    return false;
  }

  const insertionPoint = selectionStart + pasteText.length;
  activeElement.value = `${value.slice(0, selectionStart)}${pasteText}${value.slice(
    selectionEnd
  )}`;
  activeElement.setSelectionRange(insertionPoint, insertionPoint);
  dispatchInputEvent(activeElement);
  return true;
}

function performEditingCommand(command, event) {
  const fallbackEvent = { preventDefault() {} };
  const normalizedEvent = event != null ? event : fallbackEvent;

  if (typeof normalizedEvent.preventDefault !== "function") {
    normalizedEvent.preventDefault = fallbackEvent.preventDefault;
  }

  const activeElement = document.activeElement;

  switch (command) {
    case "quit":
      normalizedEvent.preventDefault();
      Neutralino.app.exit();
      return Promise.resolve(true);
    case "selectAll":
      return Promise.resolve(handleSelectAll(normalizedEvent, activeElement));
    case "copy":
      return handleCopyOrCut(normalizedEvent, activeElement, "copy");
    case "cut":
      return handleCopyOrCut(normalizedEvent, activeElement, "cut");
    case "paste":
      return handlePaste(normalizedEvent, activeElement);
    default:
      return Promise.resolve(false);
  }
}

function registerEditingShortcuts() {
  document.addEventListener("keydown", (event) => {
    const modifierActive = isMacPlatform ? event.metaKey : event.ctrlKey;
    if (!modifierActive) {
      return;
    }

    const key = event.key.toLowerCase();
    if (key === "q" && (isMacPlatform || event.ctrlKey)) {
      performEditingCommand("quit", event).catch((err) => {
        console.error("Quit shortcut failed:", err);
      });
      return;
    }

    if (key === "a") {
      performEditingCommand("selectAll", event).catch((err) => {
        console.error("Select All shortcut failed:", err);
      });
      return;
    }

    if (key === "c") {
      performEditingCommand("copy", event).catch((err) => {
        console.error("Copy shortcut failed:", err);
      });
      return;
    }

    if (key === "x") {
      performEditingCommand("cut", event).catch((err) => {
        console.error("Cut shortcut failed:", err);
      });
      return;
    }

    if (key === "v") {
      performEditingCommand("paste", event).catch((err) => {
        console.error("Paste shortcut failed:", err);
      });
      return;
    }
  });
}
let lastClipboardContent = "";
let clipboardLookupSequence = 0;
let lastActiveConnectionId = null;

function getClipboardStatusElement() {
  return document.getElementById(CLIPBOARD_STATUS_ELEMENT_ID);
}

function getClipboardOutputElement() {
  return document.getElementById(CLIPBOARD_OUTPUT_ELEMENT_ID);
}

function updateClipboardMessage(message, tone = "info") {
  const element = getClipboardStatusElement();
  if (!element) {
    return;
  }

  const toneClass = CLIPBOARD_STATUS_TONES[tone] || CLIPBOARD_STATUS_TONES.info;
  element.textContent = message;
  element.className = `text-sm ${toneClass}`;
}

function clearClipboardOutput() {
  const outputElement = getClipboardOutputElement();
  if (!outputElement) {
    return;
  }

  outputElement.innerHTML = "";
  outputElement.classList.add("hidden");
}

function renderClipboardIdleState() {
  updateClipboardMessage(
    "Copy a MongoDB ObjectId to search the active connection.",
    "info"
  );
  clearClipboardOutput();
}

function renderClipboardLoading(objectId) {
  const outputElement = getClipboardOutputElement();
  if (!outputElement) {
    return;
  }

  outputElement.innerHTML = "";
  const loadingMessage = document.createElement("div");
  loadingMessage.className = "text-xs text-gray-500";
  loadingMessage.textContent = `Running ObjectId lookup for ObjectId(${objectId})...`;
  outputElement.appendChild(loadingMessage);
  outputElement.classList.remove("hidden");
}

function renderClipboardMatches(matches) {
  const outputElement = getClipboardOutputElement();
  if (!outputElement) {
    return;
  }

  outputElement.innerHTML = "";

  matches.forEach((match) => {
    const wrapper = document.createElement("div");
    wrapper.className = "border border-gray-200 rounded-md p-3";

    const heading = document.createElement("div");
    heading.className = "text-sm font-semibold text-gray-700";
    const collectionName = match && match.collection ? String(match.collection) : "unknown collection";
    heading.textContent = `Found in ${collectionName}`;

    const jsonBlock = document.createElement("pre");
    jsonBlock.className =
      "mt-2 text-xs bg-gray-50 rounded-md p-2 overflow-x-auto whitespace-pre-wrap font-mono text-gray-800";
    const documentForDisplay = match && match.document ? match.document : {};
    jsonBlock.textContent = JSON.stringify(documentForDisplay, null, 2);

    wrapper.appendChild(heading);
    wrapper.appendChild(jsonBlock);
    outputElement.appendChild(wrapper);
  });

  outputElement.classList.remove("hidden");
}

function getFirstClipboardLine(text) {
  if (!text) {
    return "";
  }

  const normalized = String(text).replace(/\r\n/g, "\n");
  const [firstLine] = normalized.split("\n");
  const trimmed = (firstLine || "").trim();

  if (trimmed.length > 120) {
    return `${trimmed.slice(0, 117)}…`;
  }

  return trimmed;
}

function extractObjectIdFromClipboard(text) {
  if (!text) {
    return null;
  }

  const plain = text.trim();
  const objectIdPattern = /^[0-9a-fA-F]{24}$/;

  if (objectIdPattern.test(plain)) {
    return plain;
  }

  const objectIdCallMatch = plain.match(/ObjectId\((['"])([0-9a-fA-F]{24})\1\)/i);
  if (objectIdCallMatch && objectIdCallMatch[2]) {
    return objectIdCallMatch[2];
  }

  const oidPropertyMatch = plain.match(/"?\$oid"?\s*:\s*['"]([0-9a-fA-F]{24})['"]/);
  if (oidPropertyMatch && oidPropertyMatch[1]) {
    return oidPropertyMatch[1];
  }

  return null;
}

async function lookupObjectIdInConnection(connection, objectId) {
  if (!connection || !connection.uri) {
    return {
      status: "error",
      message: "Active connection is missing a MongoDB URI.",
    };
  }

  if (
    !Neutralino ||
    !Neutralino.os ||
    typeof Neutralino.os.execCommand !== "function"
  ) {
    return {
      status: "error",
      message: "Neutralino OS command execution is unavailable.",
    };
  }

  const escapedUri = escapeShellDoubleQuotes(connection.uri);
  const escapedObjectId = escapeShellDoubleQuotes(objectId);
  const command =
    `node resources/scripts/findMongoDocument.js "${escapedUri}" "${escapedObjectId}"`;

  try {
    const result = await Neutralino.os.execCommand(command);
    const exitCode = result && typeof result.exitCode !== "undefined"
      ? Number(result.exitCode)
      : null;
    const stdOut = result && result.stdOut ? String(result.stdOut).trim() : "";
    const stdErr = result && result.stdErr ? String(result.stdErr).trim() : "";

    if (exitCode === 0) {
      if (stdOut) {
        const lines = stdOut.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed && parsed.status) {
              return {
                status: parsed.status,
                matches: Array.isArray(parsed.matches) ? parsed.matches : [],
              };
            }
          } catch (jsonError) {
            // Ignore invalid JSON lines
          }
        }
      }

      return {
        status: "error",
        message: "Lookup script returned an unexpected response.",
        details: stdOut,
      };
    }

    if (stdErr.includes("Missing dependency")) {
      return {
        status: "dependency_missing",
        message: stdErr,
      };
    }

    if (stdErr.includes("Invalid ObjectId")) {
      return {
        status: "invalid",
        message: stdErr,
      };
    }

    return {
      status: "error",
      message: stdErr || "Lookup script failed.",
      exitCode,
    };
  } catch (error) {
    return {
      status: "error",
      message: (error && error.message) || "ObjectId lookup execution failed.",
      error,
    };
  }
}

async function processClipboardContent(clipboardText) {
  const trimmed = typeof clipboardText === "string" ? clipboardText.trim() : "";

  if (!trimmed) {
    renderClipboardIdleState();
    return;
  }

  const objectId = extractObjectIdFromClipboard(trimmed);
  if (!objectId) {
    const preview = getFirstClipboardLine(clipboardText);
    updateClipboardMessage(
      `Clipboard is not a valid ObjectId. First line: ${preview || "(empty)"}`,
      "error"
    );
    clearClipboardOutput();
    return;
  }

  const state = store.getState();
  const activeConnection = Array.isArray(state.connections)
    ? state.connections.find((conn) => conn.id === state.activeConnectionId)
    : null;

  if (!activeConnection) {
    updateClipboardMessage(
      `Ready to search for ObjectId(${objectId}). Select an active connection first.`,
      "warning"
    );
    clearClipboardOutput();
    return;
  }

  const lookupToken = ++clipboardLookupSequence;
  updateClipboardMessage(`Searching for ObjectId(${objectId})...`, "info");
  renderClipboardLoading(objectId);

  try {
    const lookupResult = await lookupObjectIdInConnection(activeConnection, objectId);

    if (lookupToken !== clipboardLookupSequence) {
      return;
    }

    if (lookupResult.status === "found") {
      updateClipboardMessage(
        `Found ${lookupResult.matches.length} document(s) matching ObjectId(${objectId}).`,
        "success"
      );
      renderClipboardMatches(lookupResult.matches);
      return;
    }

    if (
      lookupResult.status === "not_found" ||
      lookupResult.status === "no_collections"
    ) {
      updateClipboardMessage(`ObjectId(${objectId}) Object not found.`, "error");
      clearClipboardOutput();
      return;
    }

    if (lookupResult.status === "dependency_missing") {
      updateClipboardMessage(lookupResult.message, "error");
      clearClipboardOutput();
      return;
    }

    if (lookupResult.status === "invalid") {
      updateClipboardMessage(lookupResult.message, "error");
      clearClipboardOutput();
      return;
    }

    updateClipboardMessage(
      lookupResult.message || "Failed to search for the clipboard ObjectId.",
      "error"
    );
    clearClipboardOutput();
  } catch (error) {
    if (lookupToken !== clipboardLookupSequence) {
      return;
    }

    updateClipboardMessage(
      (error && error.message) || "Unexpected error while processing clipboard content.",
      "error"
    );
    clearClipboardOutput();
  }
}

// Function to monitor clipboard content
async function getClipboardContent() {
  if (!CLIPBOARD_MONITORING_ENABLED) {
    return;
  }

  if (isEditableElement(document.activeElement)) {
    return;
  }
  try {
    const clipboardText = await Neutralino.clipboard.readText();
    if (clipboardText !== lastClipboardContent) {
      lastClipboardContent = clipboardText;
      await processClipboardContent(clipboardText);
    }
  } catch (err) {
    console.error("Failed to read clipboard contents: ", err);
  }
}

// Initialize the store with Unistore
const initialState = {
  connections: [], // Array of MongoDB connections
  currentForm: null, // State for tracking the current form (edit or add)
  activeConnectionId: null,
};

// Create the store
const store = unistore(initialState);

// Runtime persistence helpers
const CONFIG_FOLDER_NAME = "candygram";
const CONFIG_FILE_NAME = "connections.json";
const packagedConnectionsFilePath = "./resources/config/connections.json";
let connectionsFilePathPromise = null;

function joinPath(base, ...segments) {
  const separator = base.includes("\\") ? "\\" : "/";
  let sanitizedBase = base;
  if (sanitizedBase.length > 1) {
    sanitizedBase = sanitizedBase.replace(/[\\/]+$/, "");
  }

  const cleanedSegments = segments
    .map((segment) =>
      segment.replace(/^[\\/]+/, "").replace(/[\\/]+$/, "")
    )
    .filter(Boolean);

  if (sanitizedBase === separator) {
    return `${separator}${cleanedSegments.join(separator)}`;
  }

  if (cleanedSegments.length === 0) {
    return sanitizedBase;
  }

  return [sanitizedBase, ...cleanedSegments].join(separator);
}

function isMissingPathError(err) {
  if (!err) {
    return false;
  }

  const code = err.code;
  if (code === "NE_FS_NOPATHE" || code === "NE_FS_NOENT") {
    return true;
  }

  const message = (err.message || "").toLowerCase();
  return (
    message.includes("not exist") || message.includes("no such")
  );
}

function getParentDirectory(path) {
  if (!path) {
    return "";
  }

  const trimmed = path.replace(/[\\/]+$/, "");
  const match = trimmed.match(/^(.*?)[\\/][^\\/]+$/);

  if (!match) {
    if (/^[a-zA-Z]:$/.test(trimmed)) {
      return `${trimmed}\\`;
    }

    if (trimmed === "") {
      return "";
    }

    return trimmed;
  }

  const parent = match[1];

  if (!parent) {
    return trimmed.startsWith("\\") ? "\\\\" : "/";
  }

  if (/^[a-zA-Z]:$/.test(parent)) {
    return `${parent}\\`;
  }

  return parent;
}

async function ensureDirectoryExists(path) {
  try {
    const stats = await Neutralino.filesystem.getStats(path);
    if (stats && stats.isDirectory) {
      return;
    }

    throw new Error(`Path exists but is not a directory: ${path}`);
  } catch (err) {
    if (!isMissingPathError(err)) {
      if (err && err.code === "NE_FS_DIRCRER") {
        try {
          const stats = await Neutralino.filesystem.getStats(path);
          if (stats && stats.isDirectory) {
            return;
          }
        } catch (statsErr) {
          if (!isMissingPathError(statsErr)) {
            throw err;
          }
        }
      } else {
        throw err;
      }
    }
  }

  const parentDirectory = getParentDirectory(path);
  if (parentDirectory && parentDirectory !== path) {
    await ensureDirectoryExists(parentDirectory);
  }

  try {
    await Neutralino.filesystem.createDirectory(path);
  } catch (createErr) {
    if (isMissingPathError(createErr) && parentDirectory && parentDirectory !== path) {
      await ensureDirectoryExists(parentDirectory);
      return ensureDirectoryExists(path);
    }

    const message = (createErr && createErr.message) || "";
    if (
      createErr &&
      createErr.code === "NE_FS_DIRCRER" &&
      /exists/i.test(message)
    ) {
      return;
    }

    if (/exists/i.test(message)) {
      return;
    }

    throw createErr;
  }
}

async function getConnectionsFilePath() {
  if (!connectionsFilePathPromise) {
    connectionsFilePathPromise = (async () => {
      const configBase = await Neutralino.os.getPath("config");
      const appConfigDir = joinPath(configBase, CONFIG_FOLDER_NAME);
      try {
        await ensureDirectoryExists(appConfigDir);
      } catch (err) {
        console.error("Failed to prepare Candygram config directory:", err);
        throw err;
      }
      return joinPath(appConfigDir, CONFIG_FILE_NAME);
    })();
  }

  return connectionsFilePathPromise;
}

// Define actions
const actions = {
  addConnection(state, connection) {
    const nextConnection = {
      ...connection,
      isActive: Boolean(connection.isActive),
    };

    let connections = [...state.connections, nextConnection];
    let activeConnectionId = state.activeConnectionId;

    if (nextConnection.isActive) {
      activeConnectionId = nextConnection.id;
      connections = connections.map((conn) => ({
        ...conn,
        isActive: conn.id === nextConnection.id,
      }));
    }

    return {
      connections,
      currentForm: null,
      activeConnectionId,
    };
  },
  updateConnection(state, updatedConnection) {
    let activeConnectionId = state.activeConnectionId;

    const connections = state.connections.map((conn) => {
      if (conn.id !== updatedConnection.id) {
        if (updatedConnection.isActive) {
          return { ...conn, isActive: false };
        }
        return conn;
      }

      const merged = {
        ...conn,
        ...updatedConnection,
        isActive:
          updatedConnection.isActive !== undefined
            ? Boolean(updatedConnection.isActive)
            : Boolean(conn.isActive),
      };

      if (merged.isActive) {
        activeConnectionId = merged.id;
      } else if (state.activeConnectionId === merged.id) {
        activeConnectionId = null;
      }

      return merged;
    });

    return {
      connections,
      currentForm: null,
      activeConnectionId,
    };
  },
  deleteConnection(state, id) {
    const wasActive = state.activeConnectionId === id;
    const connections = state.connections
      .filter((conn) => conn.id !== id)
      .map((conn) =>
        wasActive
          ? {
              ...conn,
              isActive: false,
            }
          : conn
      );

    return {
      connections,
      activeConnectionId: wasActive ? null : state.activeConnectionId,
    };
  },
  setCurrentForm(state, formState) {
    return { ...state, currentForm: formState };
  },
  setActiveConnection(state, id) {
    const activeConnectionId = id || null;
    const connections = state.connections.map((conn) => ({
      ...conn,
      isActive: activeConnectionId !== null && conn.id === activeConnectionId,
    }));

    return {
      ...state,
      connections,
      activeConnectionId,
    };
  },
};

// Bind actions to the store
const addConnection = store.action(actions.addConnection);
const updateConnection = store.action(actions.updateConnection);
const deleteConnection = store.action(actions.deleteConnection);
const setCurrentForm = store.action(actions.setCurrentForm);
const setActiveConnection = store.action(actions.setActiveConnection);

// Save connections to the file
async function saveConnections() {
  try {
    const filePath = await getConnectionsFilePath();
    const data = JSON.stringify(store.getState().connections, null, 2);
    await Neutralino.filesystem.writeFile(filePath, data);
    console.log("Connections saved successfully to", filePath);
  } catch (err) {
    console.error("Failed to save connections:", err);
  }
}

// Load connections from the file
async function loadConnections() {
  let userData = null;

  try {
    const filePath = await getConnectionsFilePath();
    userData = await Neutralino.filesystem.readFile(filePath);
  } catch (err) {
    console.info(
      "No existing user connections file found. Starting with defaults.",
      err
    );
  }

  if (userData) {
    try {
      const parsed = JSON.parse(userData);
      let connections = [];
      let activeConnectionId = null;

      if (Array.isArray(parsed)) {
        connections = parsed.map((conn) => {
          const normalized = {
            ...conn,
            isActive: Boolean(conn.isActive),
          };

          if (normalized.isActive && activeConnectionId === null) {
            activeConnectionId =
              typeof normalized.id !== "undefined" ? normalized.id : null;
          }

          return normalized;
        });
      } else if (parsed && Array.isArray(parsed.connections)) {
        activeConnectionId =
          parsed.activeConnectionId !== undefined
            ? parsed.activeConnectionId
            : null;
        connections = parsed.connections.map((conn) => ({
          ...conn,
          isActive: Boolean(conn.isActive),
        }));

        if (activeConnectionId === null) {
          const activeFromConnections = connections.find((conn) => conn.isActive);
          if (activeFromConnections) {
            if (typeof activeFromConnections.id !== "undefined") {
              activeConnectionId = activeFromConnections.id;
            } else {
              activeConnectionId = null;
            }
          }
        }
      }

      if (activeConnectionId !== null) {
        connections = connections.map((conn) => ({
          ...conn,
          isActive: conn.id === activeConnectionId,
        }));
      }

      store.setState({ connections, activeConnectionId });
      return;
    } catch (err) {
      console.error("Failed to parse user connections file:", err);
    }
  }

  try {
    const packagedData = await Neutralino.filesystem.readFile(
      packagedConnectionsFilePath
    );
    const parsed = JSON.parse(packagedData);
    const normalizedConnections = Array.isArray(parsed)
      ? parsed.map((conn) => ({
          ...conn,
          isActive: Boolean(conn.isActive),
        }))
      : [];

    const activeFromConnections = normalizedConnections.find(
      (conn) => conn.isActive
    );

    let normalizedActiveId = null;
    if (activeFromConnections && typeof activeFromConnections.id !== "undefined") {
      normalizedActiveId = activeFromConnections.id;
    }

    store.setState({
      connections: normalizedConnections,
      activeConnectionId: normalizedActiveId,
    });
  } catch (fallbackError) {
    console.warn("Failed to load packaged sample connections:", fallbackError);
    store.setState({ connections: [], activeConnectionId: null });
  }
}

// Render the list of connections
function renderConnections(connections, activeConnectionId) {
  const list = document.getElementById("connection-list");
  list.innerHTML = "";

  connections.forEach((connection) => {
    const listItem = document.createElement("li");
    listItem.className = "flex items-center justify-between p-2 border-b";
    if (connection.id === activeConnectionId) {
      listItem.classList.add("bg-blue-100");
    }

    const nameContainer = document.createElement("span");
    nameContainer.textContent = connection.name;

    const controls = document.createElement("div");
    controls.className = "flex items-center";

    const activateButton = document.createElement("input");
    activateButton.type = "radio";
    activateButton.name = "active-connection";
    activateButton.className = "mr-2";
    activateButton.checked = connection.id === activeConnectionId;
    activateButton.setAttribute("aria-label", `Activate ${connection.name}`);
    activateButton.onclick = () => {
      setActiveConnection(connection.id);
    };

    const editButton = createIconButton({
      iconName: "FaEdit",
      ariaLabel: `Edit ${connection.name}`,
      buttonClass:
        "ml-2 text-sky-600 hover:text-sky-700 focus:ring-sky-500 hover:bg-sky-50",
      iconClass: "w-4 h-4",
      fallbackContent: "✎",
    });
    editButton.onclick = () => {
      setCurrentForm({ type: "edit", connection });
    };

    const deleteButton = createIconButton({
      iconName: "FaTrash",
      ariaLabel: `Delete ${connection.name}`,
      buttonClass:
        "ml-2 text-red-600 hover:text-red-700 focus:ring-red-500 hover:bg-red-50",
      iconClass: "w-4 h-4",
      fallbackContent: "🗑",
    });
    deleteButton.onclick = () => {
      deleteConnection(connection.id);
    };

    controls.appendChild(activateButton);
    controls.appendChild(editButton);
    controls.appendChild(deleteButton);

    listItem.appendChild(nameContainer);
    listItem.appendChild(controls);
    list.appendChild(listItem);
  });
}

// Render the form for editing or adding a connection
function escapeShellDoubleQuotes(value) {
  return value.replace(/(["\\$`])/g, "\\$1");
}

async function testConnection(uri) {
  if (
    !Neutralino ||
    !Neutralino.os ||
    typeof Neutralino.os.execCommand !== "function"
  ) {
    return {
      success: false,
      attempts: [
        {
          binary: "mongodb-node-driver",
          command: "",
          success: false,
          error: new Error("Neutralino OS command execution is unavailable."),
        },
      ],
    };
  }

  const driverLabel = "mongodb-node-driver";
  const escapedUri = escapeShellDoubleQuotes(uri);
  const command = `node resources/scripts/testMongoConnection.js "${escapedUri}"`;
  const attempts = [];

  try {
    const result = await Neutralino.os.execCommand(command);
    const success = result && Number(result.exitCode) === 0;
    let parsedOutput = null;

    if (result && result.stdOut) {
      const trimmedOutput = String(result.stdOut).trim();
      const lines = trimmedOutput.split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        try {
          parsedOutput = JSON.parse(line);
          break;
        } catch (error) {
          // Ignore lines that are not JSON
        }
      }
    }

    const attempt = {
      binary: driverLabel,
      command,
      success,
      exitCode: result ? result.exitCode : null,
      stdOut: result ? result.stdOut : "",
      stdErr: result ? result.stdErr : "",
      parsedOutput,
    };

    attempts.push(attempt);

    if (success) {
      return { success: true, attempts };
    }
  } catch (error) {
    attempts.push({
      binary: driverLabel,
      command,
      success: false,
      error,
      exitCode: null,
      stdOut: "",
      stdErr: "",
    });
  }

  if (Neutralino.debug && typeof Neutralino.debug.log === "function") {
    attempts.forEach((attempt) => {
      const summaryParts = [
        `[connection-test] binary=${attempt.binary}`,
        `command=${attempt.command}`,
        `exitCode=${attempt.exitCode}`,
      ];

      if (attempt.stdErr) {
        summaryParts.push(`stderr=${attempt.stdErr}`);
      }

      if (attempt.stdOut) {
        summaryParts.push(`stdout=${attempt.stdOut}`);
      }

      if (attempt.error) {
        summaryParts.push(`error=${attempt.error}`);
      }

      if (attempt.parsedOutput) {
        try {
          summaryParts.push(`parsed=${JSON.stringify(attempt.parsedOutput)}`);
        } catch (serializationError) {
          // Ignore serialization issues for parsed output logging.
        }
      }

      Neutralino.debug.log(summaryParts.join(" | "));
    });
  }

  return { success: false, attempts };
}

function summarizeFailedAttempts(attempts) {
  if (!Array.isArray(attempts) || attempts.length === 0) {
    return "";
  }

  return attempts
    .map((attempt) => {
      if (attempt.success) {
        return "";
      }

      if (attempt.error && attempt.error.message) {
        return `${attempt.binary}: ${attempt.error.message}`;
      }

      if (attempt.error) {
        return `${attempt.binary}: ${attempt.error}`;
      }

      const output = (attempt.stdErr || attempt.stdOut || "").trim();
      if (output) {
        const compactOutput = output.split(/\r?\n/).slice(-3).join(" ");
        return `${attempt.binary}: ${compactOutput}`;
      }

      if (typeof attempt.exitCode === "number") {
        return `${attempt.binary}: exited with code ${attempt.exitCode}`;
      }

      return `${attempt.binary}: unknown failure`;
    })
    .filter(Boolean)
    .join(" ");
}

function renderForm(formState) {
  const formContainer = document.getElementById("form-container");
  formContainer.innerHTML = "";

  if (!formState) return;

  const connection = formState.connection || { name: "", uri: "" };

  const wrapper = document.createElement("div");
  wrapper.className = "border border-gray-300 p-4 rounded-md space-y-3";

  const nameInput = document.createElement("input");
  nameInput.id = "form-name";
  nameInput.type = "text";
  nameInput.placeholder = "Connection Name";
  nameInput.value = connection.name;
  nameInput.className =
    "w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400";
  wrapper.appendChild(nameInput);

  const uriInput = document.createElement("input");
  uriInput.id = "form-uri";
  uriInput.type = "text";
  uriInput.placeholder = "Connection String (e.g., mongodb://localhost:27017)";
  uriInput.value = connection.uri;
  uriInput.className =
    "w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400";
  wrapper.appendChild(uriInput);

  const actionsRow = document.createElement("div");
  actionsRow.className = "flex items-center gap-2 pt-1";
  wrapper.appendChild(actionsRow);

  const testButton = document.createElement("button");
  testButton.id = "form-test-button";
  testButton.type = "button";
  testButton.className =
    "bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-yellow-400";
  testButton.textContent = "Test";
  actionsRow.appendChild(testButton);

  const saveButton = createIconButton({
    iconName: "FaCheck",
    ariaLabel: formState.type === "edit" ? "Save changes" : "Add connection",
    buttonClass:
      "text-green-600 hover:text-green-700 focus:ring-green-500 border border-green-200 hover:border-green-300",
    iconClass: "w-5 h-5",
    fallbackContent: "✓",
  });
  saveButton.id = "form-save-button";
  actionsRow.appendChild(saveButton);

  const cancelButton = createIconButton({
    iconName: "FaTimes",
    ariaLabel: "Cancel",
    buttonClass:
      "text-red-600 hover:text-red-700 focus:ring-red-500 border border-red-200 hover:border-red-300",
    iconClass: "w-5 h-5",
    fallbackContent: "✕",
  });
  cancelButton.id = "form-cancel-button";
  actionsRow.appendChild(cancelButton);

  const testResultElement = document.createElement("div");
  testResultElement.id = "form-test-result";
  testResultElement.className = "mt-2 text-sm";
  wrapper.appendChild(testResultElement);

  formContainer.appendChild(wrapper);

  saveButton.onclick = () => {
    const name = nameInput.value.trim();
    const uri = uriInput.value.trim();

    if (!name || !uri) {
      alert("Both name and connection string are required!");
      return;
    }

    if (formState.type === "edit") {
      updateConnection({ ...connection, name, uri });
    } else if (formState.type === "add") {
      addConnection({ id: Date.now(), name, uri, isActive: false });
    }
  };

  cancelButton.onclick = () => {
    setCurrentForm(null);
  };

  const originalTestLabel = testButton ? testButton.textContent : "";

  if (testButton) {
    testButton.onclick = async () => {
      const uri = uriInput ? uriInput.value.trim() : "";

      if (!uri) {
        alert("Connection string is required to test the connection.");
        return;
      }

      if (testResultElement) {
        testResultElement.textContent = "Testing connection...";
        testResultElement.className = "mt-2 text-sm text-gray-600";
      }

      testButton.disabled = true;
      testButton.textContent = "Testing...";

      try {
        const result = await testConnection(uri);
        if (result.success) {
          const successfulAttempt =
            Array.isArray(result.attempts)
              ? result.attempts.find((attempt) => attempt.success)
              : null;

          const parsedOutput = successfulAttempt ? successfulAttempt.parsedOutput : null;
          const successMessage = parsedOutput && typeof parsedOutput.ok !== "undefined"
            ? `Successfully connected (ok=${parsedOutput.ok}).`
            : "Successfully connected using the MongoDB Node.js driver.";

          if (testResultElement) {
            testResultElement.textContent = successMessage;
            testResultElement.className = "mt-2 text-sm text-green-600";
          } else {
            alert(successMessage);
          }
        } else {
          const failureDetails = summarizeFailedAttempts(result.attempts);
          const failureMessage = failureDetails
            ? `Failed to connect. ${failureDetails}`
            : "Failed to connect.";

          if (testResultElement) {
            testResultElement.textContent = failureMessage;
            testResultElement.className = "mt-2 text-sm text-red-600";
          } else {
            alert(failureMessage);
          }
        }
      } catch (err) {
        const fallbackMessage =
          (err && err.message) || "Unable to run connection test.";
        if (testResultElement) {
          testResultElement.textContent = fallbackMessage;
          testResultElement.className = "mt-2 text-sm text-red-600";
        } else {
          alert(fallbackMessage);
        }
      } finally {
        testButton.disabled = false;
        testButton.textContent = originalTestLabel || "Test";
      }
    };
  }
}

function setupSidebarToggle() {
  const sidebar = document.getElementById("settings-sidebar");
  const sidebarContent = document.getElementById("sidebar-content");
  const closeButtonContainer = document.getElementById(
    "sidebar-close-button-container",
  );
  const openButtonWrapper = document.getElementById(
    "sidebar-open-button-wrapper",
  );

  if (!sidebar) {
    return;
  }

  let hideSidebarTimeoutId = null;
  let hideOpenButtonTimeoutId = null;

  const closeButton = closeButtonContainer
    ? createIconButton({
        iconName: "FaTimes",
        ariaLabel: "Hide settings sidebar",
        buttonClass:
          "text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:ring-sky-500",
        iconClass: "w-4 h-4",
        fallbackContent: "×",
      })
    : null;

  if (closeButton) {
    closeButton.id = "sidebar-close-button";
    closeButton.setAttribute("aria-controls", "settings-sidebar");
    closeButtonContainer.appendChild(closeButton);
  }

  const openButton = openButtonWrapper
    ? createIconButton({
        iconName: "FaCog",
        ariaLabel: "Show settings sidebar",
        buttonClass:
          "bg-white text-gray-600 shadow-md rounded-full hover:text-gray-800 hover:bg-gray-100 focus:ring-sky-500", 
        iconClass: "w-5 h-5",
        fallbackContent: "⚙",
      })
    : null;

  if (openButton) {
    openButton.id = "sidebar-open-button";
    openButton.setAttribute("aria-controls", "settings-sidebar");
    openButtonWrapper.appendChild(openButton);
  }

  let collapsed = false;
  let previousCollapsed = collapsed;

  const applySidebarState = () => {
    const wasCollapsed = previousCollapsed;

    if (hideSidebarTimeoutId) {
      clearTimeout(hideSidebarTimeoutId);
      hideSidebarTimeoutId = null;
    }

    if (hideOpenButtonTimeoutId) {
      clearTimeout(hideOpenButtonTimeoutId);
      hideOpenButtonTimeoutId = null;
    }

    if (collapsed) {
      sidebar.classList.add("-translate-x-full", "pointer-events-none");
      sidebar.classList.remove("shadow-md");
      sidebar.classList.add("shadow-none");
      sidebar.setAttribute("aria-hidden", "true");

      if (sidebarContent) {
        sidebarContent.classList.add("opacity-0", "pointer-events-none");
        sidebarContent.classList.remove("opacity-100");
      }

      if (closeButton) {
        closeButton.disabled = true;
        closeButton.setAttribute("tabindex", "-1");
      }

      if (openButtonWrapper) {
        openButtonWrapper.classList.remove("hidden");
        requestAnimationFrame(() => {
          openButtonWrapper.classList.remove("opacity-0", "pointer-events-none");
          openButtonWrapper.classList.add("opacity-100");
        });
      }

      if (openButton) {
        openButton.setAttribute("aria-expanded", "false");
      }

      hideSidebarTimeoutId = setTimeout(() => {
        if (collapsed) {
          sidebar.classList.add("hidden");
        }
      }, SIDEBAR_TRANSITION_DURATION_MS);
    } else {
      sidebar.classList.remove("hidden", "pointer-events-none", "shadow-none");
      sidebar.classList.add("shadow-md");
      requestAnimationFrame(() => {
        sidebar.classList.remove("-translate-x-full");
      });
      sidebar.setAttribute("aria-hidden", "false");

      if (sidebarContent) {
        sidebarContent.classList.remove("opacity-0", "pointer-events-none");
        sidebarContent.classList.add("opacity-100");
      }

      if (closeButton) {
        closeButton.disabled = false;
        closeButton.removeAttribute("tabindex");
        if (wasCollapsed) {
          closeButton.focus();
        }
      }

      if (openButtonWrapper) {
        openButtonWrapper.classList.remove("opacity-100");
        openButtonWrapper.classList.add("opacity-0", "pointer-events-none");
        hideOpenButtonTimeoutId = setTimeout(() => {
          if (!collapsed) {
            openButtonWrapper.classList.add("hidden");
          }
        }, 200);
      }

      if (openButton) {
        openButton.setAttribute("aria-expanded", "true");
      }
    }

    previousCollapsed = collapsed;
  };

  applySidebarState();

  if (closeButton) {
    closeButton.addEventListener("click", () => {
      if (collapsed) {
        return;
      }
      collapsed = true;
      applySidebarState();
      if (openButton) {
        setTimeout(() => {
          openButton.focus();
        }, SIDEBAR_TRANSITION_DURATION_MS);
      }
    });
  }

  if (openButton) {
    openButton.addEventListener("click", () => {
      if (!collapsed) {
        return;
      }
      collapsed = false;
      applySidebarState();
    });
  }
}

// Set up event listener for "Add New" button
document.getElementById("add-new-button").addEventListener("click", () => {
  setCurrentForm({ type: "add" });
});

// Subscribe to state changes
store.subscribe((state) => {
  renderConnections(state.connections, state.activeConnectionId);
  renderForm(state.currentForm);
  saveConnections(); // Automatically save on any state change

  if (!CLIPBOARD_MONITORING_ENABLED) {
    return;
  }

  if (state.activeConnectionId !== lastActiveConnectionId) {
    lastActiveConnectionId = state.activeConnectionId;

    if (typeof lastClipboardContent === "string" && lastClipboardContent) {
      processClipboardContent(lastClipboardContent).catch((error) => {
        console.error(
          "Failed to refresh clipboard lookup after connection change:",
          error
        );
      });
    } else {
      renderClipboardIdleState();
    }
  }
});

// Initialize the app
async function init() {
  await loadConnections(); // Load connections from file
  const { connections, activeConnectionId } = store.getState();
  renderConnections(connections, activeConnectionId); // Initial render
  if (CLIPBOARD_MONITORING_ENABLED) {
    renderClipboardIdleState();
    try {
      const initialClipboard = await Neutralino.clipboard.readText();
      lastClipboardContent = initialClipboard;
      await processClipboardContent(initialClipboard);
    } catch (clipboardError) {
      console.warn("Unable to read initial clipboard contents:", clipboardError);
    }

    setInterval(getClipboardContent, 1000);
  } else {
    renderClipboardIdleState();
  }
}

document.addEventListener(MENU_EVENT_NAME, (event) => {
  let actionId = null;
  if (event && event.detail && typeof event.detail.id !== "undefined") {
    actionId = event.detail.id;
  }
  const command = MENU_ACTION_MAP[actionId];

  if (!command) {
    return;
  }

  performEditingCommand(command).catch((err) => {
    console.error(`Menu command "${command}" failed:`, err);
  });
});

setupSidebarToggle();
registerEditingShortcuts();
init();
