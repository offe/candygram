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
const OBJECT_ID_INPUT_ELEMENT_ID = "objectid-input";
const OBJECT_ID_RUN_BUTTON_ID = "objectid-run-button";
const CLIPBOARD_SCAN_TOGGLE_ELEMENT_ID = "clipboard-scan-toggle";
const COLLECTIONS_STATUS_ELEMENT_ID = "collections-status";
const COLLECTIONS_LIST_ELEMENT_ID = "collections-list";
const CLIPBOARD_STATUS_TONES = {
  info: "text-gray-600",
  success: "text-green-600",
  error: "text-red-600",
  warning: "text-yellow-600",
};

const LOOKUP_MODE_BUTTON_SELECTOR = "[data-lookup-mode]";
const LOOKUP_PANEL_SELECTOR = "[data-lookup-panel]";
const FIND_COLLECTION_SELECT_ID = "find-collection-select";
const FIND_FILTER_INPUT_ID = "find-filter-input";
const FIND_PARSE_ERROR_ID = "find-parse-error";
const FIND_LIMIT_INPUT_ID = "find-limit-input";
const FIND_RUN_BUTTON_ID = "find-run-button";
const AGGREGATE_COLLECTION_SELECT_ID = "aggregate-collection-select";
const AGGREGATE_PIPELINE_INPUT_ID = "aggregate-pipeline-input";
const AGGREGATE_PARSE_ERROR_ID = "aggregate-parse-error";
const AGGREGATE_LIMIT_INPUT_ID = "aggregate-limit-input";
const AGGREGATE_RUN_BUTTON_ID = "aggregate-run-button";

const LOOKUP_MODES = {
  OBJECT_ID: "objectId",
  FIND: "find",
  AGGREGATE: "aggregate",
};

const LOOKUP_OUTPUT_ELEMENT_IDS = {
  [LOOKUP_MODES.OBJECT_ID]: "lookup-output-objectid",
  [LOOKUP_MODES.FIND]: "lookup-output-find",
  [LOOKUP_MODES.AGGREGATE]: "lookup-output-aggregate",
};

const LOOKUP_OUTPUT_CONTAINER_IDS = {
  [LOOKUP_MODES.OBJECT_ID]: "lookup-output-objectid-container",
  [LOOKUP_MODES.FIND]: "lookup-output-find-container",
  [LOOKUP_MODES.AGGREGATE]: "lookup-output-aggregate-container",
};

const LOOKUP_OUTPUT_COUNT_IDS = {
  [LOOKUP_MODES.OBJECT_ID]: "lookup-output-objectid-count",
  [LOOKUP_MODES.FIND]: "lookup-output-find-count",
  [LOOKUP_MODES.AGGREGATE]: "lookup-output-aggregate-count",
};

const LOOKUP_OUTPUT_ACTION_CONTAINER_IDS = {
  [LOOKUP_MODES.OBJECT_ID]: "lookup-output-objectid-actions",
  [LOOKUP_MODES.FIND]: "lookup-output-find-actions",
  [LOOKUP_MODES.AGGREGATE]: "lookup-output-aggregate-actions",
};

const LOOKUP_OUTPUT_COPY_BUTTON_IDS = {
  [LOOKUP_MODES.OBJECT_ID]: "lookup-output-objectid-copy",
  [LOOKUP_MODES.FIND]: "lookup-output-find-copy",
  [LOOKUP_MODES.AGGREGATE]: "lookup-output-aggregate-copy",
};

const DEFAULT_FIND_LIMIT = 20;
const DEFAULT_AGGREGATE_LIMIT = 20;
const MAX_RESULT_LIMIT = 200;
const LOOKUP_TAB_BASE_CLASS = "rounded-md px-3 py-1.5 text-sm font-medium";
const LOOKUP_TAB_ACTIVE_CLASS = "text-sky-700 bg-sky-100";
const LOOKUP_TAB_INACTIVE_CLASS = "text-gray-600 hover:bg-gray-100";

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
let isClipboardScanEnabled = CLIPBOARD_MONITORING_ENABLED;
let objectIdInputValue = "";
let isObjectIdRunInFlight = false;
let collectionsRequestSequence = 0;
let lastConnectionsSnapshot = null;
let lastActiveConnectionSignature = null;
let activeLookupMode = LOOKUP_MODES.OBJECT_ID;

const findModeState = {
  collection: "",
  filterText: "",
  parsedFilter: null,
  isValid: false,
  isLimitValid: true,
  isRunning: false,
  limit: DEFAULT_FIND_LIMIT,
};

const aggregateModeState = {
  collection: "",
  pipelineText: "",
  parsedPipeline: null,
  isValid: false,
  isLimitValid: true,
  isRunning: false,
  limit: DEFAULT_AGGREGATE_LIMIT,
};

let lastLookupCollectionsSignature = null;

const lookupResultAvailability = {
  [LOOKUP_MODES.OBJECT_ID]: false,
  [LOOKUP_MODES.FIND]: false,
  [LOOKUP_MODES.AGGREGATE]: false,
};

function getClipboardStatusElement() {
  return document.getElementById(CLIPBOARD_STATUS_ELEMENT_ID);
}

function getClipboardOutputElement(mode = activeLookupMode) {
  const elementId = LOOKUP_OUTPUT_ELEMENT_IDS[mode] || null;
  if (!elementId) {
    return null;
  }

  return document.getElementById(elementId);
}

function getLookupOutputContainer(mode = activeLookupMode) {
  const containerId = LOOKUP_OUTPUT_CONTAINER_IDS[mode] || null;
  if (!containerId) {
    return null;
  }

  return document.getElementById(containerId);
}

function getLookupResultCountElement(mode = activeLookupMode) {
  const countId = LOOKUP_OUTPUT_COUNT_IDS[mode] || null;
  if (!countId) {
    return null;
  }

  return document.getElementById(countId);
}

function getLookupOutputActionContainer(mode = activeLookupMode) {
  const actionContainerId = LOOKUP_OUTPUT_ACTION_CONTAINER_IDS[mode] || null;
  if (!actionContainerId) {
    return null;
  }

  return document.getElementById(actionContainerId);
}

function getLookupCopyButton(mode = activeLookupMode) {
  const buttonId = LOOKUP_OUTPUT_COPY_BUTTON_IDS[mode] || null;
  if (!buttonId) {
    return null;
  }

  return document.getElementById(buttonId);
}

function setLookupResultAvailability(mode = activeLookupMode, hasResult = false) {
  const normalizedMode = Object.values(LOOKUP_MODES).includes(mode)
    ? mode
    : activeLookupMode;

  lookupResultAvailability[normalizedMode] = Boolean(hasResult);

  const copyButton = getLookupCopyButton(normalizedMode);
  if (copyButton) {
    const disabled = !lookupResultAvailability[normalizedMode];
    copyButton.disabled = disabled;
    copyButton.setAttribute("aria-disabled", disabled ? "true" : "false");
  }
}

function formatDocumentCount(count) {
  if (!Number.isFinite(count)) {
    return "";
  }

  const normalized = Math.max(0, Math.trunc(count));
  const noun = normalized === 1 ? "document" : "documents";
  return `${normalized} ${noun} found`;
}

