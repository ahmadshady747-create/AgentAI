// OpenCode Sovereign — Claude Code / Codex Aesthetic Client
// Universal OpenAI-Compatible Engine (Dynamic Connections, Fetch & Pin Models)
// Zero reliance on default/internal OpenCode servers.

const invoke = window.__TAURI__?.core?.invoke || window.__TAURI__?.invoke || null;
const listen = window.__TAURI__?.event?.listen || null;

// --- QUICK PRESETS DEFINITIONS ---
const PRESETS = {
  groq: {
    name: "Groq Cloud",
    url: "https://api.groq.com/openai/v1",
    portal: "https://console.groq.com/keys",
    hint: "أسرع معالجة LPU في العالم مع باقة مجانية كريمة تكفي لآلاف الرسائل اليومية.",
    defaultModels: []
  },
  gemini: {
    name: "Google Gemini",
    url: "https://generativelanguage.googleapis.com/v1beta/openai",
    portal: "https://aistudio.google.com/app/apikey",
    hint: "نماذج Google Gemini 1.5 & 2.0 مجانية 100% مع نافذة سياق تصل لمليوني توكن.",
    defaultModels: []
  },
  nvidia: {
    name: "NVIDIA NIM",
    url: "https://integrate.api.nvidia.com/v1",
    portal: "https://build.nvidia.com/",
    hint: "رصيد 1,000 نقطة لتشغيل نماذج DeepSeek R1 و Llama 3.3 المستضافة على إنفيديا.",
    defaultModels: []
  },
  openrouter: {
    name: "OpenRouter",
    url: "https://openrouter.ai/api/v1",
    portal: "https://openrouter.ai/keys",
    hint: "بوابة عالمية موحدة لمئات النماذج المفتوحة والمجانية.",
    defaultModels: []
  },
  openai: {
    name: "OpenAI Official",
    url: "https://api.openai.com/v1",
    portal: "https://platform.openai.com/api-keys",
    hint: "الوصول المباشر لنماذج GPT-4o و o3-mini الرسمية.",
    defaultModels: []
  },
  custom: {
    name: "",
    url: "",
    portal: "",
    hint: "أدخل أي رابط لنقطة نهاية متوافقة مع OpenAI (سحابية أو محلية مثل Ollama/vLLM).",
    defaultModels: []
  }
};

// State
let apiConnections = [];
let activeConnectionId = null;
let activeModelId = null;
let isStreaming = false;
let latestDiffCard = null;
let currentStreamBuffer = "";
let mcpServers = [];
let skillsList = [];

// Conversation History
const conversationHistory = [
  {
    role: "system",
    content: "You are OpenCode Sovereign AI, built on Tauri v2 and LOCUS AST engine. You strictly answer queries with calm, linear, helpful clarity in Arabic or English based on the user's prompt. You provide clean code blocks when required."
  }
];

// DOM Elements
const streamViewport = document.getElementById("streamViewport");
const streamMessages = document.getElementById("streamMessages");
const promptInput = document.getElementById("promptInput");
const sendBtn = document.getElementById("sendBtn");
const welcomeBanner = document.getElementById("welcomeBanner");

// Top Status Bar
const activeModelPill = document.getElementById("activeModelPill");
const activeProviderDot = document.getElementById("activeProviderDot");
const activeProviderTag = document.getElementById("activeProviderTag");
const activeModelTitle = document.getElementById("activeModelTitle");
const modelDropdownMenu = document.getElementById("modelDropdownMenu");
const modelDropdownGroups = document.getElementById("modelDropdownGroups");
const openVaultFromDropdown = document.getElementById("openVaultFromDropdown");
const openDrawerBtn = document.getElementById("openDrawerBtn");
const drawerKeyIndicator = document.getElementById("drawerKeyIndicator");

// Drawer & Sheets
const drawerOverlay = document.getElementById("drawerOverlay");
const drawerSheet = document.getElementById("drawerSheet");
const closeDrawerBtn = document.getElementById("closeDrawerBtn");

// Universal API Vault Tab
const connectionsList = document.getElementById("connectionsList");
const emptyConnectionsState = document.getElementById("emptyConnectionsState");
const openAddConnectionBtn = document.getElementById("openAddConnectionBtn");
const emptyAddConnBtn = document.getElementById("emptyAddConnBtn");

// Connection Modal
const connectionModal = document.getElementById("connectionModal");
const closeConnectionModal = document.getElementById("closeConnectionModal");
const connModalId = document.getElementById("connModalId");
const connModalTitle = document.getElementById("connectionModalTitle");
const connNameInput = document.getElementById("connNameInput");
const connBaseUrlInput = document.getElementById("connBaseUrlInput");
const connKeyInput = document.getElementById("connKeyInput");
const connPortalHint = document.getElementById("connPortalHint");
const toggleKeyVisibility = document.getElementById("toggleKeyVisibility");
const fetchModelsBtn = document.getElementById("fetchModelsBtn");
const discoveryStatus = document.getElementById("discoveryStatus");
const manualModelInput = document.getElementById("manualModelInput");
const addManualModelBtn = document.getElementById("addManualModelBtn");
const discoveredModelsList = document.getElementById("discoveredModelsList");
const saveConnectionBtn = document.getElementById("saveConnectionBtn");

// Popups & Modals
const autocompletePopup = document.getElementById("autocompletePopup");
const popupList = document.getElementById("popupList");
const popupHeader = document.getElementById("popupHeader");
const addMcpModal = document.getElementById("addMcpModal");
const addSkillModal = document.getElementById("addSkillModal");

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", async () => {
  setupEventListeners();
  setupKeyboardShortcuts();
  await loadConnections();
  await loadMcpConfig();
  await loadSkillsConfig();
  await checkLocusPulse();
  await loadDaemonStatus();
  await loadProjectMemory();
});

// --- LOAD CONNECTIONS ---
async function loadConnections() {
  if (invoke) {
    try {
      apiConnections = await invoke("get_api_connections");
    } catch (e) {
      console.warn("Failed to load connections:", e);
      apiConnections = [];
    }
  }

  // Purge any dead or decommissioned models (e.g. qwen2.5-coder-32b, mixtral-8x7b)
  apiConnections.forEach(c => {
    c.pinned_models = (c.pinned_models || []).filter(m => m !== "qwen/qwen2.5-coder-32b-instruct" && m !== "mixtral-8x7b-32768" && !m.includes("qwen2.5-coder-32b"));
    c.all_models = (c.all_models || []).filter(m => m !== "qwen/qwen2.5-coder-32b-instruct" && m !== "mixtral-8x7b-32768" && !m.includes("qwen2.5-coder-32b"));
  });

  if (activeModelId && (activeModelId.includes("qwen2.5-coder-32b") || activeModelId.includes("mixtral-8x7b"))) {
    activeModelId = null;
  }

  // Update Drawer status indicators (both desktop & mobile)
  const hasActive = apiConnections.some(c => c.enabled && c.api_key.trim().length > 0);
  if (drawerKeyIndicator) {
    drawerKeyIndicator.style.backgroundColor = hasActive ? "var(--accent-green)" : "var(--accent-amber)";
  }
  const mobileDot = document.getElementById("mobileDrawerKeyIndicator");
  if (mobileDot) {
    mobileDot.style.backgroundColor = hasActive ? "var(--accent-green)" : "var(--accent-amber)";
  }

  // Set active model if not set
  ensureActiveModelSelected();

  renderConnectionsList();
  renderModelDropdown();
  updateTopBarPill();
}

function ensureActiveModelSelected() {
  const enabledConns = apiConnections.filter(c => c.enabled);
  if (enabledConns.length === 0) {
    activeConnectionId = null;
    activeModelId = null;
    return;
  }

  // Check if current active selection is still valid
  const currentConn = enabledConns.find(c => c.id === activeConnectionId);
  if (currentConn) {
    if (activeModelId && (currentConn.pinned_models.includes(activeModelId) || currentConn.all_models.includes(activeModelId))) {
      return;
    }
    if (currentConn.pinned_models.length > 0) {
      activeModelId = currentConn.pinned_models[0];
      return;
    }
    if (currentConn.all_models.length > 0) {
      activeModelId = currentConn.all_models[0];
      return;
    }
  }

  // Pick first enabled connection with pinned or available models
  for (const conn of enabledConns) {
    if (conn.pinned_models.length > 0) {
      activeConnectionId = conn.id;
      activeModelId = conn.pinned_models[0];
      return;
    }
  }

  const first = enabledConns[0];
  activeConnectionId = first.id;
  activeModelId = first.pinned_models[0] || first.all_models[0] || null;
}

// --- RENDER TOP BAR PILL & DROPDOWN ---
function updateTopBarPill() {
  const currentConn = apiConnections.find(c => c.id === activeConnectionId);

  if (!currentConn || !activeModelId) {
    activeProviderDot.style.backgroundColor = "var(--accent-amber)";
    activeProviderTag.textContent = currentConn ? currentConn.name : "Universal";
    activeModelTitle.textContent = currentConn ? "اضغط لتحديد نموذج" : "أضف اتصالاً للبدء (+)";
    return;
  }

  activeProviderDot.style.backgroundColor = "var(--accent-green)";
  activeProviderDot.style.boxShadow = "0 0 6px rgba(16, 185, 129, 0.7)";
  activeProviderTag.textContent = currentConn.name.length > 12 ? currentConn.name.substring(0, 10) + ".." : currentConn.name;
  
  // Format clean display name
  const cleanModelName = activeModelId.includes("/") 
    ? activeModelId.split("/").pop() 
    : activeModelId;
  activeModelTitle.textContent = cleanModelName;
}

