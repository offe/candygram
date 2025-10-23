# **Candygram**

<p align="center">
  <img src="./resources/icons/candygram.png" alt="Candygram Logo" width="200">
</p>

**Candygram: A lightweight MongoDB management tool for exploring, querying, and managing your database.**

---

## **Features**

- **Explore MongoDB Databases**: Navigate through collections, view documents, and manage database structures.
- **Query Builder**: Build, execute, and save queries with ease.
- **Data Visualization**: View and interact with MongoDB data in a user-friendly interface.
- **Clipboard Integration**: Automatically fetch and search for MongoDB ObjectIds copied to your clipboard.
- **Offline Ready**: Works without internet access when connected to local MongoDB instances.
- **Cross-Platform**: Runs seamlessly on Windows, macOS, and Linux.

---

## **Architecture & Decisions**

- **MongoDB Integration Strategy**: Candygram uses the official MongoDB Node.js driver through a Neutralino extension or helper service. We intentionally do **not** bundle the `mongosh` binary so the app remains lightweight, avoids per-OS packaging of external executables, and can stream structured responses directly into the UI.

---

## **Roadmap: Clipboard ObjectId Lookup Milestone**

1. **Connection URL Entry**: Add a minimal form that lets the user type a MongoDB connection string and validates its shape before saving. _Test_: component/unit test that rejects malformed URLs and accepts valid SRV/standard URIs.
2. **Persist & Edit Connections**: Store connection strings in the existing JSON config with friendly names and allow editing/updating entries without duplication. _Test_: write persistence tests that cover add, edit, and reload scenarios.
3. **Active Connection Selection**: Let the user mark one saved connection as “active” and expose that choice to the application state used for lookups. _Test_: UI/state test verifying the active flag switches correctly and that lookups are disabled when nothing is selected.
4. **Backend Handshake**: Implement a Neutralino extension command that opens the active connection, pings the server, and retrieves a list of collection names—logging them for now. _Test_: integration test against a test MongoDB instance (or stub) that asserts collection names are returned and errors surface cleanly.
5. **Connection Feedback in UI**: Surface the handshake status (success/error plus collection names) in the Candygram window so the user can confirm the connection before any clipboard work. _Test_: component test that renders success, loading, and failure states.
6. **Clipboard ObjectId Detection**: Extend the clipboard watcher to detect 24-character hex strings and only trigger lookups when an active connection exists. _Test_: unit test for the detection helper plus an integration test that simulates clipboard updates.
7. **Lookup & JSON Display**: Wire a backend command that fetches the document for the detected ObjectId and render its JSON payload inside the UI. _Test_: end-to-end test copying a valid ObjectId, ensuring the document appears, and an error path when the ID is missing.

---

## **Technologies Used**

- **[Neutralino.js](https://neutralino.js.org)**: A lightweight framework for cross-platform desktop applications.
- **[MongoDB](https://www.mongodb.com)**: For database operations.
- **[TailwindCSS](https://tailwindcss.com)**: For styling the application.
- **JavaScript**: For app logic and interactions.

---

## **Getting Started**

### **Requirements**

1. **MongoDB**: Ensure you have a running MongoDB instance (local or remote).
2. **Node.js**: Required for building the application (if running in development mode).

---

### **Installation**

1. Download the appropriate build for your operating system from the [Releases](#) page.
2. Extract the files.
3. Run the executable:
   - **Windows**: `candygram-win_x64.exe`
   - **macOS**: `candygram-mac_x64`
   - **Linux**: `./candygram-linux_x64`

---

## **Running the App in Development Mode**

1. Clone the repository:

   ```bash
   git clone https://github.com/your-repo/candygram.git
   cd candygram
   ```

2. Install Neutralino CLI:

   ```bash
   npm install -g @neutralinojs/neu
   ```

3. Run the app:
   ```bash
   neu run
   ```

---

## **Building for Distribution**

1. Ensure the latest Neutralino CLI is installed:

   ```bash
   npm install -g @neutralinojs/neu
   ```

2. Build the app:

   ```bash
   neu build
   ```

3. The build output will be in the `dist/` directory:
   ```
   dist/
   ├── candygram-linux_x64
   ├── candygram-mac_x64
   ├── candygram-win_x64.exe
   └── resources.neu
   ```

---

## **Licensing**

Candygram is available under a **dual-license model**:

### **1. GNU General Public License v3 (GPLv3)**

- This software is free to use, modify, and distribute under the GPLv3.
- If you distribute this software, you must release your source code under the GPLv3.

See the [LICENSE](./LICENSE) file for the full terms.

### **2. Commercial License**

- For proprietary use, you can purchase a commercial license.
- This license allows you to use Candygram in closed-source projects without the restrictions of the GPL.

---

## **Contributing**

We welcome contributions! Please follow these steps:

1. Fork the repository.
2. Create a new branch:
   ```bash
   git checkout -b feature-name
   ```
3. Commit your changes:
   ```bash
   git commit -m "Add feature: description"
   ```
4. Push your branch and open a pull request.

---

## **Support**

If you encounter any issues or have questions, feel free to:

- Open an issue on [GitHub](#).

---

## **Acknowledgments**

- MongoDB for its powerful database platform.
- Neutralino.js for its lightweight and efficient framework.
- TailwindCSS for its modern and intuitive styling tools.

[
{
"id": 1733614025847,
"name": "Ciba",
"uri": "Who"
}
]
