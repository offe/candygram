// app.js

// Clipboard monitoring
let lastClipboardContent = "";

// Function to monitor clipboard content
async function getClipboardContent() {
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
};

// Create the store
const store = unistore(initialState);

// Define actions
const actions = {
  addConnection(state, connection) {
    return {
      connections: [...state.connections, connection],
      currentForm: null,
    };
  },
  updateConnection(state, updatedConnection) {
    return {
      connections: state.connections.map((conn) =>
        conn.id === updatedConnection.id ? updatedConnection : conn
      ),
      currentForm: null,
    };
  },
  deleteConnection(state, id) {
    return { connections: state.connections.filter((conn) => conn.id !== id) };
  },
  setCurrentForm(state, formState) {
    return { ...state, currentForm: formState };
  },
};

// Bind actions to the store
const addConnection = store.action(actions.addConnection);
const updateConnection = store.action(actions.updateConnection);
const deleteConnection = store.action(actions.deleteConnection);
const setCurrentForm = store.action(actions.setCurrentForm);

// Path to save the connections
const connectionsFilePath = "./resources/config/connections.json";

// Save connections to the file
async function saveConnections() {
  try {
    const data = JSON.stringify(store.getState().connections, null, 2);
    await Neutralino.filesystem.writeFile(connectionsFilePath, data);
    console.log("Connections saved successfully!");
  } catch (err) {
    console.error("Failed to save connections:", err);
  }
}

// Load connections from the file
async function loadConnections() {
  try {
    const data = await Neutralino.filesystem.readFile(connectionsFilePath);
    const connections = JSON.parse(data);
    store.setState({ connections });
  } catch (err) {
    console.warn("No existing connections file found or failed to load:", err);
  }
}

// Render the list of connections
function renderConnections(connections) {
  const list = document.getElementById("connection-list");
  list.innerHTML = "";

  connections.forEach((connection) => {
    const listItem = document.createElement("li");
    listItem.textContent = connection.name;

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

    listItem.appendChild(editButton);
    listItem.appendChild(deleteButton);
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
      addConnection({ id: Date.now(), name, uri });
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
  renderConnections(state.connections);
  renderForm(state.currentForm);
  saveConnections(); // Automatically save on any state change
});

// Initialize the app
async function init() {
  await loadConnections(); // Load connections from file
  renderConnections(store.getState().connections); // Initial render
  setInterval(getClipboardContent, 1000);
}

init();