function renderModelDropdown() {
  modelDropdownGroups.innerHTML = "";

  const enabledConns = apiConnections.filter(c => c.enabled);

  if (enabledConns.length === 0) {
    const emptyNotice = document.createElement("div");
    emptyNotice.style.padding = "16px 12px";
    emptyNotice.style.textAlign = "center";
    emptyNotice.style.fontSize = "12px";
    emptyNotice.style.color = "var(--text-muted)";
    emptyNotice.innerHTML = `
      <span>لا توجد اتصالات نشطة حالياً.</span><br>
      <button type="button" class="btn-small" style="margin-top: 8px;" id="dropdownAddConnBtn">+ إضافة اتصال جديد</button>
    `;
    modelDropdownGroups.appendChild(emptyNotice);

    const btn = emptyNotice.querySelector("#dropdownAddConnBtn");
    if (btn) {
      btn.addEventListener("click", () => {
        modelDropdownMenu.classList.add("hidden");
        openAddConnectionModal();
      });
    }
    return;
  }

  enabledConns.forEach(conn => {
    const groupDiv = document.createElement("div");
    groupDiv.className = "dropdown-group";

    const titleDiv = document.createElement("div");
    titleDiv.className = "dropdown-group-title";
    titleDiv.textContent = conn.name;
    groupDiv.appendChild(titleDiv);

    // Show pinned models (or all models if none pinned)
    const modelsToShow = conn.pinned_models.length > 0 ? conn.pinned_models : conn.all_models;

    if (modelsToShow.length === 0) {
      const noModels = document.createElement("div");
      noModels.style.padding = "4px 12px";
      noModels.style.fontSize = "11px";
      noModels.style.color = "var(--text-faint)";
      noModels.textContent = "لم يتم تحديد أي نموذج (اضغط تثبيت النماذج من الإعدادات)";
      groupDiv.appendChild(noModels);
    } else {
      modelsToShow.forEach(mId => {
        const item = document.createElement("div");
        const isSelected = (activeConnectionId === conn.id && activeModelId === mId);
        item.className = `dropdown-item ${isSelected ? "selected" : ""}`;
        item.innerHTML = `
          <span>${escapeHtml(mId)}</span>
          ${isSelected ? '<span style="color: var(--accent-green); font-size: 11px;">✓ نشط</span>' : ''}
        `;
        item.addEventListener("click", () => {
          activeConnectionId = conn.id;
          activeModelId = mId;
          updateTopBarPill();
          renderModelDropdown();
          modelDropdownMenu.classList.add("hidden");
        });
        groupDiv.appendChild(item);
      });
    }

    modelDropdownGroups.appendChild(groupDiv);
  });
}

// --- RENDER CONNECTIONS LIST (TAB 1) ---
function renderConnectionsList() {
  if (!connectionsList || !emptyConnectionsState) return;

  if (apiConnections.length === 0) {
    connectionsList.innerHTML = "";
    emptyConnectionsState.classList.remove("hidden");
    return;
  }

  emptyConnectionsState.classList.add("hidden");
  connectionsList.innerHTML = "";

  apiConnections.forEach(conn => {
    const card = document.createElement("div");
    card.className = "connection-card";
    
    // Mask key for safety
    const maskedKey = conn.api_key.length > 8 
      ? conn.api_key.substring(0, 4) + "••••••••" + conn.api_key.substring(conn.api_key.length - 4)
      : "••••••••";

    card.innerHTML = `
      <div class="connection-card-header">
        <div class="connection-identity">
          <div class="connection-name-row">
            <span class="connection-name">${escapeHtml(conn.name)}</span>
            <span class="connection-url-badge">${escapeHtml(conn.base_url)}</span>
          </div>
          <div style="font-size: 11px; color: var(--text-faint); font-family: var(--font-mono);">
            <span>Key: ${escapeHtml(maskedKey)}</span>
          </div>
        </div>

        <div class="connection-actions-row">
          <button type="button" class="btn-card-icon btn-edit-conn" title="تعديل الاتصال">✏️</button>
          <button type="button" class="btn-card-icon btn-card-delete btn-delete-conn" title="حذف الاتصال">🗑️</button>
          <label class="toggle-switch" title="تفعيل / تعطيل الاتصال">
            <input type="checkbox" class="conn-toggle" ${conn.enabled ? "checked" : ""}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <!-- Pinned Models Section -->
      <div class="connection-models-section">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="models-section-label">النماذج المثبتة في القائمة العلوية:</span>
          <span style="font-size: 10.5px; color: var(--text-faint);">${conn.pinned_models.length} مثبت</span>
        </div>
        <div class="models-chips-wrap">
          ${renderConnectionChips(conn)}
        </div>
      </div>
    `;

    // Toggle connection enabled
    const toggle = card.querySelector(".conn-toggle");
    toggle.addEventListener("change", async () => {
      conn.enabled = toggle.checked;
      if (invoke) {
        apiConnections = await invoke("toggle_api_connection", { id: conn.id, enabled: conn.enabled });
      }
      loadConnections();
    });

    // Edit connection
    card.querySelector(".btn-edit-conn").addEventListener("click", () => {
      openEditConnectionModal(conn);
    });

    // Delete connection
    card.querySelector(".btn-delete-conn").addEventListener("click", async () => {
      if (confirm(`هل أنت متأكد من حذف الاتصال "${conn.name}"؟`)) {
        if (invoke) {
          apiConnections = await invoke("delete_api_connection", { id: conn.id });
        } else {
          apiConnections = apiConnections.filter(c => c.id !== conn.id);
        }
        loadConnections();
      }
    });

    // Click on model chip to toggle pin
    card.querySelectorAll(".model-pin-chip").forEach(chip => {
      chip.addEventListener("click", async () => {
        const mId = chip.getAttribute("data-model");
        if (invoke) {
          apiConnections = await invoke("toggle_pinned_model", { connectionId: conn.id, modelId: mId });
        } else {
          if (conn.pinned_models.includes(mId)) {
            conn.pinned_models = conn.pinned_models.filter(m => m !== mId);
          } else {
            conn.pinned_models.push(mId);
          }
        }
        loadConnections();
      });
    });

    connectionsList.appendChild(card);
  });
}

function renderConnectionChips(conn) {
  const allAvailable = Array.from(new Set([...conn.pinned_models, ...conn.all_models]));
  if (allAvailable.length === 0) {
    return `<span style="font-size: 11px; color: var(--text-faint);">لا توجد نماذج مضافة (اضغط ✏️ لجلب النماذج)</span>`;
  }

  return allAvailable.map(mId => {
    const isPinned = conn.pinned_models.includes(mId);
    return `
      <span class="model-pin-chip ${isPinned ? "pinned" : ""}" data-model="${escapeHtml(mId)}" title="انقر لتثبيت / إلغاء تثبيت النموذج في القائمة">
        ${isPinned ? "✓ " : ""}${escapeHtml(mId)}
      </span>
    `;
  }).join("");
}

// --- CONNECTION MODAL (ADD / EDIT) ---
function openAddConnectionModal() {
  connModalId.value = "";
  connModalTitle.textContent = "إضافة اتصال مزود جديد (Universal API)";
  connNameInput.value = "";
  connBaseUrlInput.value = "";
  connKeyInput.value = "";
  const backupInput = document.getElementById("connBackupKeysInput");
  if (backupInput) backupInput.value = "";
  connPortalHint.innerHTML = "";
  discoveryStatus.textContent = "";
  discoveredModelsList.innerHTML = "";

  // Apply default preset (Groq)
  applyPreset("groq");

  connectionModal.classList.remove("hidden");
}

// Native External URL Opener (with IPC + Shell + Browser Fallbacks)
async function openExternalUrl(url) {
  if (!url) return;
  // 1. Primary: Native Tauri Shell invoke
  if (invoke) {
    try {
      await invoke("open_external_url", { url });
      return;
    } catch (err) {
      console.warn("invoke(open_external_url) failed:", err);
    }
  }
  // 2. Tauri JS Shell/Opener API
  try {
    if (window.__TAURI__?.shell?.open) {
      await window.__TAURI__.shell.open(url);
      return;
    }
    if (window.__TAURI__?.opener?.openUrl) {
      await window.__TAURI__.opener.openUrl(url);
      return;
    }
  } catch (err) {
    console.warn("Tauri JS shell open failed:", err);
  }
  // 3. System browser / window.open
  try {
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (w) return;
  } catch (err) {
    console.warn("window.open failed:", err);
  }
  // 4. Fallback navigation
  window.location.href = url;
}

function setupPortalLinkHandlers(container) {
  if (!container) return;
  const link = container.querySelector(".direct-link");
  if (link) {
    link.addEventListener("click", async (e) => {
      e.preventDefault();
      const url = link.getAttribute("data-url") || link.getAttribute("href");
      await openExternalUrl(url);
    });
  }

  const copyBtn = container.querySelector(".btn-copy-portal");
  if (copyBtn) {
    copyBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const url = copyBtn.getAttribute("data-url");
      if (!url) return;
      try {
        await navigator.clipboard.writeText(url);
        copyBtn.textContent = "تم النسخ ✓";
        setTimeout(() => { copyBtn.textContent = "📋 نسخ الرابط"; }, 2500);
      } catch (err) {
        const ta = document.createElement("textarea");
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        copyBtn.textContent = "تم النسخ ✓";
        setTimeout(() => { copyBtn.textContent = "📋 نسخ الرابط"; }, 2500);
      }
    });
  }
}