function setLookupDocumentCount(
  mode = activeLookupMode,
  count = null,
  { customLabel = null } = {},
) {
  const countElement = getLookupResultCountElement(mode);
  if (!countElement) {
    return;
  }

  if (typeof customLabel === "string") {
    countElement.textContent = customLabel;
    return;
  }

  if (typeof count === "number" && Number.isFinite(count)) {
    countElement.textContent = formatDocumentCount(count);
  } else {
    countElement.textContent = "";
  }
}

async function copyLookupOutput(mode = activeLookupMode) {
  const normalizedMode = Object.values(LOOKUP_MODES).includes(mode)
    ? mode
    : activeLookupMode;

  const hasResult = lookupResultAvailability[normalizedMode];
  const outputElement = getClipboardOutputElement(normalizedMode);

  if (!hasResult || !outputElement) {
    updateClipboardMessage("No results available to copy.", "warning");
    return;
  }

  const text = outputElement.textContent || "";
  if (!text.trim()) {
    updateClipboardMessage("Result is empty; nothing to copy.", "warning");
    return;
  }

  await handleClipboardWrite(text);
  updateClipboardMessage("Results copied to clipboard.", "success");
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

function clearClipboardOutput(mode = activeLookupMode) {
  const outputElement = getClipboardOutputElement(mode);
  if (outputElement) {
    outputElement.textContent = "";
    outputElement.classList.add("hidden");
  }

  const container = getLookupOutputContainer(mode);
  if (container) {
    container.classList.add("hidden");
  }

  setLookupDocumentCount(mode, null);
  setLookupResultAvailability(mode, false);
}

function clearAllLookupOutputs() {
  Object.values(LOOKUP_MODES).forEach((mode) => {
    clearClipboardOutput(mode);
  });
}

function getObjectIdInputElement() {
  return document.getElementById(OBJECT_ID_INPUT_ELEMENT_ID);
}

function getClipboardScanToggleElement() {
  return document.getElementById(CLIPBOARD_SCAN_TOGGLE_ELEMENT_ID);
}

function getObjectIdRunButtonElement() {
  return document.getElementById(OBJECT_ID_RUN_BUTTON_ID);
}

function updateObjectIdControlsState() {
  const input = getObjectIdInputElement();
  const runButton = getObjectIdRunButtonElement();
  const watching = isClipboardWatcherActive();
  const hasValue = Boolean(objectIdInputValue && objectIdInputValue.trim());
  const busy = Boolean(isObjectIdRunInFlight);

  if (input) {
    input.disabled = watching;
    if (watching) {
      input.setAttribute("aria-disabled", "true");
      input.setAttribute(
        "title",
        "Disable clipboard watching to edit the ObjectId manually.",
      );
    } else {
      input.removeAttribute("aria-disabled");
      input.removeAttribute("title");
    }
  }

  if (runButton) {
    const shouldDisable = watching || !hasValue || busy;
    runButton.disabled = shouldDisable;
    runButton.setAttribute("aria-disabled", shouldDisable ? "true" : "false");

    if (watching) {
      runButton.title = "Disable clipboard watching to run manually.";
    } else if (!hasValue) {
      runButton.title = "Enter an ObjectId to run the lookup.";
    } else if (busy) {
      runButton.title = "Running lookup...";
    } else {
      runButton.removeAttribute("title");
    }
  }
}

function applyClipboardScanState() {
  const toggle = getClipboardScanToggleElement();
  if (toggle) {
    toggle.checked = Boolean(isClipboardScanEnabled);
    if (!CLIPBOARD_MONITORING_ENABLED) {
      toggle.disabled = true;
      toggle.title = "Clipboard scanning is unavailable.";
    } else if (activeLookupMode !== LOOKUP_MODES.OBJECT_ID) {
      toggle.disabled = true;
      toggle.title = "Clipboard watching is available in the ObjectId tab.";
    } else {
      toggle.disabled = false;
      toggle.removeAttribute("title");
    }
  }

  const input = getObjectIdInputElement();
  if (input) {
    input.setAttribute("aria-live", "polite");
  }

  updateObjectIdControlsState();
}

function isClipboardWatcherActive() {
  return (
    CLIPBOARD_MONITORING_ENABLED &&
    activeLookupMode === LOOKUP_MODES.OBJECT_ID &&
    Boolean(isClipboardScanEnabled)
  );
}

function setClipboardScanEnabled(enabled) {
  const normalized = CLIPBOARD_MONITORING_ENABLED ? Boolean(enabled) : false;
  if (normalized === isClipboardScanEnabled) {
    return;
  }

  isClipboardScanEnabled = normalized;
  applyClipboardScanState();

  if (isClipboardWatcherActive()) {
    renderClipboardIdleState();
    getClipboardContent();
  } else if (activeLookupMode === LOOKUP_MODES.OBJECT_ID) {
    renderClipboardIdleState();
  } else {
    updateLookupIdleMessage();
  }
}

function setObjectIdInputValue(value, { fromClipboard = false } = {}) {
  objectIdInputValue = typeof value === "string" ? value : "";
  const input = getObjectIdInputElement();
  if (input && input.value !== objectIdInputValue) {
    input.value = objectIdInputValue;
  }

  if (fromClipboard && input) {
    input.dataset.lastSource = "clipboard";
  } else if (input) {
    input.dataset.lastSource = "input";
  }

  updateObjectIdControlsState();
}

function getLookupIdleMessage() {
  if (activeLookupMode === LOOKUP_MODES.OBJECT_ID) {
    return isClipboardWatcherActive()
      ? "Copy a MongoDB ObjectId to search the active connection."
      : "Enter a MongoDB ObjectId and press Enter or Run to search the active connection.";
  }

  if (activeLookupMode === LOOKUP_MODES.FIND) {
    return "Select a collection and enter a JSON filter to run a find query.";
  }

  if (activeLookupMode === LOOKUP_MODES.AGGREGATE) {
    return "Provide a JSON pipeline to run the aggregation.";
  }

  return "Choose a lookup mode to begin.";
}

function updateLookupIdleMessage() {
  updateClipboardMessage(getLookupIdleMessage(), "info");
}

function renderClipboardIdleState(mode = activeLookupMode) {
  updateLookupIdleMessage();
  clearClipboardOutput(mode);
}

function renderLookupLoadingMessage(message, mode = activeLookupMode) {
  const outputElement = getClipboardOutputElement(mode);
  if (!outputElement) {
    return;
  }

  outputElement.textContent = message || "Running lookup...";
  outputElement.classList.remove("hidden");

  const container = getLookupOutputContainer(mode);
  if (container) {
    container.classList.remove("hidden");
  }

  setLookupDocumentCount(mode, null);
  setLookupResultAvailability(mode, false);
}

function renderClipboardLoading(objectId) {
  renderLookupLoadingMessage(
    `Running ObjectId lookup for ObjectId(${objectId})...`,
    LOOKUP_MODES.OBJECT_ID,
  );
}

function renderJsonResult(value, mode = activeLookupMode, documentCount = null) {
  const outputElement = getClipboardOutputElement(mode);
  if (!outputElement) {
    return;
  }

  try {
    outputElement.textContent = JSON.stringify(value, null, 2);
    outputElement.classList.remove("hidden");

    const container = getLookupOutputContainer(mode);
    if (container) {
      container.classList.remove("hidden");
    }

    if (typeof documentCount === "number" && Number.isFinite(documentCount)) {
      setLookupDocumentCount(mode, documentCount);
    } else {
      setLookupDocumentCount(mode, null);
    }

    setLookupResultAvailability(mode, true);
  } catch (error) {
    console.error("Failed to render JSON result:", error);
    clearClipboardOutput(mode);
  }
}

function renderClipboardMatches(matches) {
  if (!Array.isArray(matches) || matches.length === 0) {
    clearClipboardOutput(LOOKUP_MODES.OBJECT_ID);
    return;
  }

  if (matches.length === 1) {
    const match = matches[0] || {};
    const documentForDisplay =
      match && typeof match === "object" && match.document ? match.document : {};
    renderJsonResult(documentForDisplay, LOOKUP_MODES.OBJECT_ID, 1);
    return;
  }

  const grouped = {};
  matches.forEach((match) => {
    if (!match || typeof match !== "object") {
      return;
    }

    const collectionName =
      match.collection && typeof match.collection === "string"
        ? match.collection
        : "unknown";
    grouped[collectionName] = match.document || null;
  });

  renderJsonResult(grouped, LOOKUP_MODES.OBJECT_ID, matches.length);
}

function updateParseErrorMessage(elementId, message) {
  const element = elementId ? document.getElementById(elementId) : null;
  if (!element) {
    return;
  }

  if (message) {
    element.textContent = message;
    element.classList.remove("hidden");
  } else {
    element.textContent = "";
    element.classList.add("hidden");
  }
}

function parseJsonStructure(rawText, {
  expectObject = false,
  expectArray = false,
  emptyMessage = "",
  typeMismatchMessage = "",
} = {}) {
  const trimmed = typeof rawText === "string" ? rawText.trim() : "";

  if (!trimmed) {
    return { valid: false, value: null, message: emptyMessage || "" };
  }

  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    return { valid: false, value: null, message: `Invalid JSON: ${message}` };
  }

  if (expectObject) {
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        valid: false,
        value: null,
        message: typeMismatchMessage || "Value must be a JSON object.",
      };
    }
  }

  if (expectArray) {
    if (!Array.isArray(parsed)) {
      return {
        valid: false,
        value: null,
        message: typeMismatchMessage || "Value must be a JSON array.",
      };
    }
  }

  return { valid: true, value: parsed, message: "" };
}

