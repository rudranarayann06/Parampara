(() => {
  const API_BASE = window.PARAMPARA_API_BASE || "https://parampara-backend-8yt9.onrender.com";
  const offline = () => !navigator.onLine;
  let syncing = false;

  function ensureStatusUI() {
    if (document.getElementById("paramparaNetworkStatus")) return;
    const el = document.createElement("div");
    el.id = "paramparaNetworkStatus";
    el.className = "parampara-network-status online";
    el.innerHTML = '<span class="status-dot"></span><span class="status-label">Online</span><button type="button" class="status-sync" hidden>Sync</button>';
    document.body.appendChild(el);
    el.querySelector(".status-sync").addEventListener("click", syncQueue);
  }

  async function updateStatus() {
    ensureStatusUI();
    const el = document.getElementById("paramparaNetworkStatus");
    const label = el.querySelector(".status-label");
    const button = el.querySelector(".status-sync");
    const pending = await window.ParamparaOffline.countPending().catch(() => 0);
    if (offline()) {
      el.className = "parampara-network-status offline";
      label.textContent = pending ? `Offline · ${pending} waiting` : "Offline Mode";
      button.hidden = true;
    } else {
      el.className = "parampara-network-status online";
      label.textContent = pending ? `Online · ${pending} waiting` : "Online";
      button.hidden = pending === 0;
    }
  }

  function formToRecord(form, audioFile) {
    const get = id => form.querySelector(`#${id}`)?.value?.trim() || "";
    const checked = id => !!form.querySelector(`#${id}`)?.checked;
    return {
      localId: crypto.randomUUID(), createdAt: new Date().toISOString(), status: "PENDING",
      audioFile, audioName: audioFile.name, audioType: audioFile.type || "audio/webm",
      audioHash: null,
      metadata: {
        title: get("storyTitle"), description: get("storyDescription"), state: get("state"), district: get("district"), location: get("location"),
        language: get("language"), community: get("community"), category: get("traditionCategory"), access_level: get("accessLevel") || "PRIVATE",
        archive_allowed: checked("archiveAllowed"), transcription_allowed: checked("transcriptionAllowed"), translation_allowed: checked("translationAllowed"),
        research_allowed: checked("researchAllowed"), public_access_allowed: get("accessLevel") === "PUBLIC", commercial_use_allowed: false,
        ai_processing_allowed: checked("aiProcessingAllowed"), ai_training_allowed: false, consent_method: "Digital Consent"
      }
    };
  }

  async function saveOffline(form, audioFile) {
    const item = formToRecord(form, audioFile);
    item.audioHash = await window.ParamparaOffline.sha256(audioFile);
    const duplicate = (await window.ParamparaOffline.all()).find(x => x.audioHash === item.audioHash && x.status !== "FAILED");
    if (duplicate) return { duplicate: true, item: duplicate };
    await window.ParamparaOffline.put(item);
    await window.ParamparaRegisterBackgroundSync?.();
    await updateStatus();
    return { duplicate: false, item };
  }

  function toFormData(item) {
    const fd = new FormData();
    Object.entries(item.metadata).forEach(([k, v]) => fd.append(k, String(v)));
    fd.append("audio", item.audioFile, item.audioName);
    return fd;
  }

  async function syncItem(item) {
    item.status = "UPLOADING";
    item.lastAttemptAt = new Date().toISOString();
    item.attempts = (item.attempts || 0) + 1;
    await window.ParamparaOffline.put(item);
    try {
      const response = await fetch(`${API_BASE}/api/recordings`, { method: "POST", body: toFormData(item) });
      const text = await response.text();
      let result = {}; try { result = text ? JSON.parse(text) : {}; } catch (_) {}
      if (response.ok) {
        item.status = "SYNCED"; item.serverRecordingId = result.recording?.id || result.recording_id || null; item.syncedAt = new Date().toISOString(); item.error = null;
        await window.ParamparaOffline.put(item);
        return { ok: true, item };
      }
      if (response.status === 409) {
        item.status = "SYNCED"; item.serverRecordingId = result.recording_id || null; item.error = "Duplicate prevented on server.";
        await window.ParamparaOffline.put(item);
        return { ok: true, duplicate: true, item };
      }
      throw new Error(result.error?.message || result.error || `HTTP ${response.status}`);
    } catch (error) {
      item.status = "FAILED"; item.error = error.message; await window.ParamparaOffline.put(item); return { ok: false, item, error };
    }
  }

  async function syncQueue() {
    if (syncing || offline()) return { synced: 0, failed: 0 };
    syncing = true;
    let synced = 0, failed = 0;
    try {
      const items = (await window.ParamparaOffline.all()).filter(x => x.status !== "SYNCED");
      for (const item of items) {
        if (offline()) break;
        const result = await syncItem(item);
        result.ok ? synced++ : failed++;
      }
      await updateStatus();
      window.dispatchEvent(new CustomEvent("parampara:sync", { detail: { synced, failed } }));
      return { synced, failed };
    } finally { syncing = false; }
  }

  async function registerSW() {
    if (!("serviceWorker" in navigator)) return;
    try { const reg = await navigator.serviceWorker.register("./service-worker.js", { scope: "./" }); const send = () => reg.active?.postMessage({type:"SET_API_BASE", value:API_BASE}); send(); navigator.serviceWorker.ready.then(send); } catch (e) { console.warn("PARAMPARA service worker registration failed", e); }
  }

  window.ParamparaPWA = { saveOffline, syncQueue, updateStatus, offline };
  window.addEventListener("online", () => { updateStatus(); syncQueue(); });
  window.addEventListener("offline", updateStatus);
  window.addEventListener("DOMContentLoaded", async () => { ensureStatusUI(); await registerSW(); await updateStatus(); if (!offline()) syncQueue(); });
  navigator.serviceWorker?.addEventListener("message", event => { if (event.data?.type === "PARAMPARA_SYNC_COMPLETE") { updateStatus(); window.dispatchEvent(new CustomEvent("parampara:sync")); } });
  window.ParamparaRegisterBackgroundSync = async () => { try { const reg = await navigator.serviceWorker.ready; if (reg.sync) await reg.sync.register("parampara-sync"); } catch (_) {} };
})();