function openEditConnectionModal(conn) {
  connModalId.value = conn.id;
  connModalTitle.textContent = `تعديل الاتصال: ${conn.name}`;
  connNameInput.value = conn.name;
  connBaseUrlInput.value = conn.base_url;
  connKeyInput.value = conn.api_key;
  const backupInput = document.getElementById("connBackupKeysInput");
  if (backupInput) backupInput.value = (conn.backup_keys || []).join("\n");
  connPortalHint.innerHTML = "";
  discoveryStatus.textContent = "";
  discoveredModelsList.innerHTML = "";

  // Render matching portal hint if available
  const matchedKey = Object.keys(PRESETS).find(k => {
    try {
      return PRESETS[k].url && conn.base_url.includes(new URL(PRESETS[k].url).hostname);
    } catch {
      return false;
    }
  });
  if (matchedKey && PRESETS[matchedKey].portal) {
    const p = PRESETS[matchedKey];
    connPortalHint.innerHTML = `
      <span>${p.hint}</span>
      <div class="portal-link-row">
        <a href="${p.portal}" target="_blank" rel="noopener noreferrer" class="direct-link" data-url="${p.portal}">🔗 رابط استخراج المفتاح</a>
        <button type="button" class="btn-copy-portal" data-url="${p.portal}" title="نسخ رابط الاستخراج للحافظة">📋 نسخ الرابط</button>
      </div>
    `;
    setupPortalLinkHandlers(connPortalHint);
  }

  // Render existing models checklist
  const allAvailable = Array.from(new Set([...conn.pinned_models, ...conn.all_models]));
  renderDiscoveredChecklist(allAvailable, conn.pinned_models);

  connectionModal.classList.remove("hidden");
}

function applyPreset(presetKey) {
  const p = PRESETS[presetKey];
  if (!p) return;

  document.querySelectorAll(".preset-pill").forEach(pill => {
    pill.classList.toggle("active", pill.getAttribute("data-preset") === presetKey);
  });

  if (presetKey === "custom") {
    connNameInput.placeholder = "مثلاً: المزود الخاص بي أو Ollama محلي";
    connBaseUrlInput.placeholder = "https://your-api.com/v1";
    connPortalHint.innerHTML = `<span>${p.hint}</span>`;
    discoveredModelsList.innerHTML = `
      <div class="empty-models-notice">
        <span>أدخل رابط نقطة النهاية ومفتاح الـ API ثم اضغط <b>[Verify & Fetch ⚡]</b> لجلب النماذج، أو أضف Model ID يدوياً.</span>
      </div>
    `;
    return;
  }

  connNameInput.value = p.name;
  connBaseUrlInput.value = p.url;
  connPortalHint.innerHTML = `
    <span>${p.hint}</span> 
    <div class="portal-link-row">
      ${p.portal ? `
        <a href="${p.portal}" target="_blank" rel="noopener noreferrer" class="direct-link" data-url="${p.portal}">🔗 رابط استخراج المفتاح</a>
        <button type="button" class="btn-copy-portal" data-url="${p.portal}" title="نسخ رابط الاستخراج للحافظة">📋 نسخ الرابط</button>
      ` : ""}
    </div>
  `;

  // Attach direct link and copy handlers
  setupPortalLinkHandlers(connPortalHint);

  // Clear models checklist — NEVER pre-fill default mock models!
  discoveredModelsList.innerHTML = `
    <div class="empty-models-notice">
      <span>لا توجد نماذج مضافة بعد. الصق مفتاح الـ API الأساسي واضغط <b>[Verify & Fetch ⚡]</b> لجلب نماذج حسابك الفعلية، أو اكتب Model ID يدوياً.</span>
    </div>
  `;
}

function renderDiscoveredChecklist(models, pinned = []) {
  discoveredModelsList.innerHTML = "";
  if (!models || models.length === 0) {
    discoveredModelsList.innerHTML = `
      <div class="empty-models-notice">
        <span>لم يتم العثور على نماذج محفوظة بعد. اضغط <b>[Verify & Fetch ⚡]</b> بعد إدخال المفتاح لجلب النماذج الفعلية.</span>
      </div>
    `;
    return;
  }
  models.forEach(m => {
    const item = document.createElement("div");
    item.className = "discovered-model-item";
    const isChecked = pinned.includes(m);
    item.innerHTML = `
      <input type="checkbox" value="${escapeHtml(m)}" ${isChecked ? "checked" : ""}>
      <span>${escapeHtml(m)}</span>
    `;
    discoveredModelsList.appendChild(item);
  });
}

// Smart Key Validator & Model Fetching via Native Rust Backend (5s Timeout + Latency ms + 4 States)
async function handleFetchModels() {
  const baseUrl = connBaseUrlInput.value.trim();
  const apiKey = connKeyInput.value.trim();

  if (!baseUrl) {
    discoveryStatus.innerHTML = `
      <div class="val-result val-error">
        <span class="val-badge badge-red">✕ خطأ في الرابط</span>
        <span class="val-msg">الرجاء إدخال رابط نقطة النهاية (Base URL) أولاً قبل بدء الفحص.</span>
      </div>
    `;
    return;
  }

  // Get test model candidate for fallback verification
  const manualModel = manualModelInput ? manualModelInput.value.trim() : "";
  const firstChecked = discoveredModelsList.querySelector("input:checked")?.value;
  const testCandidate = manualModel || firstChecked || null;

  fetchModelsBtn.disabled = true;
  fetchModelsBtn.innerHTML = `<span>⏳</span> جاري الفحص (5s)...`;
  discoveryStatus.innerHTML = `
    <div class="val-result" style="background: rgba(255,255,255,0.03); border: 1px dashed var(--border-color); color: var(--text-secondary);">
      <span class="val-badge badge-blue">⏳ جاري الاتصال وقياس زمن الاستجابة...</span>
      <span class="val-msg">إرسال طلب GET ${escapeHtml(baseUrl)}/models بمهلة قصوى 5 ثوانٍ...</span>
    </div>
  `;

  try {
    let result = null;
    if (invoke) {
      result = await invoke("validate_and_fetch_models", {
        baseUrl,
        apiKey,
        testModel: testCandidate
      });
    } else {
      // Mock simulation for browser preview
      await new Promise(r => setTimeout(r, 380));
      result = {
        success: true,
        status_code: 200,
        latency_ms: 118,
        status_type: "valid",
        message: "المفتاح صالح ومفعّل (زمن الاستجابة: 118ms).",
        models: testCandidate ? [testCandidate] : []
      };
    }

    renderValidationFeedback(result);
  } catch (err) {
    discoveryStatus.innerHTML = `
      <div class="val-result val-error">
        <span class="val-badge badge-red">✕ استثناء في النظام</span>
        <span class="val-msg">${escapeHtml(String(err))}</span>
      </div>
    `;
  } finally {
    fetchModelsBtn.disabled = false;
    fetchModelsBtn.textContent = "Verify & Fetch ⚡";
  }
}

// Render Smart Key Validator 4-state feedback & populate models
function renderValidationFeedback(res) {
  if (!res) return;

  const latencyStr = res.latency_ms ? `${res.latency_ms}ms` : "<1ms";

  // الحالة 1: 200 OK - المفتاح صالح + عرض سرعة الاستجابة بالملي ثانية + عرض قائمة النماذج
  if (res.status_code === 200 && res.status_type === "valid") {
    discoveryStatus.innerHTML = `
      <div class="val-result val-success">
        <span class="val-badge badge-green">🟢 200 OK • ${latencyStr}</span>
        <span class="val-msg">المفتاح صالح ومفعّل بنجاح (زمن الاستجابة: ${latencyStr}). تم جلب ${res.models?.length || 0} نموذج متوفر.</span>
      </div>
    `;

    if (res.models && res.models.length > 0) {
      const existingChecked = Array.from(discoveredModelsList.querySelectorAll("input:checked")).map(i => i.value);
      const defaultPins = existingChecked.length > 0 ? existingChecked : res.models.slice(0, 2);
      renderDiscoveredChecklist(res.models, defaultPins);
    } else {
      discoveryStatus.innerHTML += `
        <div class="val-msg" style="color: var(--accent-amber); margin-top: 4px;">
          المفتاح صالح لكن نقطة النهاية لم ترجع قائمة نماذج. يمكنك كتابة Model ID يدوياً أدناه.
        </div>
      `;
    }
    return;
  }

  // الحالة 2: 401 / 403 - المفتاح غير صالح أو منتهي الصلاحية
  if (res.status_code === 401 || res.status_code === 403 || res.status_type === "invalid_key") {
    discoveryStatus.innerHTML = `
      <div class="val-result val-error">
        <span class="val-badge badge-red">🔴 خطأ ${res.status_code || 401} Unauthorized</span>
        <span class="val-msg">${escapeHtml(res.message || "المفتاح غير صالح أو منتهي الصلاحية - يرجى مراجعة المفتاح من لوحة التحكم.")}</span>
      </div>
    `;
    return;
  }

  // الحالة 3: 429 / 402 - المفتاح صالح ولكن الرصيد نافد أو تم تجاوز الحد المسموح (Quota Exceeded)
  if (res.status_code === 429 || res.status_code === 402 || res.status_type === "quota_exceeded") {
    discoveryStatus.innerHTML = `
      <div class="val-result val-warning">
        <span class="val-badge badge-amber">🟡 تنبيه ${res.status_code || 429} Quota Exceeded • ${latencyStr}</span>
        <span class="val-msg">${escapeHtml(res.message || "المفتاح صالح، لكن الرصيد نافد أو تم تجاوز الحد المسموح للاستخدام.")}</span>
      </div>
    `;
    return;
  }

  // الحالة 4: 404 Fallback - تم التحقق عبر نقطة /chat/completions بـ max_tokens: 1
  if (res.status_type === "fallback_valid") {
    discoveryStatus.innerHTML = `
      <div class="val-result val-fallback">
        <span class="val-badge badge-blue">🔵 مفعّل عبر Fallback (/chat/completions) • ${latencyStr}</span>
        <span class="val-msg">${escapeHtml(res.message || "نقطة /models غير مدعومة (404)، لكن تم التحقق من صلاحية المفتاح والنموذج بنجاح عبر اختبار نقطة المحادثة.")}</span>
      </div>
    `;

    if (res.models && res.models.length > 0) {
      const existing = Array.from(discoveredModelsList.querySelectorAll("input")).map(i => i.value);
      res.models.forEach(m => {
        if (!existing.includes(m)) {
          const item = document.createElement("div");
          item.className = "discovered-model-item";
          item.innerHTML = `
            <input type="checkbox" value="${escapeHtml(m)}" checked>
            <span>${escapeHtml(m)}</span>
          `;
          discoveredModelsList.insertBefore(item, discoveredModelsList.firstChild);
        }
      });
    }
    return;
  }

  // أخطاء أخرى: انتهاء المهلة (Timeout 5s) أو خطأ في الشبكة أو 404 غير متوفر
  discoveryStatus.innerHTML = `
    <div class="val-result val-error">
      <span class="val-badge badge-red">✕ ${res.status_code ? `HTTP ${res.status_code}` : 'فشل الفحص'} • ${latencyStr}</span>
      <span class="val-msg">${escapeHtml(res.message || "تعذر إكمال الفحص.")}</span>
    </div>
  `;
}

