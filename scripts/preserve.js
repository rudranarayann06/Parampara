import { auth } from "../firebase-config.js";

const API_BASE = window.PARAMPARA_API_BASE || "https://parampara-backend-8yt9.onrender.com";

const esc = value => String(value ?? "").replace(/[&<>\"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));

async function authHeaders() {
  const headers = {};
  const user = auth.currentUser;
  if (user) {
    try { headers.Authorization = `Bearer ${await user.getIdToken(false)}`; } catch (_) {}
  }
  return headers;
}

function notify(message, type = "") {
  let el = document.getElementById("paramparaFormNotice");
  if (!el) {
    el = document.createElement("div"); el.id = "paramparaFormNotice"; el.className = "offline-contribution-panel";
    document.querySelector("#preserveForm")?.prepend(el);
  }
  el.innerHTML = `<strong>${esc(message)}</strong>`;
  el.dataset.type = type;
}

function ensureConsentControls() {
  const section = document.querySelector(".consent-form-section");
  if (!section || document.getElementById("paramparaGranularConsent")) return;
  const wrap = document.createElement("div");
  wrap.id = "paramparaGranularConsent";
  wrap.className = "parampara-granular-consent";
  wrap.innerHTML = `
    <div class="consent-notice" style="margin-top:18px"><i class="fa-solid fa-link"></i><div><strong>Processing permissions</strong><p>These permissions are stored with the record and are checked by the AI pipeline.</p></div></div>
    <label class="consent-check"><input type="checkbox" id="archiveAllowed" checked><span class="custom-check"></span><span class="consent-text">Archive this original testimony.</span></label>
    <label class="consent-check"><input type="checkbox" id="transcriptionAllowed" checked><span class="custom-check"></span><span class="consent-text">Allow AI-assisted transcription.</span></label>
    <label class="consent-check"><input type="checkbox" id="translationAllowed" checked><span class="custom-check"></span><span class="consent-text">Allow AI-assisted translation.</span></label>
    <label class="consent-check"><input type="checkbox" id="researchAllowed" checked><span class="custom-check"></span><span class="consent-text">Allow researchers to discover this record and its themes.</span></label>
    <label class="consent-check"><input type="checkbox" id="aiProcessingAllowed" checked><span class="custom-check"></span><span class="consent-text">Allow AI processing only for the purposes selected above. AI training is never enabled by default.</span></label>`;
  section.appendChild(wrap);
}

function ensureOfflinePanel(form) {
  if (document.getElementById("offlineContributionPanel")) return;
  const panel = document.createElement("section");
  panel.id = "offlineContributionPanel";
  panel.className = "offline-contribution-panel";
  panel.innerHTML = `
    <div class="offline-head"><div><span class="offline-badge"><i class="fa-solid fa-cloud-arrow-down"></i> Offline-first contribution</span><h3>Record even without internet.</h3><p>Your audio, metadata and consent stay on this device until PARAMPARA can sync them.</p></div></div>
    <div class="offline-actions">
      <button type="button" class="offline-action primary" id="startLocalRecord"><i class="fa-solid fa-microphone"></i> Record locally</button>
      <button type="button" class="offline-action" id="stopLocalRecord" disabled><i class="fa-solid fa-stop"></i> Stop recording</button>
      <button type="button" class="offline-action" id="syncNow"><i class="fa-solid fa-rotate"></i> Sync now</button>
    </div>
    <div id="offlineRecorderStatus" class="offline-rec-status">Ready. Offline recording is stored in IndexedDB.</div>
    <div id="offlineQueue" class="offline-queue"></div>`;
  form.parentElement?.insertBefore(panel, form);

  const start = panel.querySelector("#startLocalRecord");
  const stop = panel.querySelector("#stopLocalRecord");
  let recorder = null; let chunks = []; let stream = null;
  start.addEventListener("click", async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg"].find(MediaRecorder.isTypeSupported) || "";
      recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunks = [];
      recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      recorder.onstart = () => { start.disabled = true; stop.disabled = false; panel.querySelector("#offlineRecorderStatus").textContent = "Recording locally…"; };
      recorder.onstop = async () => {
        stream?.getTracks().forEach(t => t.stop()); stream = null;
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        const ext = blob.type.includes("ogg") ? "ogg" : "webm";
        const file = new File([blob], `parampara-${Date.now()}.${ext}`, { type: blob.type });
        const input = document.getElementById("audioUpload");
        const dt = new DataTransfer(); dt.items.add(file); if (input) input.files = dt.files;
        const label = document.getElementById("audioName"); if (label) label.textContent = `✓ ${file.name} (local recording)`;
        panel.querySelector("#offlineRecorderStatus").textContent = "Recording captured. Submit the form to save it offline or sync it online.";
        start.disabled = false; stop.disabled = true;
      };
      recorder.start(250);
    } catch (error) { panel.querySelector("#offlineRecorderStatus").textContent = `Microphone unavailable: ${error.message}`; }
  });
  stop.addEventListener("click", () => recorder?.state === "recording" && recorder.stop());
  panel.querySelector("#syncNow").addEventListener("click", async () => {
    const button = panel.querySelector("#syncNow");
    const status = panel.querySelector("#offlineRecorderStatus");
    if (!window.ParamparaPWA) return;
    button.disabled = true;
    const original = button.innerHTML;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing…';
    if (status) status.textContent = navigator.onLine ? "Trying to synchronize queued records…" : "You are offline. Connect to the internet and try again.";
    try {
      const result = await window.ParamparaPWA.syncQueue();
      if (status) {
        status.textContent = result.failed
          ? `Sync finished: ${result.synced} synchronized, ${result.failed} still waiting. Check the queue for the server error.`
          : `✓ Sync finished: ${result.synced} record(s) synchronized.`;
      }
      await renderOfflineQueue();
    } finally {
      button.disabled = false;
      button.innerHTML = original;
    }
  });
}

