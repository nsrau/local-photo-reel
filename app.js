// DOM Elements
const btnSelectFolder = document.getElementById("btnSelectFolder");
const btnChangeFolder = document.getElementById("btnChangeFolder");
const btnCreateDemo = document.getElementById("btnCreateDemo");
const gallery = document.getElementById("gallery");
const folderNameEl = document.getElementById("folder-name");
const welcomeScreen = document.getElementById("welcome-screen");
const toastContainer = document.getElementById("toast-container");

// Rename Modal Elements
const renameModal = document.getElementById("rename-modal");
const renameInput = document.getElementById("rename-input");
const renameExtension = document.getElementById("rename-extension");
const btnCancelRename = document.getElementById("btn-cancel-rename");
const btnSaveRename = document.getElementById("btn-save-rename");

// App State
let directoryHandle = null;
let renameContext = {
  fileHandle: null,
  originalName: "",
  originalExtension: "",
};
let worker = null;

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  // Remove the toast after the animation completes
  setTimeout(() => {
    toast.remove();
  }, 5000);
}

// --- IndexedDB for Persistence ---
const dbName = "PhotoReelDB";
const storeName = "DirectoryHandles";
let db;

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onerror = (e) => reject("Error opening DB: " + e.target.errorCode);
    request.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: "id" });
      }
    };
  });
}

async function saveDirectoryHandle(handle) {
  if (!db) return;
  const transaction = db.transaction(storeName, "readwrite");
  const store = transaction.objectStore(storeName);
  store.put({ id: "lastHandle", handle: handle });
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = (e) =>
      reject("Error saving handle: " + e.target.error);
  });
}

async function getDirectoryHandle() {
  if (!db) return null;
  const transaction = db.transaction(storeName, "readonly");
  const store = transaction.objectStore(storeName);
  const request = store.get("lastHandle");
  return new Promise((resolve) => {
    request.onsuccess = (e) => {
      resolve(e.target.result ? e.target.result.handle : null);
    };
    request.onerror = () => resolve(null);
  });
}

// --- Core Application Functions ---

async function init() {
  await openDb();
  directoryHandle = await getDirectoryHandle();

  if (directoryHandle) {
    if (await verifyPermission(directoryHandle)) {
      console.log("Restored directory handle and permission is granted.");
      startApp();
    } else {
      console.log(
        "Permission for stored handle was revoked. Displaying welcome screen."
      );
      directoryHandle = null;
      showWelcomeScreen();
    }
  } else {
    showWelcomeScreen();
  }
}

function showWelcomeScreen() {
  gallery.innerHTML = "";
  const main = document.querySelector("main");
  main.appendChild(welcomeScreen);
  welcomeScreen.style.display = "flex";
  folderNameEl.textContent = "No folder selected";
  btnChangeFolder.style.display = "none";
}

function startApp() {
  if (!directoryHandle) return;
  welcomeScreen.style.display = "none";
  folderNameEl.textContent = `Folder: ${directoryHandle.name}`;
  btnChangeFolder.style.display = "block";
  renderGallery();
  startBackgroundPolling();
}

async function selectExistingFolder() {
  try {
    const handle = await window.showDirectoryPicker();
    directoryHandle = handle;
    await saveDirectoryHandle(handle);
    startApp();
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Error selecting folder:", err);
      showToast("Could not select folder.", "error");
    }
  }
}

async function createDemoAlbum() {
  try {
    const parentHandle = await window.showDirectoryPicker();
    if (!parentHandle) return;

    directoryHandle = await parentHandle.getDirectoryHandle("Car Demo Album", {
      create: true,
    });

    gallery.innerHTML = "<p>Creating demo album and downloading images...</p>";
    startApp();

    await saveDemoImage(
      "sports-car.jpg",
      "https://images.unsplash.com/photo-1542362567-b07e54358753?w=800"
    );
    await saveDemoImage(
      "classic-car.jpg",
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800"
    );
    await saveDemoImage(
      "modern-car.jpg",
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800"
    );

    await saveDirectoryHandle(directoryHandle);
    await renderGallery();
    showToast("Demo album created successfully!", "success");
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Error creating demo album:", err);
      showToast("Could not create the demo album.", "error");
    }
  }
}

async function saveDemoImage(fileName, url) {
  if (!directoryHandle) return;
  try {
    const fileHandle = await directoryHandle.getFileHandle(fileName, {
      create: true,
    });
    const writable = await fileHandle.createWritable();

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    await response.body.pipeTo(writable);
    console.log(`Saved ${fileName}`);
  } catch (err) {
    console.error(`Failed to save demo image ${fileName}:`, err);
    showToast(`Failed to download ${fileName}`, "error");
  }
}

async function renderGallery() {
  if (!directoryHandle) return;
  gallery.innerHTML = "";

  const imageFiles = [];
  for await (const entry of directoryHandle.values()) {
    if (
      entry.kind === "file" &&
      entry.name.match(/\.(jpg|jpeg|png|webp|gif)$/i)
    ) {
      imageFiles.push(entry);
    }
  }

  imageFiles.sort((a, b) => a.name.localeCompare(b.name));

  if (imageFiles.length === 0 && welcomeScreen.style.display === "none") {
    gallery.innerHTML =
      '<p style="color: var(--subtle-text-color);">No images found in this folder.</p>';
  } else {
    imageFiles.forEach(createThumbnail);
  }
}