// Add manual model
function handleAddManualModel() {
  const m = manualModelInput.value.trim();
  if (!m) return;

  const existingInputs = Array.from(discoveredModelsList.querySelectorAll("input")).map(i => i.value);
  if (!existingInputs.includes(m)) {
    const item = document.createElement("div");
    item.className = "discovered-model-item";
    item.innerHTML = `
      <input type="checkbox" value="${escapeHtml(m)}" checked>
      <span>${escapeHtml(m)}</span>
    `;
    discoveredModelsList.insertBefore(item, discoveredModelsList.firstChild);
  }
  manualModelInput.value = "";
}

// Save connection
async function handleSaveConnection() {
  const name = connNameInput.value.trim();
  const baseUrl = connBaseUrlInput.value.trim();
  const apiKey = connKeyInput.value.trim();
  const existingId = connModalId.value;

  if (!name || !baseUrl) {
    alert("الرجاء إدخال اسم الاتصال ورابط Base URL");
    return;
  }

  // Parse backup keys for auto-failover
  const backupInput = document.getElementById("connBackupKeysInput");
  const backupRaw = backupInput ? backupInput.value : "";
  const backup_keys = backupRaw.split("\n").map(k => k.trim()).filter(k => k.length > 0);

  // Find existing connection to preserve active_key_index
  const existingConn = apiConnections.find(c => c.id === existingId);
  const active_key_index = existingConn ? (existingConn.active_key_index || 0) : 0;

  // Gather selected pinned models & all discovered
  const allCheckboxes = Array.from(discoveredModelsList.querySelectorAll("input[type='checkbox']"));
  const pinned_models = allCheckboxes.filter(c => c.checked).map(c => c.value);
  const all_models = allCheckboxes.map(c => c.value);

  const connectionObj = {
    id: existingId || `conn_${Date.now()}`,
    name,
    base_url: baseUrl,
    api_key: apiKey,
    backup_keys,
    active_key_index,
    enabled: true,
    pinned_models,
    all_models
  };

  if (invoke) {
    apiConnections = await invoke("save_api_connection", { connection: connectionObj });
  } else {
    const idx = apiConnections.findIndex(c => c.id === connectionObj.id);
    if (idx >= 0) apiConnections[idx] = connectionObj;
    else apiConnections.push(connectionObj);
  }

  connectionModal.classList.add("hidden");
  loadConnections();
}

// --- SEND & STREAM EXECUTION ---
async function handleSend() {
  const text = promptInput.value.trim();
  if (!text || isStreaming) return;

  autocompletePopup.classList.add("hidden");
  promptInput.value = "";
  promptInput.style.height = "auto";

  if (welcomeBanner) welcomeBanner.style.display = "none";

  if (text === "/clear") {
    streamMessages.innerHTML = "";
    conversationHistory.length = 1;
    return;
  }

  if (text === "/skills") {
    openDrawer("tab-skills");
    return;
  }

  if (text === "/memory") {
    openDrawer("tab-memory");
    return;
  }

  if (text === "/remote") {
    openDrawer("tab-remote");
    return;
  }

  // 5. System Automation Safety Gate Check
  if (invoke) {
    try {
      const safety = await invoke("check_safety_gate", { command: text });
      if (safety && safety.level === "DestructiveRed") {
        appendUserMessage(text);
        const assistantTurn = createAssistantTurn();
        streamMessages.appendChild(assistantTurn.container);
        scrollStreamToBottom();

        renderSafetyGateCard(assistantTurn.container, safety.request_id, text, safety.reason, () => {
          proceedWithSend(text, assistantTurn);
        }, () => {
          assistantTurn.textBlock.innerHTML = `<span style="color: var(--accent-red); font-size: 12px;">✕ تم حظر تنفيذ العملية بأمر من المستخدم (Safety Gate Blocked).</span>`;
          scrollStreamToBottom();
        });
        return;
      }
    } catch (e) {
      console.warn("Safety gate check:", e);
    }
  }

  appendUserMessage(text);
  conversationHistory.push({ role: "user", content: text });

  const assistantTurn = createAssistantTurn();
  streamMessages.appendChild(assistantTurn.container);
  scrollStreamToBottom();

  await proceedWithSend(text, assistantTurn);
}

async function proceedWithSend(text, assistantTurn) {
  isStreaming = true;
  sendBtn.disabled = true;

  // 3. Android-to-PC Remote Client Forwarding
  if (remoteBridgeMode === "remote_client" && remoteDaemonHost) {
    appendToolPill(assistantTurn.container, "Remote Daemon", `Forwarding to PC Host (${remoteDaemonHost})...`);
    try {
      const resp = await fetch(`${remoteDaemonHost}/api/exec`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-daemon-pin": remoteDaemonPin
        },
        body: JSON.stringify({
          command: "execute_session_turn",
          args: { prompt: text }
        })
      });

      const resData = await resp.json();
      const answer = resData.output || resData.message || (resData.success ? "✓ تم تنفيذ العملية عن بعد على الحاسوب." : JSON.stringify(resData));
      assistantTurn.textBlock.innerHTML = renderMarkdown(answer);
      conversationHistory.push({ role: "assistant", content: answer });

      if (text.includes("refactor") || text.includes("عدل") || text.includes("patch") || text.includes("fix")) {
        renderInteractiveDiffCard(assistantTurn.container, "src/main.rs", [
          { type: "del", text: "- let status = check_legacy_runtime();" },
          { type: "add", text: "+ let status = check_universal_router();" },
          { type: "add", text: "+ // LOCUS AST remote execution enforced" },
          { type: "add", text: "+ return status;" }
        ]);
      }
    } catch (err) {
      assistantTurn.textBlock.innerHTML = `<span style="color: var(--accent-red);">خطأ في الاتصال بالحاسوب: ${escapeHtml(String(err))}</span>`;
    } finally {
      isStreaming = false;
      sendBtn.disabled = false;
      scrollStreamToBottom();
    }
    return;
  }

  const currentConn = apiConnections.find(c => c.id === activeConnectionId);

  // 1. Auto-Failover Universal Router Request
  if (currentConn && currentConn.api_key.trim() && invoke) {
    try {
      appendToolPill(assistantTurn.container, "Universal Router", `Connecting to ${currentConn.name} (${activeModelId})...`);

      const rawResponse = await invoke("send_universal_chat_request", {
        connectionId: currentConn.id,
        model: activeModelId,
        messagesJson: JSON.stringify(conversationHistory),
        temperature: 0.6
      });

      let answer = "✓ تم استلام الرد بنجاح.";
      try {
        const parsed = JSON.parse(rawResponse);
        answer = parsed.choices?.[0]?.message?.content || answer;
      } catch {
        answer = rawResponse;
      }

      assistantTurn.textBlock.innerHTML = renderMarkdown(answer);
      conversationHistory.push({ role: "assistant", content: answer });

      // Diff card test trigger
      if (text.includes("refactor") || text.includes("عدل") || text.includes("patch") || text.includes("fix")) {
        renderInteractiveDiffCard(assistantTurn.container, "src/main.rs", [
          { type: "del", text: "- let status = check_legacy_runtime();" },
          { type: "add", text: "+ let status = check_universal_router();" },
          { type: "add", text: "+ // LOCUS AST zero-blind compression enforced" },
          { type: "add", text: "+ return status;" }
        ]);
      }

    } catch (err) {
      const errStr = String(err);
      const isDeadModel = errStr.includes("410") || 
                          errStr.toLowerCase().includes("gone") || 
                          errStr.toLowerCase().includes("end of life") || 
                          errStr.includes("404") || 
                          errStr.toLowerCase().includes("not_found") || 
                          errStr.toLowerCase().includes("not found");

      if (isDeadModel) {
        // Auto-purge decommissioned/invalid model from connection
        if (currentConn && activeModelId) {
          const deadModel = activeModelId;
          currentConn.pinned_models = (currentConn.pinned_models || []).filter(m => m !== deadModel);
          currentConn.all_models = (currentConn.all_models || []).filter(m => m !== deadModel);
          if (invoke) {
            invoke("save_api_connection", { connection: currentConn }).catch(console.warn);
          }
          ensureActiveModelSelected();
          updateTopBarPill();
          renderModelDropdown();
          renderConnectionsList();
        }

        assistantTurn.textBlock.innerHTML = `
          <div class="chat-error-card">
            <span class="error-badge">⚠️ النموذج متوقف أو غير متاح (HTTP 410 / 404)</span>
            <p>
              النموذج <code>${escapeHtml(activeModelId || "المحدد")}</code> وصل إلى نهاية الدعم (End of life) أو غير متوفر في حسابك لدى <strong>${escapeHtml(currentConn.name)}</strong>.
            </p>
            <div class="error-actions-row">
              <button type="button" class="btn-error-action btn-refresh-models">🔄 جلب النماذج الحية المتوفرة</button>
              <button type="button" class="btn-error-action secondary btn-pick-model">▼ اختيار نموذج آخر</button>
            </div>
          </div>
        `;

        const refreshBtn = assistantTurn.textBlock.querySelector(".btn-refresh-models");
        if (refreshBtn) {
          refreshBtn.addEventListener("click", () => {
            openEditConnectionModal(currentConn);
            handleFetchModels();
          });
        }
        const pickBtn = assistantTurn.textBlock.querySelector(".btn-pick-model");
        if (pickBtn) {
          pickBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            modelDropdownMenu.classList.remove("hidden");
          });
        }
      } else {
        assistantTurn.textBlock.innerHTML = `<span style="color: var(--accent-red)">خطأ في الاتصال بنقطة النهاية: ${escapeHtml(errStr)}</span>`;
      }
    } finally {
      isStreaming = false;
      sendBtn.disabled = false;
      scrollStreamToBottom();
    }
  } else if (invoke) {
    try {
      await invoke("execute_session_turn", { prompt: text, cwd: "." });
    } catch (err) {
      assistantTurn.textBlock.innerHTML = `<span style="color: var(--accent-red)">Error: ${err}</span>`;
    } finally {
      isStreaming = false;
      sendBtn.disabled = false;
      scrollStreamToBottom();
    }
  } else {
    setTimeout(() => {
      assistantTurn.textBlock.innerHTML = renderMarkdown(
        `أهلاً بك في **OpenCode Sovereign**! 👋\n\nأضف اتصالك الأول عبر **[+ Add API Connection]** في مركز القيادة ⚙️ للاتصال الحي بأي نموذج في العالم.`
      );
      isStreaming = false;
      sendBtn.disabled = false;
      scrollStreamToBottom();
    }, 400);
  }
}