function normalizeResultLimitInput(inputElement, modeState) {
  if (!inputElement || !modeState) {
    return;
  }

  const rawValue = inputElement.value;
  const parsed = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    inputElement.setCustomValidity("Enter a result limit of 1 or greater.");
    modeState.isLimitValid = false;
    return;
  }

  if (parsed > MAX_RESULT_LIMIT) {
    inputElement.setCustomValidity(
      `Enter a result limit of ${MAX_RESULT_LIMIT} or fewer.`,
    );
    modeState.isLimitValid = false;
    return;
  }

  inputElement.setCustomValidity("");
  modeState.isLimitValid = true;
  modeState.limit = parsed;
}

function updateFindRunButtonState() {
  const button = document.getElementById(FIND_RUN_BUTTON_ID);
  if (!button) {
    return;
  }

  const disabled =
    !findModeState.isValid ||
    !findModeState.isLimitValid ||
    !findModeState.collection ||
    findModeState.isRunning;

  button.disabled = disabled;
}

function updateAggregateRunButtonState() {
  const button = document.getElementById(AGGREGATE_RUN_BUTTON_ID);
  if (!button) {
    return;
  }

  const disabled =
    !aggregateModeState.isValid ||
    !aggregateModeState.isLimitValid ||
    !aggregateModeState.collection ||
    aggregateModeState.isRunning;

  button.disabled = disabled;
}

function handleFindFilterChange(rawText) {
  findModeState.filterText = typeof rawText === "string" ? rawText : "";
  const { valid, value, message } = parseJsonStructure(findModeState.filterText, {
    expectObject: true,
    emptyMessage: "",
    typeMismatchMessage: "Filter must be a JSON object.",
  });

  findModeState.isValid = valid;
  findModeState.parsedFilter = valid ? value : null;
  updateParseErrorMessage(FIND_PARSE_ERROR_ID, message);
  updateFindRunButtonState();
}

function handleAggregatePipelineChange(rawText) {
  aggregateModeState.pipelineText = typeof rawText === "string" ? rawText : "";
  const { valid, value, message } = parseJsonStructure(
    aggregateModeState.pipelineText,
    {
      expectArray: true,
      emptyMessage: "",
      typeMismatchMessage: "Pipeline must be a JSON array.",
    },
  );

  aggregateModeState.isValid = valid;
  aggregateModeState.parsedPipeline = valid ? value : null;
  updateParseErrorMessage(AGGREGATE_PARSE_ERROR_ID, message);
  updateAggregateRunButtonState();
}

function populateCollectionSelect(selectElement, placeholderText, modeState, collections) {
  if (!selectElement || !modeState) {
    return;
  }

  const fragment = document.createDocumentFragment();
  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = placeholderText;
  fragment.appendChild(placeholderOption);

  const safeCollections = Array.isArray(collections) ? collections : [];
  safeCollections.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    fragment.appendChild(option);
  });

  while (selectElement.firstChild) {
    selectElement.removeChild(selectElement.firstChild);
  }

  selectElement.appendChild(fragment);

  const preservedValue = safeCollections.includes(modeState.collection)
    ? modeState.collection
    : "";

  if (preservedValue !== modeState.collection) {
    modeState.collection = preservedValue;
  }

  selectElement.value = preservedValue;
}

function syncLookupCollectionDropdowns(collections, { connectionId, status } = {}) {
  const collectionsSignature = Array.isArray(collections)
    ? collections.join("\u0001")
    : "";
  const signature = `${connectionId || "none"}|${status || "unknown"}|${collectionsSignature}`;

  if (signature === lastLookupCollectionsSignature) {
    return;
  }

  lastLookupCollectionsSignature = signature;

  populateCollectionSelect(
    document.getElementById(FIND_COLLECTION_SELECT_ID),
    "Select a collection",
    findModeState,
    collections,
  );
  populateCollectionSelect(
    document.getElementById(AGGREGATE_COLLECTION_SELECT_ID),
    "Select a collection",
    aggregateModeState,
    collections,
  );

  updateFindRunButtonState();
  updateAggregateRunButtonState();
}

function getLookupModeButtons() {
  return Array.from(document.querySelectorAll(LOOKUP_MODE_BUTTON_SELECTOR));
}

function getLookupPanels() {
  return Array.from(document.querySelectorAll(LOOKUP_PANEL_SELECTOR));
}

function applyLookupModeState() {
  const buttons = getLookupModeButtons();
  buttons.forEach((button) => {
    const mode = button.dataset.lookupMode;
    const isActive = mode === activeLookupMode;
    button.setAttribute("aria-selected", isActive ? "true" : "false");
    button.className = `${LOOKUP_TAB_BASE_CLASS} ${
      isActive ? LOOKUP_TAB_ACTIVE_CLASS : LOOKUP_TAB_INACTIVE_CLASS
    }`;
    button.tabIndex = isActive ? 0 : -1;
  });

  const panels = getLookupPanels();
  panels.forEach((panel) => {
    const panelMode = panel.dataset.lookupPanel;
    const isActive = panelMode === activeLookupMode;
    panel.classList.toggle("hidden", !isActive);
    if (isActive) {
      panel.removeAttribute("tabindex");
    } else {
      panel.setAttribute("tabindex", "-1");
    }
  });

  applyClipboardScanState();
  updateLookupIdleMessage();
}

