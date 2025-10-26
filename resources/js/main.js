// This is just a sample app. You can structure your Neutralinojs app code as you wish.
// This example app is written with vanilla JavaScript and HTML.
// Feel free to use any frontend framework you like :)
// See more details: https://neutralino.js.org/docs/how-to/use-a-frontend-library

const MENU_EVENT_NAME = "candygram:menu-action";
const MENU_ITEM_IDS = {
  QUIT: "menu:candygram:quit",
  CUT: "menu:edit:cut",
  COPY: "menu:edit:copy",
  PASTE: "menu:edit:paste",
  SELECT_ALL: "menu:edit:selectAll",
};

const NATIVE_MENU_EVENT_CANDIDATES = [
  "windowMenuItemClicked",
  "menuItemClicked",
  "appMenuItemClicked",
];

const MENU_ACTION_IDS = new Set(Object.values(MENU_ITEM_IDS));

/*
    Function to display information about the Neutralino app.
    This function updates the content of the 'info' element in the HTML
    with details regarding the running Neutralino application, including
    its ID, port, operating system, and version information.
*/
function showInfo() {
  document.getElementById("info").innerHTML = `
        ${NL_APPID} is running on port ${NL_PORT} inside ${NL_OS}
        <br/><br/>
        <span>server: v${NL_VERSION} . client: v${NL_CVERSION}</span>
        `;
}

/*
    Function to open the official Neutralino documentation in the default web browser.
*/
function openDocs() {
  Neutralino.os.open("https://neutralino.js.org/docs");
}

/*
    Function to open a tutorial video on Neutralino's official YouTube channel in the default web browser.
*/
function openTutorial() {
  Neutralino.os.open("https://www.youtube.com/c/CodeZri");
}

function dispatchMenuAction(actionId) {
  if (!MENU_ACTION_IDS.has(actionId)) {
    return;
  }

  document.dispatchEvent(
    new CustomEvent(MENU_EVENT_NAME, {
      detail: { id: actionId },
    })
  );
}

function registerNativeMenuEvents() {
  if (!Neutralino?.events?.on) {
    return;
  }

  NATIVE_MENU_EVENT_CANDIDATES.forEach((eventName) => {
    Neutralino.events.on(eventName, (event) => {
      const candidateId = event?.detail?.id || event?.detail;
      if (!candidateId) {
        return;
      }

      dispatchMenuAction(candidateId);
    });
  });
}

function setApplicationMenu() {
  console.log("setApplicationMenu");

  if (NL_MODE != "window") {
    console.log("INFO: Application menu is only available in the window mode.");
    return;
  }

  if (typeof Neutralino?.os?.setMenu !== "function") {
    console.warn("INFO: Native menu support is unavailable in this build.");
    return;
  }

  const candygramItems = [
    { id: MENU_ITEM_IDS.QUIT, text: "Quit Candygram" },
  ];

  const editItems = [
    { id: MENU_ITEM_IDS.CUT, text: "Cut" },
    { id: MENU_ITEM_IDS.COPY, text: "Copy" },
    { id: MENU_ITEM_IDS.PASTE, text: "Paste" },
    { id: MENU_ITEM_IDS.SELECT_ALL, text: "Select All" },
  ];

  const menuItems = [
    {
      id: "menu:candygram",
      text: "Candygram",
      menuItems: candygramItems,
      submenu: candygramItems,
      items: candygramItems,
    },
    {
      id: "menu:edit",
      text: "Edit",
      menuItems: editItems,
      submenu: editItems,
      items: editItems,
    },
  ];

  Neutralino.os
    .setMenu({ menuItems, menu: menuItems })
    .catch((error) => {
      console.error("Failed to set application menu:", error);
    });
}

/*
    Function to set up a system tray menu with options specific to the window mode.
    This function checks if the application is running in window mode, and if so,
    it defines the tray menu items and sets up the tray accordingly.
*/
function setTray() {
  console.log("setTray");
  // Tray menu is only available in window mode
  if (NL_MODE != "window") {
    console.log("INFO: Tray menu is only available in the window mode.");
    return;
  }

  // Define tray menu items
  let tray = {
    icon: "/resources/icons/trayIcon.png",
    menuItems: [
      { id: "VERSION", text: "Get version" },
      { id: "SEP", text: "-" },
      { id: "QUIT", text: "Quit" },
    ],
  };

  // Set the tray menu
  Neutralino.os.setTray(tray);
}

/*
    Function to handle click events on the tray menu items.
    This function performs different actions based on the clicked item's ID,
    such as displaying version information or exiting the application.
*/
function onTrayMenuItemClicked(event) {
  switch (event.detail.id) {
    case "VERSION":
      // Display version information
      Neutralino.os.showMessageBox(
        "Version information",
        `Neutralinojs server: v${NL_VERSION} | Neutralinojs client: v${NL_CVERSION}`
      );
      break;
    case "QUIT":
      // Exit the application
      Neutralino.app.exit();
      break;
  }
}

/*
    Function to handle the window close event by gracefully exiting the Neutralino application.
*/
function onWindowClose() {
  Neutralino.app.exit();
}

// Initialize Neutralino
Neutralino.init();
registerNativeMenuEvents();

// Register event listeners
Neutralino.events.on("trayMenuItemClicked", onTrayMenuItemClicked);
Neutralino.events.on("windowClose", onWindowClose);

// Conditional initialization: Use the system tray on non-macOS systems
// and prefer the native menu where available.
if (NL_OS === "Darwin") {
  setApplicationMenu();
} else {
  // TODO: Fix https://github.com/neutralinojs/neutralinojs/issues/615
  setTray();
  setApplicationMenu();
}