// --- DOM RENDERERS ---
function appendUserMessage(text) {
  const turn = document.createElement("div");
  turn.className = "turn-user";
  turn.innerHTML = `<div class="user-bubble">${escapeHtml(text)}</div>`;
  streamMessages.appendChild(turn);
}

function createAssistantTurn() {
  const container = document.createElement("div");
  container.className = "turn-assistant";

  const textBlock = document.createElement("div");
  textBlock.className = "assistant-text";
  container.appendChild(textBlock);

  return { container, textBlock };
}

function appendLocusSlice(container, file, symbol, skeletonContent) {
  const card = document.createElement("div");
  card.className = "locus-slice-card";
  card.innerHTML = `
    <div class="locus-slice-header">
      <div class="slice-left">
        <span class="slice-tag">🔍 [LOCUS Slice]</span>
        <span class="slice-file">${escapeHtml(file)}</span>
        <span class="slice-symbol">(Symbol: ${escapeHtml(symbol)})</span>
      </div>
      <span class="slice-chevron">▸</span>
    </div>
    <div class="locus-slice-body">
      <pre><code>${escapeHtml(skeletonContent)}</code></pre>
    </div>
  `;

  card.querySelector(".locus-slice-header").addEventListener("click", () => {
    card.classList.toggle("expanded");
  });

  container.appendChild(card);
}

function appendToolPill(container, name, input) {
  const pill = document.createElement("div");
  pill.className = "tool-call-pill";
  pill.innerHTML = `
    <span class="tool-loader-dot"></span>
    <span>🔌 [MCP: ${escapeHtml(name)}] ${escapeHtml(input)}</span>
  `;
  container.appendChild(pill);
  return pill;
}

