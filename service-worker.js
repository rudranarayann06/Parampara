const CACHE = "parampara-shell-v4";
let API_BASE = "https://parampara-backend-8yt9.onrender.com";
const SHELL = ["./", "./index.html", "./preserve.html", "./explore.html", "./about.html", "./contribute.html", "./login.html", "./passport.html", "./research.html", "./style_index.css", "./pwa.css", "./offline-db.js", "./pwa.js", "./scripts/preserve.js", "./scripts/script_explore.js", "./scripts/config.js", "./scripts/live-stats.js", "./i18n.js", "./assets/logo.png"];
self.addEventListener("install", event => { event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting())); });
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", event => {
  const req = event.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(response => {
    if (response.ok && ["document","script","style","image"].includes(req.destination)) caches.open(CACHE).then(c => c.put(req, response.clone()));
    return response;
  }).catch(() => req.mode === "navigate" ? caches.match("./index.html") : Promise.reject(new Error("offline")))));
});

function openDB() { return new Promise((resolve, reject) => { const r = indexedDB.open("parampara-offline-v2", 1); r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error); }); }
function getItems() { return openDB().then(db => new Promise((resolve,reject)=>{const r=db.transaction("syncQueue").objectStore("syncQueue").getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error)})); }
function putItem(item) { return openDB().then(db=>new Promise((resolve,reject)=>{const t=db.transaction("syncQueue","readwrite");t.objectStore("syncQueue").put(item);t.oncomplete=resolve;t.onerror=()=>reject(t.error)})); }
async function backgroundSync() {
  if (!self.navigator?.onLine) return;
  const items = (await getItems()).filter(x => x.status !== "SYNCED");
  for (const item of items) {
    try {
      const fd = new FormData();
      Object.entries(item.metadata || {}).forEach(([k,v]) => fd.append(k, String(v)));
      fd.append("audio", item.audioFile, item.audioName);
      const response = await fetch(`${API_BASE}/api/recordings`, {method:"POST", body:fd});
      const text = await response.text(); let result={}; try{result=text?JSON.parse(text):{}}catch(_){ }
      if (response.ok || response.status === 409) { item.status="SYNCED"; item.serverRecordingId=result.recording_id || result.recording?.id || null; item.syncedAt=new Date().toISOString(); item.error=null; }
      else { item.status="FAILED"; item.error=result.error || `HTTP ${response.status}`; }
      await putItem(item);
    } catch(e) { item.status="FAILED"; item.error=e.message; await putItem(item); }
  }
  const clients = await self.clients.matchAll({includeUncontrolled:true}); clients.forEach(c => c.postMessage({type:"PARAMPARA_SYNC_COMPLETE"}));
}
self.addEventListener("message", event => { if (event.data?.type === "SET_API_BASE" && typeof event.data.value === "string") API_BASE = event.data.value.replace(/\/$/, ""); });
self.addEventListener("sync", event => { if (event.tag === "parampara-sync") event.waitUntil(backgroundSync()); });