async function createThumbnail(fileHandle) {
  const file = await fileHandle.getFile();
  const imageURL = URL.createObjectURL(file);

  const thumbDiv = document.createElement("div");
  thumbDiv.className = "thumbnail";

  const img = document.createElement("img");
  img.src = imageURL;
  img.alt = fileHandle.name;
  img.onload = () => URL.revokeObjectURL(img.src);

  const infoDiv = document.createElement("div");
  infoDiv.className = "info";

  const filenameP = document.createElement("p");
  filenameP.className = "filename";
  filenameP.textContent = fileHandle.name;

  const renameBtn = document.createElement("button");
  renameBtn.className = "rename-btn";
  renameBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708l-3-3zm-1.543 1.543-9.5 9.5-2.5 1a.5.5 0 0 0 .565.565l1-2.5 9.5-9.5-3.207-3.207z"/>
        </svg>`;
  renameBtn.onclick = (e) => {
    e.stopPropagation();
    openRenameModal(fileHandle);
  };

  infoDiv.appendChild(filenameP);
  thumbDiv.append(img, infoDiv, renameBtn);
  gallery.appendChild(thumbDiv);
}

function openRenameModal(fileHandle) {
  const nameParts = fileHandle.name.split(".");
  if (nameParts.length > 1) {
    renameContext.originalExtension = nameParts.pop();
    renameContext.originalName = nameParts.join(".");
  } else {
    renameContext.originalName = fileHandle.name;
    renameContext.originalExtension = "";
  }
  renameContext.fileHandle = fileHandle;

  renameInput.value = renameContext.originalName;
  renameExtension.textContent = renameContext.originalExtension
    ? `.${renameContext.originalExtension}`
    : "";
  renameModal.classList.add("visible");
  renameInput.focus();
}

function closeRenameModal() {
  renameModal.classList.remove("visible");
}

async function saveRename() {
  const newBaseName = renameInput.value.trim();
  if (!newBaseName || newBaseName === renameContext.originalName) {
    closeRenameModal();
    return;
  }

  const newName = renameContext.originalExtension
    ? `${newBaseName}.${renameContext.originalExtension}`
    : newBaseName;

  try {
    // 1. Get content of the old file
    const oldFile = await renameContext.fileHandle.getFile();

    // 2. Create a new file with the new name
    const newFileHandle = await directoryHandle.getFileHandle(newName, {
      create: true,
    });

    // 3. Write old content to the new file
    const writable = await newFileHandle.createWritable();
    await writable.write(oldFile);
    await writable.close();

    // 4. Remove the old file
    await directoryHandle.removeEntry(renameContext.fileHandle.name);

    console.log(`Renamed ${renameContext.fileHandle.name} to ${newName}`);
    showToast("File renamed successfully!", "success");
    closeRenameModal();
    renderGallery();
  } catch (err) {
    showToast(`Error renaming file: ${err.message}`, "error");
    console.error(err);
  }
}

function startBackgroundPolling() {
  if (worker) {
    worker.terminate();
  }

  const workerCode = `
        let directoryHandle = null;
        let knownFiles = new Set();
        let intervalId = null;

        async function scanDirectory() {
            if (!directoryHandle) return;
            const newFiles = new Set();
            let hasChanges = false;
            
            try {
                for await (const entry of directoryHandle.values()) {
                    if (entry.kind === 'file' && entry.name.match(/\\.(jpg|jpeg|png|webp|gif)$/i)) {
                        newFiles.add(entry.name);
                    }
                }

                if (newFiles.size !== knownFiles.size) {
                    hasChanges = true;
                } else {
                    for(const file of knownFiles) {
                       if(!newFiles.has(file)) {
                           hasChanges = true;
                           break;
                       }
                    }
                }

                if (hasChanges) {
                    self.postMessage({ type: 'changes-detected' });
                    knownFiles = newFiles;
                }
            } catch(e) {
               console.error("Worker error scanning directory:", e);
               self.postMessage({ type: 'permission-error' });
               clearInterval(intervalId);
            }
        }

        self.onmessage = (e) => {
            if (e.data.type === 'start') {
                directoryHandle = e.data.handle;
                knownFiles = new Set(e.data.initialFiles);
                if (intervalId) clearInterval(intervalId);
                intervalId = setInterval(scanDirectory, 3000);
            } else if (e.data.type === 'stop') {
                if(intervalId) clearInterval(intervalId);
                intervalId = null;
            }
        };
    `;
  const workerBlob = new Blob([workerCode], { type: "application/javascript" });
  worker = new Worker(URL.createObjectURL(workerBlob));

  worker.onmessage = (e) => {
    console.log("Worker message:", e.data);
    if (e.data.type === "changes-detected") {
      showToast("New photos detected! Refreshing gallery.", "info");
      renderGallery();
    } else if (e.data.type === "permission-error") {
      showToast("Lost permission to access the folder.", "error");
      directoryHandle = null;
      showWelcomeScreen();
    }
  };

  (async () => {
    const initialFiles = [];
    for await (const entry of directoryHandle.values()) {
      if (
        entry.kind === "file" &&
        entry.name.match(/\\.(jpg|jpeg|png|webp|gif)$/i)
      ) {
        initialFiles.push(entry.name);
      }
    }
    worker.postMessage({
      type: "start",
      handle: directoryHandle,
      initialFiles: initialFiles,
    });
  })();
}

async function verifyPermission(handle) {
  const options = { mode: "readwrite" };
  if ((await handle.queryPermission(options)) === "granted") {
    return true;
  }
  if ((await handle.requestPermission(options)) === "granted") {
    return true;
  }
  return false;
}

// Event Listeners
btnSelectFolder.addEventListener("click", selectExistingFolder);
btnChangeFolder.addEventListener("click", selectExistingFolder);
btnCreateDemo.addEventListener("click", createDemoAlbum);
btnSaveRename.addEventListener("click", saveRename);
btnCancelRename.addEventListener("click", closeRenameModal);

renameModal.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    saveRename();
  } else if (e.key === "Escape") {
    closeRenameModal();
  }
});

init();
