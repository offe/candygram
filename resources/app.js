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

// Function to monitor clipboard content
async function getClipboardContent() {
  if (!CLIPBOARD_MONITORING_ENABLED) {
    return;
  }
  const { activeConnectionId } = store.getState();
  if (!activeConnectionId) {
    console.warn("No active connection selected. Clipboard monitoring paused.");
    return;
  }

  if (isEditableElement(document.activeElement)) {
    return;
  }
  try {
    const clipboardText = await Neutralino.clipboard.readText();
    if (clipboardText !== lastClipboardContent) {
      document.getElementById("clipboard-content").value = clipboardText;
      console.log(clipboardText);
      lastClipboardContent = clipboardText;
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

async function ensureDirectoryExists(path) {
  try {
    await Neutralino.filesystem.createDirectory(path);
  } catch (err) {
    if (!err || !/exists/i.test(err.message || "")) {
      throw err;
    }
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

    const editButton = document.createElement("button");
    editButton.textContent = "Edit";
    editButton.className =
      "ml-2 bg-green-600 hover:bg-green-700 text-black font-bold py-1 px-3 rounded";
    editButton.onclick = () => {
      setCurrentForm({ type: "edit", connection });
    };

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.className =
      "ml-2 bg-red-600 hover:bg-red-700 text-black font-bold py-1 px-3 rounded";
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
function renderForm(formState) {
  const formContainer = document.getElementById("form-container");
  formContainer.innerHTML = "";

  if (!formState) return;

  const connection = formState.connection || { name: "", uri: "" };

  formContainer.innerHTML = `
    <div class="border border-gray-300 p-4 rounded-md">
      <input
        id="form-name"
        type="text"
        placeholder="Connection Name"
        value="${connection.name}"
        class="w-full mb-2 border border-gray-300 rounded-md p-2 text-sm"
      />
      <input
        id="form-uri"
        type="text"
        placeholder="Connection String (e.g., mongodb://localhost:27017)"
        value="${connection.uri}"
        class="w-full mb-2 border border-gray-300 rounded-md p-2 text-sm"
      />
      <button id="form-test-button" class="bg-yellow-500 text-white px-4 py-2 rounded-md">
        Test
      </button>
      <button id="form-save-button" class="bg-green-500 text-white px-4 py-2 rounded-md ml-2">
        Save
      </button>
      <button id="form-cancel-button" class="bg-gray-500 text-white px-4 py-2 rounded-md ml-2">
        Cancel
      </button>
    </div>
  `;

  document.getElementById("form-save-button").onclick = () => {
    const name = document.getElementById("form-name").value.trim();
    const uri = document.getElementById("form-uri").value.trim();

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

  document.getElementById("form-cancel-button").onclick = () => {
    setCurrentForm(null);
  };

  document.getElementById("form-test-button").onclick = () => {
    alert("Test functionality not implemented yet.");
  };
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
});

// Initialize the app
async function init() {
  await loadConnections(); // Load connections from file
  const { connections, activeConnectionId } = store.getState();
  renderConnections(connections, activeConnectionId); // Initial render
  if (CLIPBOARD_MONITORING_ENABLED) {
    setInterval(getClipboardContent, 1000);
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

registerEditingShortcuts();
init();