function renderInteractiveDiffCard(container, path, lines) {
  const addCount = lines.filter(l => l.type === "add").length;
  const delCount = lines.filter(l => l.type === "del").length;

  const card = document.createElement("div");
  card.className = "diff-card";
  card.innerHTML = `
    <div class="diff-header">
      <div class="diff-file-info">
        <span>📄 ${escapeHtml(path)}</span>
        <div class="diff-badge-stats">
          <span class="diff-add">+${addCount}</span>
          <span class="diff-del">-${delCount}</span>
        </div>
      </div>
      <span style="font-size: 11px; color: var(--text-faint);">Interactive Diff Hunk</span>
    </div>
    <div class="diff-content">
      ${lines.map(l => `<div class="diff-line line-${l.type}">${escapeHtml(l.text)}</div>`).join("")}
    </div>
    <div class="diff-actions-footer">
      <button type="button" class="btn-diff-action btn-diff-accept">
        <span>✓ Accept</span>
        <kbd class="shortcut-tag desktop-only">Alt+A</kbd>
      </button>
      <button type="button" class="btn-diff-action btn-diff-reject">
        <span>✕ Reject</span>
        <kbd class="shortcut-tag desktop-only">Alt+R</kbd>
      </button>
    </div>
  `;

  const acceptBtn = card.querySelector(".btn-diff-accept");
  const rejectBtn = card.querySelector(".btn-diff-reject");
  const footer = card.querySelector(".diff-actions-footer");

  acceptBtn.addEventListener("click", async () => {
    const code = lines.filter(l => l.type === "add").map(l => l.text.substring(2)).join("\n");
    if (invoke) {
      try {
        const res = await invoke("apply_diff_action", { path, code, accept: true });
        const snapshotId = (typeof res === "object" && res !== null) ? res.snapshot_id : null;
        const msg = (typeof res === "object" && res !== null) ? res.message : res;

        footer.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <button type="button" class="btn-diff-action btn-diff-undo">
              <span>↩ Undo Change</span>
            </button>
            <span class="diff-decision-badge" style="background: var(--accent-green-bg); color: var(--accent-green);">${escapeHtml(msg || "✓ تم تطبيق التعديل")}</span>
          </div>
        `;

        const undoBtn = footer.querySelector(".btn-diff-undo");
        if (undoBtn && snapshotId) {
          undoBtn.addEventListener("click", async () => {
            try {
              undoBtn.disabled = true;
              undoBtn.innerHTML = `<span>⏳ جاري التراجع...</span>`;
              const revertMsg = await invoke("revert_file_snapshot", { snapshotId });
              footer.innerHTML = `<span class="badge-reverted">${escapeHtml(revertMsg || "✓ تم التراجع واستعادة الملف الأصلي (Reverted)")}</span>`;
            } catch (err) {
              undoBtn.disabled = false;
              undoBtn.innerHTML = `<span>↩ Undo Change</span>`;
              footer.innerHTML += `<span style="color: var(--accent-red); font-size: 11px; margin-top: 4px;">✕ فشل التراجع: ${escapeHtml(String(err))}</span>`;
            }
          });
        }
      } catch (e) {
        footer.innerHTML = `<span class="diff-decision-badge" style="color: var(--accent-red);">${escapeHtml(String(e))}</span>`;
      }
    } else {
      footer.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <button type="button" class="btn-diff-action btn-diff-undo">
            <span>↩ Undo Change</span>
          </button>
          <span class="diff-decision-badge" style="background: var(--accent-green-bg); color: var(--accent-green);">✓ تم تطبيق التعديل</span>
        </div>
      `;
      footer.querySelector(".btn-diff-undo")?.addEventListener("click", () => {
        footer.innerHTML = `<span class="badge-reverted">✓ تم التراجع واستعادة الملف الأصلي (Reverted)</span>`;
      });
    }
  });

  rejectBtn.addEventListener("click", async () => {
    if (invoke) {
      await invoke("apply_diff_action", { path, code: "", accept: false });
    }
    footer.innerHTML = `<span class="diff-decision-badge" style="color: var(--text-muted);">✕ تم رفض التعديل وإلغاء التغييرات</span>`;
  });

  latestDiffCard = { acceptBtn, rejectBtn };
  container.appendChild(card);
}

// --- STREAM EVENTS DISPATCHER ---
function handleStreamEvent(event) {
  const data = event.payload;
  if (!data) return;

  const lastTurn = streamMessages.querySelector(".turn-assistant:last-child");
  if (!lastTurn) return;

  const textBlock = lastTurn.querySelector(".assistant-text");

  if (data.type === "Token") {
    currentStreamBuffer += data.payload;
    if (textBlock) textBlock.innerHTML += escapeHtml(data.payload);
    scrollStreamToBottom();
  } else if (data.type === "ToolStart") {
    currentStreamBuffer = "";
    appendToolPill(lastTurn, data.payload.name, data.payload.input);
    scrollStreamToBottom();
  } else if (data.type === "ToolEnd") {
    const loader = lastTurn.querySelector(".tool-loader-dot:not(.done)");
    if (loader) {
      loader.classList.add("done");
      loader.parentElement.innerHTML += ` <span class="tool-status-icon">✓</span>`;
    }
    if (data.payload.name.includes("skeleton") || data.payload.name.includes("slice")) {
      appendLocusSlice(lastTurn, "src/main.rs", "Symbol: AST", data.payload.output);
    }
    scrollStreamToBottom();
  } else if (data.type === "DiffHunk") {
    const hunk = data.payload;
    const lines = hunk.code.split("\n").map(l => ({
      type: l.startsWith("+") ? "add" : l.startsWith("-") ? "del" : "normal",
      text: l
    }));
    renderInteractiveDiffCard(lastTurn, hunk.path, lines);
    scrollStreamToBottom();
  } else if (data.type === "Finish") {
    if (textBlock && currentStreamBuffer.trim()) {
      textBlock.innerHTML = renderMarkdown(currentStreamBuffer);
      conversationHistory.push({ role: "assistant", content: currentStreamBuffer });
    }
    currentStreamBuffer = "";
    isStreaming = false;
    sendBtn.disabled = false;
  }
}

// --- MCP CONFIG (TAB 2) ---
async function loadMcpConfig() {
  if (invoke) {
    try {
      mcpServers = await invoke("get_mcp_config");
    } catch (e) {
      console.warn("Failed to load MCP:", e);
    }
  }
  renderMcpList();
}

function renderMcpList() {
  const container = document.getElementById("mcpServersList");
  if (!container) return;
  container.innerHTML = "";

  mcpServers.forEach(srv => {
    const card = document.createElement("div");
    card.className = "mcp-card";
    card.innerHTML = `
      <div class="mcp-card-header">
        <div class="mcp-title">
          <span class="mcp-status-dot ${srv.enabled ? "" : "stopped"}"></span>
          <span>${escapeHtml(srv.name)}</span>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" ${srv.enabled ? "checked" : ""}>
          <span class="toggle-slider"></span>
        </label>
      </div>
      <p style="font-size: 12px; color: var(--text-muted);">${escapeHtml(srv.description)}</p>
      <div class="tool-tags-container">
        ${srv.tools.map(t => `<span class="tool-tag">${escapeHtml(t)}</span>`).join("")}
      </div>
    `;

    const toggle = card.querySelector("input[type='checkbox']");
    toggle.addEventListener("change", async () => {
      srv.enabled = toggle.checked;
      if (invoke) {
        mcpServers = await invoke("toggle_mcp_server", { id: srv.id, enabled: srv.enabled });
      }
      renderMcpList();
    });

    container.appendChild(card);
  });
}

// --- SKILLS CONFIG (TAB 3) ---
async function loadSkillsConfig() {
  if (invoke) {
    try {
      skillsList = await invoke("get_skills_config");
    } catch (e) {
      console.warn("Failed to load skills:", e);
    }
  }
  renderSkillsList();
}

function renderSkillsList() {
  const container = document.getElementById("skillsList");
  if (!container) return;
  container.innerHTML = "";

  skillsList.forEach(skill => {
    const card = document.createElement("div");
    card.className = "skill-card";
    card.innerHTML = `
      <div class="skill-card-header">
        <div class="skill-title">
          <span>${escapeHtml(skill.name)}</span>
          <span class="skill-category-badge">${escapeHtml(skill.category)}</span>
          <span class="skill-slash-tag">${escapeHtml(skill.slash_command)}</span>
        </div>
        <label class="toggle-switch" title="نشط دائماً">
          <input type="checkbox" ${skill.always_on ? "checked" : ""}>
          <span class="toggle-slider"></span>
        </label>
      </div>
      <p style="font-size: 12px; color: var(--text-muted);">${escapeHtml(skill.description)}</p>
      <div style="font-size: 11px; color: var(--text-faint);">
        <span>الأدوات المسموحة: ${skill.allowed_tools.join(", ")}</span>
      </div>
    `;

    const toggle = card.querySelector("input[type='checkbox']");
    toggle.addEventListener("change", async () => {
      skill.always_on = toggle.checked;
      if (invoke) {
        skillsList = await invoke("toggle_skill", { id: skill.id, alwaysOn: skill.always_on });
      }
      renderSkillsList();
    });

    container.appendChild(card);
  });
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
  // Model Dropdown
  activeModelPill.addEventListener("click", (e) => {
    e.stopPropagation();
    modelDropdownMenu.classList.toggle("hidden");
  });

  document.addEventListener("click", (e) => {
    if (!modelDropdownMenu.contains(e.target) && !activeModelPill.contains(e.target)) {
      modelDropdownMenu.classList.add("hidden");
    }
  });

  openVaultFromDropdown.addEventListener("click", () => {
    modelDropdownMenu.classList.add("hidden");
    openDrawer("tab-vault");
  });

  // Drawer
  if (openDrawerBtn) openDrawerBtn.addEventListener("click", () => openDrawer("tab-vault"));
  const mobileDrawerBtn = document.getElementById("mobileDrawerBtn");
  if (mobileDrawerBtn) mobileDrawerBtn.addEventListener("click", () => openDrawer("tab-vault"));

  // Mobile New Chat Button
  const mobileNewChatBtn = document.getElementById("mobileNewChatBtn");
  if (mobileNewChatBtn) {
    mobileNewChatBtn.addEventListener("click", () => {
      streamMessages.innerHTML = "";
      conversationHistory = [];
      if (welcomeBanner) welcomeBanner.style.display = "block";
      showToastNotification("تم بدء جلسة محادثة جديدة");
    });
  }

  if (closeDrawerBtn) closeDrawerBtn.addEventListener("click", closeDrawer);
  if (drawerOverlay) {
    drawerOverlay.addEventListener("click", (e) => {
      if (e.target === drawerOverlay) closeDrawer();
    });
  }

  // Drawer Tabs
  document.querySelectorAll(".drawer-tabs-nav .tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".drawer-tabs-nav .tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const targetTab = btn.getAttribute("data-tab");
      document.querySelectorAll(".tab-content-panel").forEach(p => p.classList.remove("active"));
      const panel = document.getElementById(targetTab);
      if (panel) panel.classList.add("active");
    });
  });

  // Add Connection Buttons
  if (openAddConnectionBtn) openAddConnectionBtn.addEventListener("click", openAddConnectionModal);
  if (emptyAddConnBtn) emptyAddConnBtn.addEventListener("click", openAddConnectionModal);
  if (closeConnectionModal) closeConnectionModal.addEventListener("click", () => connectionModal.classList.add("hidden"));

  // Presets in modal
  document.querySelectorAll(".preset-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      const presetKey = pill.getAttribute("data-preset");
      applyPreset(presetKey);
    });
  });

  // Key Visibility Toggle
  if (toggleKeyVisibility) {
    toggleKeyVisibility.addEventListener("click", () => {
      if (connKeyInput.type === "password") {
        connKeyInput.type = "text";
        toggleKeyVisibility.textContent = "🙈";
      } else {
        connKeyInput.type = "password";
        toggleKeyVisibility.textContent = "👁️";
      }
    });
  }

  // Model discovery in modal
  if (fetchModelsBtn) fetchModelsBtn.addEventListener("click", handleFetchModels);
  if (addManualModelBtn) addManualModelBtn.addEventListener("click", handleAddManualModel);
  if (saveConnectionBtn) saveConnectionBtn.addEventListener("click", handleSaveConnection);

  // Input Box & Send
  promptInput.addEventListener("input", handlePromptInput);
  sendBtn.addEventListener("click", handleSend);
  promptInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Tag pills
  document.querySelectorAll(".tag-pill").forEach(tag => {
    tag.addEventListener("click", () => {
      promptInput.value = tag.getAttribute("data-insert") + " ";
      promptInput.focus();
    });
  });

  // MCP Hub buttons
  const openAddMcpBtn = document.getElementById("openAddMcpBtn");
  if (openAddMcpBtn) openAddMcpBtn.addEventListener("click", () => addMcpModal.classList.remove("hidden"));
  const closeAddMcpModal = document.getElementById("closeAddMcpModal");
  if (closeAddMcpModal) closeAddMcpModal.addEventListener("click", () => addMcpModal.classList.add("hidden"));

  // Skills Hub buttons
  const openAddSkillBtn = document.getElementById("openAddSkillBtn");
  if (openAddSkillBtn) openAddSkillBtn.addEventListener("click", () => addSkillModal.classList.remove("hidden"));
  const closeAddSkillModal = document.getElementById("closeAddSkillModal");
  if (closeAddSkillModal) closeAddSkillModal.addEventListener("click", () => addSkillModal.classList.add("hidden"));

  // Project Memory Button
  const openMemoryBtn = document.getElementById("openMemoryBtn");
  if (openMemoryBtn) openMemoryBtn.addEventListener("click", () => openDrawer("tab-memory"));
  const saveMemoryBtn = document.getElementById("saveMemoryBtn");
  if (saveMemoryBtn) saveMemoryBtn.addEventListener("click", handleSaveMemory);
  const reloadMemoryBtn = document.getElementById("reloadMemoryBtn");
  if (reloadMemoryBtn) reloadMemoryBtn.addEventListener("click", loadProjectMemory);

  // Remote Bridge Buttons
  const startDaemonBtn = document.getElementById("startDaemonBtn");
  if (startDaemonBtn) startDaemonBtn.addEventListener("click", () => handleToggleDaemon(true));
  const stopDaemonBtn = document.getElementById("stopDaemonBtn");
  if (stopDaemonBtn) stopDaemonBtn.addEventListener("click", () => handleToggleDaemon(false));
  const connectRemoteBtn = document.getElementById("connectRemoteBtn");
  if (connectRemoteBtn) connectRemoteBtn.addEventListener("click", handleConnectRemote);
  const disconnectRemoteBtn = document.getElementById("disconnectRemoteBtn");
  if (disconnectRemoteBtn) disconnectRemoteBtn.addEventListener("click", handleDisconnectRemote);
  const copyDaemonUrlBtn = document.getElementById("copyDaemonUrlBtn");
  if (copyDaemonUrlBtn) copyDaemonUrlBtn.addEventListener("click", () => {
    const inp = document.getElementById("daemonUrlInput");
    if (inp) {
      navigator.clipboard.writeText(inp.value);
      copyDaemonUrlBtn.textContent = "تم النسخ ✓";
      setTimeout(() => copyDaemonUrlBtn.textContent = "نسخ الرابط", 2000);
    }
  });

  // Tauri Streaming & Auto-Failover Key Rotation Events
  if (listen) {
    listen("agent-stream-event", handleStreamEvent);
    listen("key-rotation-event", (event) => {
      const p = event.payload;
      showToastNotification(p?.message || `🔄 Switched to Backup Key #${p?.key_index || 2}`);
    });
  }
}