function setActiveLookupMode(nextMode) {
  const allowedModes = Object.values(LOOKUP_MODES);
  const normalized = allowedModes.includes(nextMode) ? nextMode : LOOKUP_MODES.OBJECT_ID;

  if (normalized === activeLookupMode) {
    return;
  }

  activeLookupMode = normalized;
  applyLookupModeState();

  if (activeLookupMode === LOOKUP_MODES.OBJECT_ID) {
    if (isClipboardWatcherActive()) {
      if (typeof lastClipboardContent === "string" && lastClipboardContent) {
        processClipboardContent(lastClipboardContent).catch((error) => {
          console.error("Failed to refresh clipboard lookup:", error);
        });
      } else if (objectIdInputValue && objectIdInputValue.trim()) {
        handleManualLookupRequest(objectIdInputValue, {
          showInvalidFeedback: false,
        }).catch((error) => {
          console.error("Failed to refresh ObjectId lookup:", error);
        });
      }
    } else if (objectIdInputValue && objectIdInputValue.trim()) {
      handleManualLookupRequest(objectIdInputValue, {
        showInvalidFeedback: false,
      }).catch((error) => {
        console.error("Failed to refresh ObjectId lookup:", error);
      });
    }
  }
}

function handleLookupTabKeydown(event) {
  const currentButton = event.currentTarget;
  if (!currentButton || !currentButton.dataset) {
    return;
  }

  const modeOrder = [
    LOOKUP_MODES.OBJECT_ID,
    LOOKUP_MODES.FIND,
    LOOKUP_MODES.AGGREGATE,
  ];
  const currentMode = currentButton.dataset.lookupMode;
  const currentIndex = modeOrder.indexOf(currentMode);
  if (currentIndex === -1) {
    return;
  }

  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    event.preventDefault();
    const nextIndex = (currentIndex + 1) % modeOrder.length;
    const nextMode = modeOrder[nextIndex];
    setActiveLookupMode(nextMode);
    const buttons = getLookupModeButtons();
    const nextButton = buttons.find((button) => button.dataset.lookupMode === nextMode);
    if (nextButton) {
      nextButton.focus();
    }
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    event.preventDefault();
    const previousIndex = (currentIndex - 1 + modeOrder.length) % modeOrder.length;
    const previousMode = modeOrder[previousIndex];
    setActiveLookupMode(previousMode);
    const buttons = getLookupModeButtons();
    const previousButton = buttons.find(
      (button) => button.dataset.lookupMode === previousMode,
    );
    if (previousButton) {
      previousButton.focus();
    }
  } else if (event.key === "Home") {
    event.preventDefault();
    const firstMode = modeOrder[0];
    setActiveLookupMode(firstMode);
    const buttons = getLookupModeButtons();
    const firstButton = buttons.find((button) => button.dataset.lookupMode === firstMode);
    if (firstButton) {
      firstButton.focus();
    }
  } else if (event.key === "End") {
    event.preventDefault();
    const lastMode = modeOrder[modeOrder.length - 1];
    setActiveLookupMode(lastMode);
    const buttons = getLookupModeButtons();
    const lastButton = buttons.find((button) => button.dataset.lookupMode === lastMode);
    if (lastButton) {
      lastButton.focus();
    }
  } else if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    setActiveLookupMode(currentMode);
  }
}

function setButtonBusy(button, isBusy, busyLabel = "Running…") {
  if (!button) {
    return;
  }

  if (isBusy) {
    if (!button.dataset.originalLabel) {
      button.dataset.originalLabel = button.textContent || "";
    }
    button.textContent = busyLabel;
  } else {
    const original = button.dataset.originalLabel || "Run";
    button.textContent = original;
    delete button.dataset.originalLabel;
  }
}

function setupLookupOutputCopyButtons() {
  Object.values(LOOKUP_MODES).forEach((mode) => {
    const actionContainer = getLookupOutputActionContainer(mode);
    if (!actionContainer) {
      return;
    }

    const copyButtonId = LOOKUP_OUTPUT_COPY_BUTTON_IDS[mode];
    if (copyButtonId && document.getElementById(copyButtonId)) {
      return;
    }

    const copyButton = createIconButton({
      iconName: "FaRegClipboard",
      ariaLabel: "Copy results to clipboard",
      buttonClass:
        "text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:ring-sky-500 disabled:cursor-not-allowed disabled:text-gray-300",
      iconClass: "w-4 h-4",
      fallbackContent: "⧉",
    });

    if (!copyButton) {
      return;
    }

    copyButton.id = copyButtonId;
    copyButton.disabled = true;
    copyButton.setAttribute("aria-disabled", "true");

    copyButton.addEventListener("click", () => {
      copyLookupOutput(mode).catch((error) => {
        console.error("Failed to copy lookup results:", error);
        updateClipboardMessage(
          "Failed to copy results to the clipboard.",
          "error",
        );
      });
    });

    actionContainer.appendChild(copyButton);
  });

  Object.values(LOOKUP_MODES).forEach((mode) => {
    setLookupResultAvailability(mode, lookupResultAvailability[mode]);
  });
}

async function executeFindQuery() {
  if (
    findModeState.isRunning ||
    !findModeState.isValid ||
    !findModeState.isLimitValid ||
    !findModeState.collection
  ) {
    updateClipboardMessage(
      "Provide a collection, valid filter, and limit to run the find query.",
      "warning",
    );
    if (!findModeState.isLimitValid) {
      const limitInput = document.getElementById(FIND_LIMIT_INPUT_ID);
      if (limitInput) {
        limitInput.reportValidity();
      }
    }
    return;
  }

  const state = store.getState();
  const activeConnection = Array.isArray(state.connections)
    ? state.connections.find((conn) => conn.id === state.activeConnectionId)
    : null;

  if (!activeConnection) {
    updateClipboardMessage(
      "Select an active connection before running a find query.",
      "warning",
    );
    return;
  }

  const runButton = document.getElementById(FIND_RUN_BUTTON_ID);
  findModeState.isRunning = true;
  if (runButton) {
    setButtonBusy(runButton, true);
  }
  updateFindRunButtonState();

  const statusMessage = `Running find on ${findModeState.collection}...`;
  updateClipboardMessage(statusMessage, "info");
  renderLookupLoadingMessage(statusMessage, LOOKUP_MODES.FIND);

  try {
    const result = await runFindQueryInConnection(activeConnection, {
      collection: findModeState.collection,
      filter: findModeState.parsedFilter,
      limit: findModeState.limit,
    });

    if (result.status === "ok" || result.status === "found") {
      updateClipboardMessage("Find query complete.", "success");
      const documents = Array.isArray(result.results) ? result.results : [];
      renderJsonResult(documents, LOOKUP_MODES.FIND, documents.length);
      return;
    }

    if (result.status === "dependency_missing") {
      updateClipboardMessage(result.message, "error");
      clearClipboardOutput(LOOKUP_MODES.FIND);
      return;
    }

    if (result.status === "invalid" || result.status === "invalid_limit") {
      updateClipboardMessage(result.message || "Find query input is invalid.", "error");
      clearClipboardOutput(LOOKUP_MODES.FIND);
      return;
    }

    updateClipboardMessage(result.message || "Find query failed.", "error");
    clearClipboardOutput(LOOKUP_MODES.FIND);
  } catch (error) {
    updateClipboardMessage(
      (error && error.message) || "Find query execution failed.",
      "error",
    );
    clearClipboardOutput(LOOKUP_MODES.FIND);
  } finally {
    findModeState.isRunning = false;
    if (runButton) {
      setButtonBusy(runButton, false);
    }
    updateFindRunButtonState();
  }
}

