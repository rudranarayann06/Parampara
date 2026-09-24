const CACHE = "parampara-shell-v5";
let API_BASE = "https://parampara-backend-8yt9.onrender.com";
const SHELL = [
  "./", "./index.html", "./preserve.html", "./explore.html", "./about.html",
  "./contribute.html", "./login.html", "./dashboard.html", "./reviewer.html",
  "./passport.html", "./research.html", "./style_index.css", "./pwa.css",
  "./offline-db.js", "./pwa.js", "./scripts/preserve.js", "./scripts/reviewer.js",
  "./scripts/script_explore.js", "./scripts/config.js", "./scripts/live-stats.js",
  "./i18n.js", "./assets/logo.png", "./manifest.webmanifest"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL).catch(error => {
        console.warn("PARAMPARA shell precache skipped some files:", error);
      }))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        if (!response || !response.ok) return response;

        // Clone immediately. Waiting until a later promise callback to clone a
        // response can fail because the browser may already have locked its body.
        if (["document", "script", "style", "image", "manifest"].includes(request.destination)) {
          const cacheCopy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, cacheCopy)).catch(() => {});
        }
        return response;
      }).catch(() => {
        if (request.mode === "navigate") return caches.match("./index.html");
        return new Response("Offline", { status: 503, statusText: "Offline" });
      });
    })
  );
});

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("parampara-offline-v2", 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getItems() {
  return openDB().then(db => new Promise((resolve, reject) => {
    const request = db.transaction("syncQueue").objectStore("syncQueue").getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  }));
}

function putItem(item) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const transaction = db.transaction("syncQueue", "readwrite");
    transaction.objectStore("syncQueue").put(item);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  }));
}

async function backgroundSync() {
  const items = (await getItems()).filter(item => item.status !== "SYNCED");
  for (const item of items) {
    try {
      const formData = new FormData();
      Object.entries(item.metadata || {}).forEach(([key, value]) => formData.append(key, String(value)));
      formData.append("audio", item.audioFile, item.audioName);

      const response = await fetch(`${API_BASE}/api/recordings`, { method: "POST", body: formData });
      const text = await response.text();
      let result = {};
      try { result = text ? JSON.parse(text) : {}; } catch (_) {}

      if (response.ok || response.status === 409) {
        item.status = "SYNCED";
        item.serverRecordingId = result.recording_id || result.recording?.id || null;
        item.syncedAt = new Date().toISOString();
        item.error = null;
      } else {
        item.status = "FAILED";
        item.error = result.error?.message || result.error || `HTTP ${response.status}`;
      }
      await putItem(item);
    } catch (error) {
      item.status = "FAILED";
      item.error = error.message || "Sync failed";
      await putItem(item);
    }
  }

  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach(client => client.postMessage({ type: "PARAMPARA_SYNC_COMPLETE" }));
}

self.addEventListener("message", event => {
  if (event.data?.type === "SET_API_BASE" && typeof event.data.value === "string") {
    API_BASE = event.data.value.replace(/\/$/, "");
  }
});

self.addEventListener("sync", event => {
  if (event.tag === "parampara-sync") event.waitUntil(backgroundSync());
});