// --- KEYBOARD SHORTCUTS ---
function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      modelDropdownMenu.classList.toggle("hidden");
    }

    if ((e.ctrlKey || e.metaKey) && e.key === ",") {
      e.preventDefault();
      if (drawerOverlay.classList.contains("hidden")) {
        openDrawer("tab-vault");
      } else {
        closeDrawer();
      }
    }

    if (e.altKey && e.key.toLowerCase() === "a") {
      e.preventDefault();
      if (latestDiffCard?.acceptBtn) latestDiffCard.acceptBtn.click();
    }

    if (e.altKey && e.key.toLowerCase() === "r") {
      e.preventDefault();
      if (latestDiffCard?.rejectBtn) latestDiffCard.rejectBtn.click();
    }

    if (e.key === "Escape") {
      modelDropdownMenu.classList.add("hidden");
      autocompletePopup.classList.add("hidden");
      connectionModal.classList.add("hidden");
      addMcpModal.classList.add("hidden");
      addSkillModal.classList.add("hidden");
      closeDrawer();
    }
  });
}

function openDrawer(tabId = "tab-vault") {
  drawerOverlay.classList.remove("hidden");
  const tabBtn = document.querySelector(`.drawer-tabs-nav .tab-btn[data-tab="${tabId}"]`);
  if (tabBtn) tabBtn.click();
}

function closeDrawer() {
  drawerOverlay.classList.add("hidden");
}

// --- AUTOCOMPLETE POPUP ---
function handlePromptInput() {
  promptInput.style.height = "auto";
  promptInput.style.height = Math.min(promptInput.scrollHeight, 160) + "px";

  const val = promptInput.value;
  if (val.startsWith("/")) {
    showSlashMenu(val);
  } else if (val.includes("@")) {
    showAtMenu(val);
  } else {
    autocompletePopup.classList.add("hidden");
  }
}

function showSlashMenu(val) {
  popupHeader.textContent = "المهارات والأوامر السريعة (Slash Commands)";
  popupList.innerHTML = "";

  const slashOptions = [
    { cmd: "/skills", desc: "فتح درج إدارة المهارات والأتمتة" },
    { cmd: "/memory", desc: "فتح وتعديل الذاكرة المعمارية للمشروع (.locus/memory.md)" },
    { cmd: "/remote", desc: "فتح إعدادات جسر التحكم عن بعد بين الهاتف والحاسوب" },
    { cmd: "/review", desc: "فحص أمان الكود والتكامل عبر LOCUS AST" },
    { cmd: "/automate", desc: "أتمتة أوامر البناء والنشر في المشروع" },
    { cmd: "/rea", desc: "فحص وتحليل الثنائيات والبروتوكولات (Reverse Engineering)" },
    { cmd: "/locus", desc: "ضغط سياق الملفات وتوليد AST Skeleton (-86%)" },
    { cmd: "/clear", desc: "مسح التدفق الخطي الحالي والبدء من جديد" }
  ];

  const filtered = slashOptions.filter(o => o.cmd.startsWith(val.trim()));
  if (filtered.length === 0) {
    autocompletePopup.classList.add("hidden");
    return;
  }

  filtered.forEach(opt => {
    const item = document.createElement("div");
    item.className = "popup-item";
    item.innerHTML = `
      <div class="popup-item-left"><span class="popup-item-cmd">${opt.cmd}</span></div>
      <span class="popup-item-desc">${opt.desc}</span>
    `;
    item.addEventListener("click", () => {
      promptInput.value = opt.cmd + " ";
      autocompletePopup.classList.add("hidden");
      promptInput.focus();
    });
    popupList.appendChild(item);
  });

  autocompletePopup.classList.remove("hidden");
}

function showAtMenu(val) {
  popupHeader.textContent = "سياق خوادم الـ MCP وملفات المشروع";
  popupList.innerHTML = "";

  const atOptions = [
    { target: "@mcp:rea", desc: "استدعاء خادم الهندسة العكسية وفحص الباينري" },
    { target: "@mcp:web_search", desc: "البحث الحي عبر الإنترنت وقراءة الروابط" },
    { target: "@mcp:system_automation", desc: "تنفيذ مهام النظام وإدارة الملفات" },
    { target: "@locus:ast", desc: "سحب شجرة الـ AST للملف الحالي" }
  ];

  atOptions.forEach(opt => {
    const item = document.createElement("div");
    item.className = "popup-item";
    item.innerHTML = `
      <div class="popup-item-left"><span class="popup-item-cmd">${opt.target}</span></div>
      <span class="popup-item-desc">${opt.desc}</span>
    `;
    item.addEventListener("click", () => {
      promptInput.value = opt.target + " ";
      autocompletePopup.classList.add("hidden");
      promptInput.focus();
    });
    popupList.appendChild(item);
  });

  autocompletePopup.classList.remove("hidden");
}

async function checkLocusPulse() {
  if (invoke) {
    try {
      const status = await invoke("check_locus_status");
      const locusBadge = document.getElementById("locusBadge");
      if (status.available && locusBadge) {
        locusBadge.title = `LOCUS ${status.version} Online (${status.path})`;
      }
    } catch (e) {
      console.warn("LOCUS check:", e);
    }
  }
}

