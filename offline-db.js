/* PARAMPARA offline persistence layer. IndexedDB is the source of truth while offline. */
(() => {
  const DB_NAME = "parampara-offline-v2";
  const VERSION = 1;
  const QUEUE = "syncQueue";
  const SETTINGS = "settings";

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(QUEUE)) {
          const store = db.createObjectStore(QUEUE, { keyPath: "localId" });
          store.createIndex("status", "status", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
          store.createIndex("audioHash", "audioHash", { unique: false });
        }
        if (!db.objectStoreNames.contains(SETTINGS)) db.createObjectStore(SETTINGS, { keyPath: "key" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function tx(storeName, mode, operation) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      let result;
      try { result = operation(store); } catch (e) { reject(e); return; }
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted"));
    });
  }

  async function put(item) { return tx(QUEUE, "readwrite", s => s.put(item)); }
  async function remove(localId) { return tx(QUEUE, "readwrite", s => s.delete(localId)); }
  async function get(localId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction(QUEUE).objectStore(QUEUE).get(localId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }
  async function all() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction(QUEUE).objectStore(QUEUE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }
  async function countPending() {
    const items = await all();
    return items.filter(x => x.status !== "SYNCED").length;
  }
  async function setSetting(key, value) { return tx(SETTINGS, "readwrite", s => s.put({ key, value })); }
  async function getSetting(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction(SETTINGS).objectStore(SETTINGS).get(key);
      req.onsuccess = () => resolve(req.result?.value ?? null);
      req.onerror = () => reject(req.error);
    });
  }

  async function sha256(blob) {
    const buffer = await blob.arrayBuffer();
    const hash = await crypto.subtle.digest("SHA-256", buffer);
    return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
  }

  window.ParamparaOffline = { openDB, put, remove, get, all, countPending, setSetting, getSetting, sha256 };
})();