async function executeAggregateQuery() {
  if (
    aggregateModeState.isRunning ||
    !aggregateModeState.isValid ||
    !aggregateModeState.isLimitValid ||
    !aggregateModeState.collection
  ) {
    updateClipboardMessage(
      "Provide a collection, valid pipeline, and limit to run the aggregation.",
      "warning",
    );
    if (!aggregateModeState.isLimitValid) {
      const limitInput = document.getElementById(AGGREGATE_LIMIT_INPUT_ID);
      if (limitInput) {
        limitInput.reportValidity();
      }
    }
    return;
  }

  const state = store.getState();
  const activeConnection = Array.isArray(state.connections)
    ? state.connections.find((conn) => conn.id === state.activeConnectionId)
    : null;

  if (!activeConnection) {
    updateClipboardMessage(
      "Select an active connection before running an aggregation.",
      "warning",
    );
    return;
  }

  const runButton = document.getElementById(AGGREGATE_RUN_BUTTON_ID);
  aggregateModeState.isRunning = true;
  if (runButton) {
    setButtonBusy(runButton, true);
  }
  updateAggregateRunButtonState();

  const statusMessage = `Running aggregation on ${aggregateModeState.collection}...`;
  updateClipboardMessage(statusMessage, "info");
  renderLookupLoadingMessage(statusMessage, LOOKUP_MODES.AGGREGATE);

  try {
    const result = await runAggregateQueryInConnection(activeConnection, {
      collection: aggregateModeState.collection,
      pipeline: aggregateModeState.parsedPipeline,
      limit: aggregateModeState.limit,
    });

    if (result.status === "ok" || result.status === "found") {
      updateClipboardMessage("Aggregation complete.", "success");
      const documents = Array.isArray(result.results) ? result.results : [];
      renderJsonResult(documents, LOOKUP_MODES.AGGREGATE, documents.length);
      return;
    }

    if (result.status === "dependency_missing") {
      updateClipboardMessage(result.message, "error");
      clearClipboardOutput(LOOKUP_MODES.AGGREGATE);
      return;
    }

    if (result.status === "invalid" || result.status === "invalid_limit") {
      updateClipboardMessage(result.message || "Aggregation input is invalid.", "error");
      clearClipboardOutput(LOOKUP_MODES.AGGREGATE);
      return;
    }

    updateClipboardMessage(result.message || "Aggregation failed.", "error");
    clearClipboardOutput(LOOKUP_MODES.AGGREGATE);
  } catch (error) {
    updateClipboardMessage(
      (error && error.message) || "Aggregation execution failed.",
      "error",
    );
    clearClipboardOutput(LOOKUP_MODES.AGGREGATE);
  } finally {
    aggregateModeState.isRunning = false;
    if (runButton) {
      setButtonBusy(runButton, false);
    }
    updateAggregateRunButtonState();
  }
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

async function runObjectIdLookup(objectId, { source = "clipboard" } = {}) {
  const state = store.getState();
  const activeConnection = Array.isArray(state.connections)
    ? state.connections.find((conn) => conn.id === state.activeConnectionId)
    : null;

  if (!activeConnection) {
    updateClipboardMessage(
      `Ready to search for ObjectId(${objectId}). Select an active connection first.`,
      "warning",
    );
    clearClipboardOutput(LOOKUP_MODES.OBJECT_ID);
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

    if (Object.prototype.hasOwnProperty.call(lookupResult, "collections")) {
      const collections = normalizeCollectionsList(lookupResult.collections);

      const updates = {
        collectionsStatus: "loaded",
        collectionsError: null,
        activeConnectionCollections: collections,
      };

      if (typeof lookupResult.readOnly === "boolean") {
        updates.activeConnectionReadOnly = lookupResult.readOnly;
      }

      store.setState(updates);
    }

    if (lookupResult.status === "dependency_missing") {
      store.setState({
        collectionsStatus: "error",
        collectionsError: lookupResult.message ||
          "MongoDB driver dependency is missing. Run \"npm install\" and try again.",
        activeConnectionCollections: [],
        activeConnectionReadOnly: null,
      });
    }

    if (lookupResult.status === "found") {
      updateClipboardMessage("Document lookup complete.", "success");
      renderClipboardMatches(lookupResult.matches);
      return;
    }

    if (
      lookupResult.status === "not_found" ||
      lookupResult.status === "no_collections"
    ) {
      updateClipboardMessage(`${objectId} Object not found.`, "error");
      clearClipboardOutput(LOOKUP_MODES.OBJECT_ID);
      return;
    }

    if (lookupResult.status === "dependency_missing") {
      updateClipboardMessage(lookupResult.message, "error");
      clearClipboardOutput(LOOKUP_MODES.OBJECT_ID);
      return;
    }

    if (lookupResult.status === "invalid") {
      updateClipboardMessage(lookupResult.message, "error");
      clearClipboardOutput(LOOKUP_MODES.OBJECT_ID);
      return;
    }

    updateClipboardMessage(
      lookupResult.message || "Failed to search for the ObjectId.",
      "error",
    );
    clearClipboardOutput(LOOKUP_MODES.OBJECT_ID);
  } catch (error) {
    if (lookupToken !== clipboardLookupSequence) {
      return;
    }

    updateClipboardMessage(
      (error && error.message) || "Unexpected error while processing the lookup.",
      "error",
    );
    clearClipboardOutput(LOOKUP_MODES.OBJECT_ID);
  }
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
              const collections = Array.isArray(parsed.collections)
                ? parsed.collections
                : parsed.status === "no_collections"
                ? []
                : null;

              const readOnly =
                typeof parsed.readOnly === "boolean" ? parsed.readOnly : null;

              return {
                status: parsed.status,
                matches: Array.isArray(parsed.matches) ? parsed.matches : [],
                collections,
                readOnly,
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

function parseFirstJsonObjectFromOutput(stdOut) {
  if (!stdOut) {
    return null;
  }

  const lines = String(stdOut)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch (error) {
      // Ignore invalid JSON lines.
    }
  }

  return null;
}

async function runFindQueryInConnection(connection, { collection, filter, limit }) {
  if (!connection || !connection.uri) {
    return {
      status: "error",
      message: "Active connection is missing a MongoDB URI.",
    };
  }

  if (!Neutralino || !Neutralino.os || typeof Neutralino.os.execCommand !== "function") {
    return {
      status: "error",
      message: "Neutralino OS command execution is unavailable.",
    };
  }

  const escapedUri = escapeShellDoubleQuotes(connection.uri);
  const escapedCollection = escapeShellDoubleQuotes(collection);
  const filterJson = JSON.stringify(filter);
  const escapedFilter = escapeShellDoubleQuotes(filterJson);
  const escapedLimit = escapeShellDoubleQuotes(String(limit));
  const command = `node resources/scripts/runFindQuery.js "${escapedUri}" "${escapedCollection}" "${escapedFilter}" "${escapedLimit}"`;

  try {
    const result = await Neutralino.os.execCommand(command);
    const exitCode = result && typeof result.exitCode !== "undefined" ? Number(result.exitCode) : null;
    const stdOut = result && result.stdOut ? String(result.stdOut).trim() : "";
    const stdErr = result && result.stdErr ? String(result.stdErr).trim() : "";

    if (exitCode === 0) {
      const parsed = parseFirstJsonObjectFromOutput(stdOut);
      if (parsed && typeof parsed === "object") {
        return {
          status: parsed.status || "ok",
          results: Array.isArray(parsed.results) ? parsed.results : [],
        };
      }

      return {
        status: "error",
        message: "Query script returned an unexpected response.",
        details: stdOut,
      };
    }

    if (stdErr.includes("Missing dependency")) {
      return { status: "dependency_missing", message: stdErr };
    }

    if (exitCode === 3 || stdErr.toLowerCase().includes("invalid json")) {
      return { status: "invalid", message: stdErr || "Invalid filter JSON provided." };
    }

    if (exitCode === 4 || stdErr.toLowerCase().includes("limit")) {
      return {
        status: "invalid_limit",
        message: stdErr || "Invalid result limit provided.",
      };
    }

    return {
      status: "error",
      message: stdErr || "Find query failed.",
      exitCode,
    };
  } catch (error) {
    return {
      status: "error",
      message: (error && error.message) || "Find query execution failed.",
      error,
    };
  }
}

async function runAggregateQueryInConnection(connection, { collection, pipeline, limit }) {
  if (!connection || !connection.uri) {
    return {
      status: "error",
      message: "Active connection is missing a MongoDB URI.",
    };
  }

  if (!Neutralino || !Neutralino.os || typeof Neutralino.os.execCommand !== "function") {
    return {
      status: "error",
      message: "Neutralino OS command execution is unavailable.",
    };
  }

  const escapedUri = escapeShellDoubleQuotes(connection.uri);
  const escapedCollection = escapeShellDoubleQuotes(collection);
  const pipelineJson = JSON.stringify(pipeline);
  const escapedPipeline = escapeShellDoubleQuotes(pipelineJson);
  const escapedLimit = escapeShellDoubleQuotes(String(limit));
  const command = `node resources/scripts/runAggregatePipeline.js "${escapedUri}" "${escapedCollection}" "${escapedPipeline}" "${escapedLimit}"`;

  try {
    const result = await Neutralino.os.execCommand(command);
    const exitCode = result && typeof result.exitCode !== "undefined" ? Number(result.exitCode) : null;
    const stdOut = result && result.stdOut ? String(result.stdOut).trim() : "";
    const stdErr = result && result.stdErr ? String(result.stdErr).trim() : "";

    if (exitCode === 0) {
      const parsed = parseFirstJsonObjectFromOutput(stdOut);
      if (parsed && typeof parsed === "object") {
        return {
          status: parsed.status || "ok",
          results: Array.isArray(parsed.results) ? parsed.results : [],
        };
      }

      return {
        status: "error",
        message: "Aggregation script returned an unexpected response.",
        details: stdOut,
      };
    }

    if (stdErr.includes("Missing dependency")) {
      return { status: "dependency_missing", message: stdErr };
    }

    if (exitCode === 3 || stdErr.toLowerCase().includes("invalid json")) {
      return { status: "invalid", message: stdErr || "Invalid pipeline JSON provided." };
    }

    if (exitCode === 4 || stdErr.toLowerCase().includes("limit")) {
      return {
        status: "invalid_limit",
        message: stdErr || "Invalid result limit provided.",
      };
    }

    return {
      status: "error",
      message: stdErr || "Aggregation query failed.",
      exitCode,
    };
  } catch (error) {
    return {
      status: "error",
      message: (error && error.message) || "Aggregation execution failed.",
      error,
    };
  }
}

async function fetchCollectionsForConnection(connection) {
  if (!connection || !connection.uri) {
    throw new Error("Active connection is missing a MongoDB URI.");
  }

  if (
    !Neutralino ||
    !Neutralino.os ||
    typeof Neutralino.os.execCommand !== "function"
  ) {
    throw new Error("Neutralino OS command execution is unavailable.");
  }

  const escapedUri = escapeShellDoubleQuotes(connection.uri);
  const command = `node resources/scripts/listMongoCollections.js "${escapedUri}"`;

  const result = await Neutralino.os.execCommand(command);
  const exitCode = result && typeof result.exitCode !== "undefined"
    ? Number(result.exitCode)
    : null;
  const stdOut = result && result.stdOut ? String(result.stdOut).trim() : "";
  const stdErr = result && result.stdErr ? String(result.stdErr).trim() : "";

  if (exitCode === 0 && stdOut) {
    const lines = stdOut.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed && typeof parsed === "object") {
          const collections = normalizeCollectionsList(parsed.collections);
          const readOnly =
            typeof parsed.readOnly === "boolean" ? parsed.readOnly : null;

          return { collections, readOnly };
        }
      } catch (error) {
        // Ignore invalid JSON lines
      }
    }

    throw new Error("Collection listing script returned an unexpected response.");
  }

  if (stdErr.includes("Missing dependency")) {
    throw new Error(stdErr);
  }

  throw new Error(stdErr || "Failed to load collections for the active connection.");
}