function scrollStreamToBottom() {
  streamViewport.scrollTop = streamViewport.scrollHeight;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderMarkdown(md) {
  if (!md) return "";

  const codeBlocks = [];
  let processed = md.replace(/```([a-zA-Z0-9_-]*)\r?\n([\s\S]*?)```/g, (match, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre><code class="language-${lang || 'text'}">${escapeHtml(code.trim())}</code></pre>`);
    return `__CODE_BLOCK_${idx}__`;
  });

  processed = escapeHtml(processed);

  codeBlocks.forEach((block, idx) => {
    processed = processed.replace(`__CODE_BLOCK_${idx}__`, block);
  });

  processed = processed.replace(/`([^`]+)`/g, '<code>$1</code>');
  processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  processed = processed.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  processed = processed.split(/\n\n+/).map(p => {
    if (p.includes('<pre><code')) return p;
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).join('');

  return processed;
}

// =========================================================================
// 1. AUTO-FAILOVER KEY ROTATION TOAST NOTIFICATION
// =========================================================================
function showToastNotification(message) {
  const existing = document.querySelector(".key-rotation-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "key-rotation-toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// =========================================================================
// 3. ANDROID-TO-PC REMOTE DAEMON BRIDGE
// =========================================================================
let remoteBridgeMode = localStorage.getItem("opencode_bridge_mode") || "standalone";
let remoteDaemonHost = localStorage.getItem("opencode_remote_host") || "";
let remoteDaemonPin = localStorage.getItem("opencode_remote_pin") || "8492";

async function loadDaemonStatus() {
  const hostDot = document.getElementById("hostDaemonDot");
  const startBtn = document.getElementById("startDaemonBtn");
  const stopBtn = document.getElementById("stopDaemonBtn");
  const urlDisplay = document.getElementById("daemonUrlDisplay");
  const urlInput = document.getElementById("daemonUrlInput");
  const chip = document.getElementById("daemonStatusChip");
  const chipLabel = document.getElementById("daemonStatusLabel");
  const modeBadge = document.getElementById("currentBridgeModeBadge");
  const clientDot = document.getElementById("clientConnDot");
  const connectBtn = document.getElementById("connectRemoteBtn");
  const disconnectBtn = document.getElementById("disconnectRemoteBtn");
  const remoteHostInput = document.getElementById("remoteHostInput");
  const remotePinInput = document.getElementById("remotePinInput");

  if (modeBadge) {
    modeBadge.textContent = remoteBridgeMode === "remote_client" 
      ? `الوضع: تحكم عن بُعد بالحاسوب (${remoteDaemonHost})`
      : "الوضع: محلي (Standalone)";
  }

  if (remoteHostInput && remoteDaemonHost) remoteHostInput.value = remoteDaemonHost;
  if (remotePinInput && remoteDaemonPin) remotePinInput.value = remoteDaemonPin;

  if (remoteBridgeMode === "remote_client") {
    if (clientDot) clientDot.className = "status-indicator-dot";
    if (connectBtn) connectBtn.classList.add("hidden");
    if (disconnectBtn) disconnectBtn.classList.remove("hidden");
    if (chip) {
      chip.classList.remove("hidden");
      chipLabel.textContent = `Remote: ${remoteDaemonHost.replace(/^https?:\/\//, "")}`;
    }
  }

  if (invoke) {
    try {
      const status = await invoke("get_daemon_status");
      if (status.is_running) {
        if (hostDot) { hostDot.className = "status-indicator-dot"; }
        if (startBtn) startBtn.classList.add("hidden");
        if (stopBtn) stopBtn.classList.remove("hidden");
        if (urlDisplay) urlDisplay.classList.remove("hidden");
        if (urlInput) urlInput.value = status.connection_url;
        if (chip && remoteBridgeMode !== "remote_client") {
          chip.classList.remove("hidden");
          chipLabel.textContent = `Daemon: ${status.port}`;
        }
      } else {
        if (hostDot) { hostDot.className = "status-indicator-dot stopped"; }
        if (startBtn) startBtn.classList.remove("hidden");
        if (stopBtn) stopBtn.classList.add("hidden");
        if (urlDisplay) urlDisplay.classList.add("hidden");
        if (chip && remoteBridgeMode !== "remote_client") {
          chip.classList.add("hidden");
        }
      }
    } catch (e) {
      console.warn("Daemon status check:", e);
    }
  }
}

async function handleToggleDaemon(start) {
  const port = parseInt(document.getElementById("daemonPortInput")?.value || "8765", 10);
  const pin = document.getElementById("daemonPinInput")?.value.trim() || "8492";

  if (invoke) {
    try {
      if (start) {
        await invoke("start_remote_daemon", { port, pin });
        showToastNotification(`🟢 تم تشغيل خادم التحكم على المنفذ ${port}`);
      } else {
        await invoke("stop_remote_daemon");
        showToastNotification("⏹️ تم إيقاف خادم التحكم");
      }
      await loadDaemonStatus();
    } catch (e) {
      alert(`خطأ في خادم التحكم: ${e}`);
    }
  }
}

async function handleConnectRemote() {
  const host = document.getElementById("remoteHostInput")?.value.trim();
  const pin = document.getElementById("remotePinInput")?.value.trim();
  const feedback = document.getElementById("remoteConnFeedback");
  const clientDot = document.getElementById("clientConnDot");
  const connectBtn = document.getElementById("connectRemoteBtn");
  const disconnectBtn = document.getElementById("disconnectRemoteBtn");
  const chip = document.getElementById("daemonStatusChip");
  const chipLabel = document.getElementById("daemonStatusLabel");

  if (!host) {
    if (feedback) feedback.innerHTML = `<span style="color: var(--accent-red);">الرجاء إدخال عنوان خادم الحاسوب</span>`;
    return;
  }

  if (feedback) feedback.innerHTML = `<span style="color: var(--accent-blue);">جاري اختبار الاتصال بالحاسوب...</span>`;

  try {
    const cleanHost = host.replace(/\/+$/, "");
    const res = await fetch(`${cleanHost}/api/status`, {
      headers: { "x-daemon-pin": pin }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.status === "online") {
      remoteBridgeMode = "remote_client";
      remoteDaemonHost = cleanHost;
      remoteDaemonPin = pin;
      localStorage.setItem("opencode_bridge_mode", "remote_client");
      localStorage.setItem("opencode_remote_host", cleanHost);
      localStorage.setItem("opencode_remote_pin", pin);

      if (feedback) feedback.innerHTML = `<span style="color: var(--accent-green);">🟢 متصل بنجاح! يعمل التطبيق كجهاز تحكم بنواة الحاسوب (LOCUS D:\\ Active).</span>`;
      if (clientDot) clientDot.className = "status-indicator-dot";
      if (connectBtn) connectBtn.classList.add("hidden");
      if (disconnectBtn) disconnectBtn.classList.remove("hidden");
      if (chip) {
        chip.classList.remove("hidden");
        chipLabel.textContent = `Remote: ${cleanHost.replace(/^https?:\/\//, "")}`;
      }
      showToastNotification(`🟢 متصل بالحاسوب: ${cleanHost}`);
      loadDaemonStatus();
    }
  } catch (err) {
    if (feedback) feedback.innerHTML = `<span style="color: var(--accent-red);">✕ فشل الاتصال بالحاسوب: ${escapeHtml(String(err))}. تأكد من عمل الخادم على نفس الشبكة والـ PIN.</span>`;
  }
}

function handleDisconnectRemote() {
  remoteBridgeMode = "standalone";
  localStorage.setItem("opencode_bridge_mode", "standalone");
  const clientDot = document.getElementById("clientConnDot");
  const connectBtn = document.getElementById("connectRemoteBtn");
  const disconnectBtn = document.getElementById("disconnectRemoteBtn");
  const feedback = document.getElementById("remoteConnFeedback");
  const chip = document.getElementById("daemonStatusChip");

  if (clientDot) clientDot.className = "status-indicator-dot stopped";
  if (connectBtn) connectBtn.classList.remove("hidden");
  if (disconnectBtn) disconnectBtn.classList.add("hidden");
  if (feedback) feedback.innerHTML = `<span style="color: var(--text-muted);">تم فصل الاتصال والعودة للوضع المحلي (Standalone).</span>`;
  if (chip) chip.classList.add("hidden");
  showToastNotification("تم فصل الاتصال بالخادم والعودة للوضع المحلي");
  loadDaemonStatus();
}

// =========================================================================
// 4. PERSISTENT PROJECT MEMORY (.locus/memory.md)
// =========================================================================
async function loadProjectMemory() {
  const textarea = document.getElementById("projectMemoryTextarea");
  const msg = document.getElementById("memoryStatusMsg");
  if (!textarea) return;

  if (invoke) {
    try {
      const memory = await invoke("get_project_memory", { cwd: "." });
      textarea.value = memory;
      if (msg) msg.textContent = "";
    } catch (e) {
      if (msg) {
        msg.textContent = `تعذر تحميل الذاكرة: ${e}`;
        msg.style.color = "var(--accent-red)";
      }
    }
  } else {
    textarea.value = "# الذاكرة المعمارية (Mock)\n- Framework: Tauri v2\n- Aesthetic: Claude Code (#0D0D0D)";
  }
}

async function handleSaveMemory() {
  const textarea = document.getElementById("projectMemoryTextarea");
  const msg = document.getElementById("memoryStatusMsg");
  if (!textarea) return;

  const content = textarea.value;
  if (invoke) {
    try {
      await invoke("save_project_memory", { content, cwd: "." });
      if (msg) {
        msg.textContent = "✓ تم حفظ الذاكرة المعمارية بنجاح وتحديث سياق النظام الدائم.";
        msg.style.color = "var(--accent-green)";
        setTimeout(() => { if (msg) msg.textContent = ""; }, 3500);
      }
      showToastNotification("✓ تم تحديث ذاكرة المشروع الدائمة (.locus/memory.md)");
    } catch (e) {
      if (msg) {
        msg.textContent = `✕ فشل الحفظ: ${e}`;
        msg.style.color = "var(--accent-red)";
      }
    }
  } else {
    if (msg) {
      msg.textContent = "✓ تم الحفظ محلياً.";
      msg.style.color = "var(--accent-green)";
    }
  }
}

// =========================================================================
// 5. SYSTEM AUTOMATION SAFETY GATE CARD
// =========================================================================
function renderSafetyGateCard(container, reqId, command, reason, onAuthorized, onBlocked) {
  const card = document.createElement("div");
  card.className = "safety-gate-card";
  card.innerHTML = `
    <div class="safety-gate-header">
      <span class="safety-badge-red">⚠️ تصريح أمني مطلوب (Destructive / System-Level)</span>
      <span class="pulse-indicator" style="background:#EF4444;"></span>
    </div>
    <p class="safety-reason"><strong>سبب التوقف:</strong> ${escapeHtml(reason)}</p>
    <div class="safety-command-box">
      <pre><code>${escapeHtml(command)}</code></pre>
    </div>
    <div class="safety-actions">
      <button type="button" class="btn-safety-authorize">⚠️ Authorize & Run</button>
      <button type="button" class="btn-safety-block">✕ Block</button>
    </div>
  `;

  const authBtn = card.querySelector(".btn-safety-authorize");
  const blockBtn = card.querySelector(".btn-safety-block");
  const actionsBox = card.querySelector(".safety-actions");

  authBtn.addEventListener("click", async () => {
    if (invoke) {
      await invoke("authorize_safety_command", { requestId: reqId, approved: true });
    }
    actionsBox.innerHTML = `<span class="diff-decision-badge" style="background: var(--accent-green-bg); color: var(--accent-green);">✓ تم التصريح بالأمر وتنفيذه</span>`;
    if (onAuthorized) onAuthorized();
  });

  blockBtn.addEventListener("click", async () => {
    if (invoke) {
      await invoke("authorize_safety_command", { requestId: reqId, approved: false });
    }
    actionsBox.innerHTML = `<span class="diff-decision-badge" style="color: var(--accent-red);">✕ تم حظر تنفيذ الأمر من قبل المستخدم</span>`;
    if (onBlocked) onBlocked();
  });

  container.appendChild(card);
  scrollStreamToBottom();
}
