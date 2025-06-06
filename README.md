# Local Photo Reel

A modern, browser-based photo gallery application that allows you to directly interact with and manage photo folders on your local computer. This project is built entirely with Vanilla JavaScript, leveraging advanced browser APIs to provide a desktop-like experience without needing a back-end or frameworks.


## ✨ Features

  * **Direct Folder Access:** Open any folder of images from your local disk directly in the browser using the File System API.
  * **Persistent Memory:** The application remembers the last folder you opened between sessions using IndexedDB, providing a seamless experience.
  * **Automatic Refresh:** A background Web Worker automatically detects new photos added to the folder (polling every 3 seconds) and refreshes the gallery without blocking the UI.
  * **Safe File Renaming:** Easily rename files. The interface cleverly separates the file name from the extension to prevent accidental changes to the file type.
  * **Demo Mode:** Don't have a folder of photos ready? Create a new demo album with sample car images downloaded directly into a new folder on your machine.
  * **Modern UI:** A sleek, responsive, dark-themed interface with smooth transitions and non-intrusive toast notifications instead of native alerts.
  * **Framework-Free:** Built with 100% Vanilla JavaScript, HTML5, and CSS3 to showcase the power of modern web standards.

## 🚀 How It Works

This project is a practical demonstration of several cutting-edge browser APIs working together:

  * **File System API:** The core of the application. It's used to request access to a user's local directory (`window.showDirectoryPicker()`). The returned `FileSystemDirectoryHandle` is then used to read directory contents, create new folders, create new files, and handle file renaming. This happens securely, with the user's explicit permission.

  * **IndexedDB:** To provide persistence, the `FileSystemDirectoryHandle` of the last selected folder is stored in IndexedDB. When you reopen the application, it attempts to retrieve this handle and verify permissions, allowing you to pick up right where you left off.

  * **Web Workers:** To handle the detection of new files without freezing the main user interface, a Web Worker runs a simple `setInterval` loop in the background. It periodically scans the selected directory and sends a message to the main application if it detects any changes, which then triggers a gallery refresh.

  * **Blob & Object URLs:** Used to generate the image thumbnails efficiently without reading the entire file into memory in a blocking way.

## 🛠️ How to Run Locally

Because the File System API requires a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts), you cannot run this project by simply opening the `index.html` file from your local disk (`file://` protocol). You must serve it through a local web server.

1.  **Clone or Download the Repository:**

    ```bash
    git clone https://github.com/nsrau/local-photo-reel.git
    cd local-photo-reel
    ```

2.  **Start a Local Server:**
    The easiest way is to use `npx`, which is included with Node.js. In the project directory, run:

    ```bash
    npx serve
    ```

    This will start a server and give you a URL, usually `http://localhost:3000`.

    Alternatively, if you use Visual Studio Code, you can install the **Live Server** extension and simply click "Go Live" from the status bar.

3.  **Open in a Compatible Browser:**
    Open the local server URL (e.g., `http://localhost:3000`) in a modern browser that supports the File System API, such as:

      * Google Chrome (version 86+)
      * Microsoft Edge (version 86+)
      * Opera (version 72+)

## 📁 Project Structure

The project is intentionally kept simple with two main files:

```
local-photo-reel/
├── 📄 index.html      (The main HTML structure of the application)
├── 🎨 style.css       (All CSS rules for styling the interface)
└── 📜 app.js          (All application logic and interactions)
```