async function loadCollectionsForActiveConnection() {
  const state = store.getState();
  const activeConnection = Array.isArray(state.connections)
    ? state.connections.find((conn) => conn.id === state.activeConnectionId)
    : null;

  const requestToken = ++collectionsRequestSequence;

  if (!activeConnection) {
    store.setState({
      collectionsStatus: "idle",
      collectionsError: null,
      activeConnectionCollections: [],
      activeConnectionReadOnly: null,
    });
    return;
  }

  store.setState({
    collectionsStatus: "loading",
    collectionsError: null,
    activeConnectionCollections: [],
    activeConnectionReadOnly: null,
  });

  try {
    const { collections, readOnly } = await fetchCollectionsForConnection(
      activeConnection,
    );

    if (requestToken !== collectionsRequestSequence) {
      return;
    }

    const updates = {
      collectionsStatus: "loaded",
      collectionsError: null,
      activeConnectionCollections: normalizeCollectionsList(collections),
    };

    if (typeof readOnly === "boolean") {
      updates.activeConnectionReadOnly = readOnly;
    }

    store.setState(updates);
  } catch (error) {
    if (requestToken !== collectionsRequestSequence) {
      return;
    }

    store.setState({
      collectionsStatus: "error",
      collectionsError:
        (error && error.message) || "Failed to load collections for this connection.",
      activeConnectionCollections: [],
      activeConnectionReadOnly: null,
    });
  }
}