async function renderOfflineQueue() {
  const box = document.getElementById("offlineQueue");
  if (!box || !window.ParamparaOffline) return;
  const items = await window.ParamparaOffline.all();
  if (!items.length) { box.innerHTML = `<small>No pending local records.</small>`; return; }
  box.innerHTML = items.slice().sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(item => {
    const state = item.status === "SYNCED" ? "synced" : item.status === "FAILED" ? "failed" : "waiting";
    const label = item.status === "SYNCED" ? "✓ Synchronized" : item.status === "FAILED" ? `Retry: ${esc(item.error || "failed")}` : "🟠 Waiting for sync";
    return `<div class="offline-item"><div><strong>${esc(item.metadata.title || item.audioName)}</strong><br><small>${esc(item.metadata.language || "Unknown language")} · ${new Date(item.createdAt).toLocaleString()}</small></div><span class="${state}">${label}</span></div>`;
  }).join("");
}

async function submitOnline(form, audio) {
  const fd = new FormData();
  const get = id => document.getElementById(id)?.value?.trim() || "";
  const checked = id => !!document.getElementById(id)?.checked;
  const access = get("accessLevel") || "PRIVATE";
  const fields = {
    title: get("storyTitle"), description: get("storyDescription"), state: get("state"), district: get("district"), location: get("location"), language: get("language"),
    community: get("community"), category: get("traditionCategory"), access_level: access,
    archive_allowed: checked("archiveAllowed"), transcription_allowed: checked("transcriptionAllowed"), translation_allowed: checked("translationAllowed"),
    research_allowed: checked("researchAllowed"), public_access_allowed: access === "PUBLIC", commercial_use_allowed: false, ai_processing_allowed: checked("aiProcessingAllowed"), ai_training_allowed: false,
  };
  Object.entries(fields).forEach(([k,v]) => fd.append(k, String(v)));
  fd.append("audio", audio, audio.name);
  let response = await fetch(`${API_BASE}/api/recordings`, { method: "POST", headers: await authHeaders(), body: fd });
  if (response.status === 401 && auth.currentUser) {
    const headers = { Authorization: `Bearer ${await auth.currentUser.getIdToken(true)}` };
    response = await fetch(`${API_BASE}/api/recordings`, { method: "POST", headers, body: fd });
  }
  const text = await response.text(); let result = {}; try { result = text ? JSON.parse(text) : {}; } catch (_) {}
  if (!response.ok) throw new Error(result.error?.message || result.error || `Server returned HTTP ${response.status}`);
  return result;
}

async function handleSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const audio = document.getElementById("audioUpload")?.files?.[0];
  if (!audio) { notify("Attach an audio recording or use Record locally.", "error"); return; }
  if (!document.getElementById("consentDeclaration")?.checked || !document.getElementById("accuracyDeclaration")?.checked) { notify("Please complete the required consent declarations.", "error"); return; }
  const button = document.getElementById("preserveStory"); if (button) { button.disabled = true; button.dataset.original = button.innerHTML; button.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Preserving…`; }
  try {
    if (!navigator.onLine) {
      const saved = await window.ParamparaPWA.saveOffline(form, audio);
      if (saved.duplicate) notify("This audio is already waiting in the offline queue.", "error");
      else notify("✓ Saved to this device. It will sync automatically when internet returns.", "success");
    } else {
      try {
        const result = await submitOnline(form, audio);
        notify(`✓ Preserved successfully. Record ${result.recording?.id ? `#${result.recording.id}` : "created"} is now awaiting verification.`, "success");
      } catch (networkError) {
        const saved = await window.ParamparaPWA.saveOffline(form, audio);
        notify(saved.duplicate ? "This source already exists in the local queue." : "Backend unavailable. Saved safely to this device; sync will retry automatically.", "success");
      }
    }
    await renderOfflineQueue();
  } catch (error) { console.error(error); notify(error.message || "Could not preserve this recording.", "error"); }
  finally { if (button) { button.disabled = false; button.innerHTML = button.dataset.original || "Submit for Verification"; } }
}

function setupPreviews() {
  const title = document.getElementById("storyTitle"), desc = document.getElementById("storyDescription"), lang = document.getElementById("language"), cat = document.getElementById("traditionCategory");
  const bind = (input, target, fallback) => input?.addEventListener("input", () => { if (target) target.textContent = input.value.trim() || fallback; });
  bind(title, document.getElementById("previewTitle"), "Your story title"); bind(desc, document.getElementById("previewDescription"), "A memory worth preserving."); bind(lang, document.getElementById("previewLanguage"), "Language");
  cat?.addEventListener("change", () => { const o = cat.options[cat.selectedIndex]; const t = document.getElementById("previewCategory"); if (t) t.textContent = o?.textContent?.toUpperCase() || "HERITAGE STORY"; });
}

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("preserveForm"); if (!form) return;
  ensureConsentControls(); ensureOfflinePanel(form); setupPreviews();
  form.addEventListener("submit", handleSubmit);
  const audioInput = document.getElementById("audioUpload");
  audioInput?.addEventListener("change", () => { const label = document.getElementById("audioName"); if (label && audioInput.files[0]) label.textContent = `✓ ${audioInput.files[0].name}`; });
  window.addEventListener("parampara:sync", renderOfflineQueue);
  await renderOfflineQueue();
});