async function processClipboardContent(clipboardText) {
  if (!isClipboardWatcherActive()) {
    return;
  }

  const trimmed = typeof clipboardText === "string" ? clipboardText.trim() : "";

  if (!trimmed) {
    setObjectIdInputValue("", { fromClipboard: true });
    renderClipboardIdleState(LOOKUP_MODES.OBJECT_ID);
    return;
  }

  const objectId = extractObjectIdFromClipboard(trimmed);
  if (!objectId) {
    const preview = getFirstClipboardLine(clipboardText);
    updateClipboardMessage(
      `Clipboard is not a valid ObjectId. First line: ${preview || "(empty)"}`,
      "error",
    );
    clearClipboardOutput(LOOKUP_MODES.OBJECT_ID);
    return;
  }

  setObjectIdInputValue(objectId, { fromClipboard: true });
  await runObjectIdLookup(objectId, { source: "clipboard" });
}

function handleManualLookupRequest(rawValue, { showInvalidFeedback = false } = {}) {
  const trimmed = typeof rawValue === "string" ? rawValue.trim() : "";

  if (!trimmed) {
    renderClipboardIdleState(LOOKUP_MODES.OBJECT_ID);
    clearClipboardOutput(LOOKUP_MODES.OBJECT_ID);
    return Promise.resolve();
  }

  const objectId = extractObjectIdFromClipboard(trimmed);
  if (!objectId) {
    if (trimmed.length >= 24) {
      if (showInvalidFeedback) {
        updateClipboardMessage("Input is not a valid ObjectId.", "error");
      } else {
        updateClipboardMessage("Enter a valid ObjectId to search.", "info");
      }
      clearClipboardOutput(LOOKUP_MODES.OBJECT_ID);
    } else {
      renderClipboardIdleState(LOOKUP_MODES.OBJECT_ID);
    }

    return Promise.resolve();
  }

  setObjectIdInputValue(objectId);

  return runObjectIdLookup(objectId, { source: "input" });
}

// Function to monitor clipboard content
async function getClipboardContent() {
  if (!isClipboardWatcherActive()) {
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
  activeConnectionCollections: [],
  collectionsStatus: "idle",
  collectionsError: null,
  activeConnectionReadOnly: null,
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
      ...state,
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
      ...state,
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
      ...state,
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
    listItem.className = "flex items-center justify-between gap-3 p-2 border-b";
    if (connection.id === activeConnectionId) {
      listItem.classList.add("bg-blue-100");
    }

    const leftGroup = document.createElement("div");
    leftGroup.className = "flex items-center gap-2";

    const activateButton = document.createElement("input");
    activateButton.type = "radio";
    activateButton.name = "active-connection";
    activateButton.className =
      "h-4 w-4 border-gray-300 text-sky-600 focus:ring-sky-500";
    activateButton.checked = connection.id === activeConnectionId;
    activateButton.setAttribute("aria-label", `Activate ${connection.name}`);
    activateButton.onclick = () => {
      setActiveConnection(connection.id);
    };

    const nameContainer = document.createElement("span");
    nameContainer.className = "text-sm font-medium text-gray-700";
    nameContainer.textContent = connection.name;

    leftGroup.appendChild(activateButton);
    leftGroup.appendChild(nameContainer);

    const controls = document.createElement("div");
    controls.className = "flex items-center gap-2";

    const editButton = createIconButton({
      iconName: "FaEdit",
      ariaLabel: `Edit ${connection.name}`,
      buttonClass:
        "text-sky-600 hover:text-sky-700 focus:ring-sky-500 hover:bg-sky-50",
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
        "text-red-600 hover:text-red-700 focus:ring-red-500 hover:bg-red-50",
      iconClass: "w-4 h-4",
      fallbackContent: "🗑",
    });
    deleteButton.onclick = () => {
      deleteConnection(connection.id);
    };

    controls.appendChild(editButton);
    controls.appendChild(deleteButton);

    listItem.appendChild(leftGroup);
    listItem.appendChild(controls);
    list.appendChild(listItem);
  });
}

function getCollectionsStatusElement() {
  return document.getElementById(COLLECTIONS_STATUS_ELEMENT_ID);
}

function getCollectionsListElement() {
  return document.getElementById(COLLECTIONS_LIST_ELEMENT_ID);
}

function renderCollectionsSection(state) {
  const statusElement = getCollectionsStatusElement();
  const listElement = getCollectionsListElement();

  if (!statusElement || !listElement) {
    return;
  }

  const {
    activeConnectionId,
    collectionsStatus,
    collectionsError,
    activeConnectionCollections,
    activeConnectionReadOnly,
  } = state;

  const activeConnection = Array.isArray(state.connections)
    ? state.connections.find((conn) => conn.id === activeConnectionId)
    : null;

  listElement.innerHTML = "";
  listElement.classList.add("hidden");

  if (!activeConnection) {
    statusElement.textContent = "Select a connection to load collections.";
    statusElement.className = "text-sm text-gray-500";
    return;
  }

  if (collectionsStatus === "loading") {
    statusElement.textContent = "Loading collections...";
    statusElement.className = "text-sm text-sky-600";
    return;
  }

  if (collectionsStatus === "error") {
    const message = collectionsError || "Failed to load collections.";
    statusElement.textContent = message;
    statusElement.className = "text-sm text-red-600";
    return;
  }

  const accessDescriptor =
    typeof activeConnectionReadOnly === "boolean"
      ? activeConnectionReadOnly
        ? "read-only"
        : "read/write"
      : null;

  if (!Array.isArray(activeConnectionCollections) || activeConnectionCollections.length === 0) {
    const baseMessage = `No collections found for ${activeConnection.name || "this connection"}.`;
    statusElement.textContent = accessDescriptor
      ? `${baseMessage} (${accessDescriptor}).`
      : baseMessage;
    statusElement.className = "text-sm text-gray-500";
    return;
  }

  const intro = accessDescriptor
    ? `Collections for ${activeConnection.name || "the active connection"} (${accessDescriptor}).`
    : `Collections for ${activeConnection.name || "the active connection"}.`;
  statusElement.textContent = intro;
  statusElement.className = "text-sm text-gray-600";

  activeConnectionCollections.forEach((name) => {
    const item = document.createElement("li");
    item.className = "rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-gray-700";
    item.textContent = name;
    listElement.appendChild(item);
  });

  listElement.classList.remove("hidden");
}

function normalizeCollectionsList(collections) {
  if (!Array.isArray(collections)) {
    return [];
  }

  const seen = new Set();
  const normalized = [];

  collections.forEach((name) => {
    if (typeof name !== "string") {
      return;
    }

    const trimmed = name.trim();
    if (!trimmed || seen.has(trimmed)) {
      return;
    }

    seen.add(trimmed);
    normalized.push(trimmed);
  });

  return normalized.sort((a, b) => a.localeCompare(b));
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
            ? (() => {
                const accessDescriptor =
                  typeof parsedOutput.readOnly === "boolean"
                    ? parsedOutput.readOnly
                      ? "read-only"
                      : "read/write"
                    : typeof parsedOutput.accessLevel === "string"
                    ? parsedOutput.accessLevel.trim()
                    : "";

                const suffix = accessDescriptor ? `, ${accessDescriptor}` : "";
                return `Successfully connected (ok=${parsedOutput.ok}${suffix}).`;
              })()
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

function setupDocumentLookupUi() {
  setupLookupOutputCopyButtons();
  const tabButtons = getLookupModeButtons();
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.lookupMode;
      setActiveLookupMode(mode);
      button.focus();
    });

    button.addEventListener("keydown", handleLookupTabKeydown);
  });

  applyLookupModeState();

  const objectIdInput = getObjectIdInputElement();
  if (objectIdInput) {
    objectIdInput.addEventListener("input", (event) => {
      setObjectIdInputValue(event.target.value || "");

      if (isClipboardWatcherActive()) {
        return;
      }

      handleManualLookupRequest(objectIdInputValue, {
        showInvalidFeedback: false,
      }).catch((error) => {
        console.error("Manual ObjectId lookup failed:", error);
      });
    });

    objectIdInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();

      handleManualLookupRequest(objectIdInputValue, {
        showInvalidFeedback: true,
      }).catch((error) => {
        console.error("Manual ObjectId lookup failed:", error);
      });
    });
  }

  const objectIdRunButton = getObjectIdRunButtonElement();
  if (objectIdRunButton) {
    objectIdRunButton.addEventListener("click", () => {
      if (objectIdRunButton.disabled) {
        return;
      }

      isObjectIdRunInFlight = true;
      setButtonBusy(objectIdRunButton, true);
      updateObjectIdControlsState();

      handleManualLookupRequest(objectIdInputValue, {
        showInvalidFeedback: true,
      })
        .catch((error) => {
          console.error("Manual ObjectId lookup failed:", error);
        })
        .finally(() => {
          isObjectIdRunInFlight = false;
          setButtonBusy(objectIdRunButton, false);
          updateObjectIdControlsState();
        });
    });
  }

  const clipboardToggle = getClipboardScanToggleElement();
  if (clipboardToggle) {
    clipboardToggle.checked = Boolean(isClipboardScanEnabled);
    clipboardToggle.addEventListener("change", (event) => {
      const { checked } = event.target;
      setClipboardScanEnabled(checked);

      if (!checked) {
        handleManualLookupRequest(objectIdInputValue, {
          showInvalidFeedback: false,
        }).catch((error) => {
          console.error("Manual ObjectId lookup failed:", error);
        });
      }
    });
  }

  const findCollectionSelect = document.getElementById(FIND_COLLECTION_SELECT_ID);
  if (findCollectionSelect) {
    findCollectionSelect.addEventListener("change", (event) => {
      findModeState.collection = event.target.value || "";
      updateFindRunButtonState();
    });
  }

  const findFilterInput = document.getElementById(FIND_FILTER_INPUT_ID);
  if (findFilterInput) {
    findFilterInput.addEventListener("input", (event) => {
      handleFindFilterChange(event.target.value);
    });
  }

  const findLimitInput = document.getElementById(FIND_LIMIT_INPUT_ID);
  if (findLimitInput) {
    findLimitInput.value = String(findModeState.limit);
    normalizeResultLimitInput(findLimitInput, findModeState);
    findLimitInput.addEventListener("input", (event) => {
      normalizeResultLimitInput(event.target, findModeState);
      updateFindRunButtonState();
    });
    findLimitInput.addEventListener("blur", (event) => {
      if (!findModeState.isLimitValid) {
        event.target.reportValidity();
      }
    });
  }

  const findRunButton = document.getElementById(FIND_RUN_BUTTON_ID);
  if (findRunButton) {
    findRunButton.addEventListener("click", () => {
      executeFindQuery().catch((error) => {
        console.error("Find query execution failed:", error);
      });
    });
  }

  const aggregateCollectionSelect = document.getElementById(
    AGGREGATE_COLLECTION_SELECT_ID,
  );
  if (aggregateCollectionSelect) {
    aggregateCollectionSelect.addEventListener("change", (event) => {
      aggregateModeState.collection = event.target.value || "";
      updateAggregateRunButtonState();
    });
  }

  const aggregatePipelineInput = document.getElementById(
    AGGREGATE_PIPELINE_INPUT_ID,
  );
  if (aggregatePipelineInput) {
    aggregatePipelineInput.addEventListener("input", (event) => {
      handleAggregatePipelineChange(event.target.value);
    });
  }

  const aggregateLimitInput = document.getElementById(AGGREGATE_LIMIT_INPUT_ID);
  if (aggregateLimitInput) {
    aggregateLimitInput.value = String(aggregateModeState.limit);
    normalizeResultLimitInput(aggregateLimitInput, aggregateModeState);
    aggregateLimitInput.addEventListener("input", (event) => {
      normalizeResultLimitInput(event.target, aggregateModeState);
      updateAggregateRunButtonState();
    });
    aggregateLimitInput.addEventListener("blur", (event) => {
      if (!aggregateModeState.isLimitValid) {
        event.target.reportValidity();
      }
    });
  }

  const aggregateRunButton = document.getElementById(AGGREGATE_RUN_BUTTON_ID);
  if (aggregateRunButton) {
    aggregateRunButton.addEventListener("click", () => {
      executeAggregateQuery().catch((error) => {
        console.error("Aggregate query execution failed:", error);
      });
    });
  }

  const {
    activeConnectionCollections,
    activeConnectionId,
    collectionsStatus,
  } = store.getState();
  syncLookupCollectionDropdowns(activeConnectionCollections, {
    connectionId: activeConnectionId,
    status: collectionsStatus,
  });

  updateFindRunButtonState();
  updateAggregateRunButtonState();
  applyClipboardScanState();
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
  renderCollectionsSection(state);
  syncLookupCollectionDropdowns(state.activeConnectionCollections, {
    connectionId: state.activeConnectionId,
    status: state.collectionsStatus,
  });

  if (state.connections !== lastConnectionsSnapshot) {
    lastConnectionsSnapshot = state.connections;
    saveConnections();
  }

  const activeConnection = Array.isArray(state.connections)
    ? state.connections.find((conn) => conn.id === state.activeConnectionId)
    : null;
  const activeSignature = activeConnection
    ? `${activeConnection.id}:${activeConnection.uri || ""}`
    : null;

  if (activeSignature !== lastActiveConnectionSignature) {
    lastActiveConnectionSignature = activeSignature;

    loadCollectionsForActiveConnection().catch((error) => {
      console.error("Failed to load collections for the active connection:", error);
    });
  }

  if (state.activeConnectionId !== lastActiveConnectionId) {
    lastActiveConnectionId = state.activeConnectionId;
    clearAllLookupOutputs();
    if (CLIPBOARD_MONITORING_ENABLED && isClipboardScanEnabled) {
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
    } else if (objectIdInputValue && objectIdInputValue.trim()) {
      handleManualLookupRequest(objectIdInputValue, {
        showInvalidFeedback: false,
      }).catch((error) => {
        console.error(
          "Failed to refresh manual lookup after connection change:",
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
  clearAllLookupOutputs();
  renderClipboardIdleState();

  if (CLIPBOARD_MONITORING_ENABLED) {
    if (isClipboardScanEnabled) {
      try {
        const initialClipboard = await Neutralino.clipboard.readText();
        lastClipboardContent = initialClipboard;
        await processClipboardContent(initialClipboard);
      } catch (clipboardError) {
        console.warn("Unable to read initial clipboard contents:", clipboardError);
      }
    }

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

setupDocumentLookupUi();
setupSidebarToggle();
registerEditingShortcuts();
init();
