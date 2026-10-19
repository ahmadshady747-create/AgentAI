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
    defaultModels: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"]
  },
  gemini: {
    name: "Google Gemini",
    url: "https://generativelanguage.googleapis.com/v1beta/openai",
    portal: "https://aistudio.google.com/app/apikey",
    hint: "نماذج Google Gemini 1.5 & 2.0 مجانية 100% مع نافذة سياق تصل لمليوني توكن.",
    defaultModels: ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"]
  },
  nvidia: {
    name: "NVIDIA NIM",
    url: "https://integrate.api.nvidia.com/v1",
    portal: "https://build.nvidia.com/",
    hint: "رصيد 1,000 نقطة لتشغيل نماذج DeepSeek R1 و Llama 3.3 المستضافة على إنفيديا.",
    defaultModels: ["meta/llama-3.3-70b-instruct", "deepseek-ai/deepseek-r1", "qwen/qwen2.5-coder-32b-instruct"]
  },
  openrouter: {
    name: "OpenRouter",
    url: "https://openrouter.ai/api/v1",
    portal: "https://openrouter.ai/keys",
    hint: "بوابة عالمية موحدة لمئات النماذج المفتوحة والمجانية.",
    defaultModels: ["meta-llama/llama-3.3-70b-instruct:free", "deepseek/deepseek-r1:free", "google/gemini-2.0-flash-exp:free"]
  },
  openai: {
    name: "OpenAI Official",
    url: "https://api.openai.com/v1",
    portal: "https://platform.openai.com/api-keys",
    hint: "الوصول المباشر لنماذج GPT-4o و o3-mini الرسمية.",
    defaultModels: ["gpt-4o", "gpt-4o-mini", "o3-mini"]
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

  // Update Drawer status indicator
  const hasActive = apiConnections.some(c => c.enabled && c.api_key.trim().length > 0);
  if (drawerKeyIndicator) {
    drawerKeyIndicator.style.backgroundColor = hasActive ? "var(--accent-green)" : "var(--accent-amber)";
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
  activeModelId = first.all_models[0] || "default";
}

// --- RENDER TOP BAR PILL & DROPDOWN ---
function updateTopBarPill() {
  const currentConn = apiConnections.find(c => c.id === activeConnectionId);

  if (!currentConn || !activeModelId) {
    activeProviderDot.style.backgroundColor = "var(--accent-amber)";
    activeProviderTag.textContent = "Universal";
    activeModelTitle.textContent = "أضف اتصالاً للبدء (+)";
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
  connPortalHint.innerHTML = "";
  discoveryStatus.textContent = "";
  discoveredModelsList.innerHTML = "";

  // Apply default preset (Groq)
  applyPreset("groq");

  connectionModal.classList.remove("hidden");
}

function openEditConnectionModal(conn) {
  connModalId.value = conn.id;
  connModalTitle.textContent = `تعديل الاتصال: ${conn.name}`;
  connNameInput.value = conn.name;
  connBaseUrlInput.value = conn.base_url;
  connKeyInput.value = conn.api_key;
  connPortalHint.innerHTML = "";
  discoveryStatus.textContent = "";
  discoveredModelsList.innerHTML = "";

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
    connNameInput.placeholder = "مثلاً: المزود الخاص بي";
    connBaseUrlInput.placeholder = "https://your-api.com/v1";
    connPortalHint.innerHTML = `<span>${p.hint}</span>`;
    return;
  }

  connNameInput.value = p.name;
  connBaseUrlInput.value = p.url;
  connPortalHint.innerHTML = `
    <span>${p.hint}</span> 
    ${p.portal ? `<a href="#" class="direct-link" data-url="${p.portal}" style="margin-right: 6px;">🔗 رابط استخراج المفتاح</a>` : ""}
  `;

  // Attach direct link click handler
  const link = connPortalHint.querySelector(".direct-link");
  if (link) {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const url = link.getAttribute("data-url");
      if (invoke && url) {
        invoke("open_external_url", { url });
      } else if (url) {
        window.open(url, "_blank");
      }
    });
  }

  // Pre-fill default models in checklist
  renderDiscoveredChecklist(p.defaultModels, [p.defaultModels[0]]);
}

function renderDiscoveredChecklist(models, pinned = []) {
  discoveredModelsList.innerHTML = "";
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

// Fetch models via native backend
async function handleFetchModels() {
  const baseUrl = connBaseUrlInput.value.trim();
  const apiKey = connKeyInput.value.trim();

  if (!baseUrl) {
    discoveryStatus.textContent = "الرجاء إدخال رابط Base URL أولاً";
    discoveryStatus.style.color = "var(--accent-red)";
    return;
  }

  fetchModelsBtn.disabled = true;
  fetchModelsBtn.textContent = "جاري الجلب...";
  discoveryStatus.textContent = "يتم الاتصال بـ /models...";
  discoveryStatus.style.color = "var(--accent-blue)";

  try {
    let models = [];
    if (invoke) {
      models = await invoke("fetch_connection_models", { baseUrl, apiKey });
    } else {
      models = ["model-mock-1", "model-mock-2", "model-mock-3"];
    }

    if (models.length === 0) {
      discoveryStatus.textContent = "تم الاتصال ولكن لم يتم العثور على نماذج.";
      discoveryStatus.style.color = "var(--accent-amber)";
    } else {
      discoveryStatus.textContent = `✓ تم اكتشاف ${models.length} نموذج بنجاح!`;
      discoveryStatus.style.color = "var(--accent-green)";

      // Select previously checked or first 2
      const existingChecked = Array.from(discoveredModelsList.querySelectorAll("input:checked")).map(i => i.value);
      const defaultPins = existingChecked.length > 0 ? existingChecked : models.slice(0, 2);
      renderDiscoveredChecklist(models, defaultPins);
    }
  } catch (err) {
    discoveryStatus.textContent = `✕ تعذر الجلب التلقائي: ${err}`;
    discoveryStatus.style.color = "var(--accent-red)";
  } finally {
    fetchModelsBtn.disabled = false;
    fetchModelsBtn.textContent = "Fetch Models 🔄";
  }
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

  // Gather selected pinned models & all discovered
  const allCheckboxes = Array.from(discoveredModelsList.querySelectorAll("input[type='checkbox']"));
  const pinned_models = allCheckboxes.filter(c => c.checked).map(c => c.value);
  const all_models = allCheckboxes.map(c => c.value);

  const connectionObj = {
    id: existingId || `conn_${Date.now()}`,
    name,
    base_url: baseUrl,
    api_key: apiKey,
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

  appendUserMessage(text);
  conversationHistory.push({ role: "user", content: text });

  const assistantTurn = createAssistantTurn();
  streamMessages.appendChild(assistantTurn.container);
  scrollStreamToBottom();

  isStreaming = true;
  sendBtn.disabled = true;

  const currentConn = apiConnections.find(c => c.id === activeConnectionId);

  // If active connection and key are present, send via universal native request
  if (currentConn && currentConn.api_key.trim() && invoke) {
    try {
      appendToolPill(assistantTurn.container, "Universal Router", `Connecting to ${currentConn.name} (${activeModelId})...`);

      const cleanBase = currentConn.base_url.trim().trim_end_matches('/');
      const endpoint = cleanBase.endsWith("/chat/completions") 
        ? cleanBase 
        : `${cleanBase}/chat/completions`;

      const payload = {
        model: activeModelId,
        messages: conversationHistory,
        stream: false,
        temperature: 0.6
      };

      const rawResponse = await invoke("send_ai_chat_request", {
        endpoint,
        apiKey: currentConn.api_key,
        payloadJson: JSON.stringify(payload)
      });

      const parsed = JSON.parse(rawResponse);
      const answer = parsed.choices?.[0]?.message?.content || "✓ تم استلام الرد بنجاح.";
      
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
      assistantTurn.textBlock.innerHTML = `<span style="color: var(--accent-red)">خطأ في الاتصال بنقطة النهاية: ${err}</span>`;
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
    if (invoke) {
      const code = lines.filter(l => l.type === "add").map(l => l.text.substring(2)).join("\n");
      try {
        const res = await invoke("apply_diff_action", { path, code, accept: true });
        footer.innerHTML = `<span class="diff-decision-badge" style="background: var(--accent-green-bg); color: var(--accent-green);">${res}</span>`;
      } catch (e) {
        footer.innerHTML = `<span class="diff-decision-badge" style="color: var(--accent-red);">${e}</span>`;
      }
    } else {
      footer.innerHTML = `<span class="diff-decision-badge" style="background: var(--accent-green-bg); color: var(--accent-green);">✓ تم قبول التعديل بنجاح</span>`;
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
  openDrawerBtn.addEventListener("click", () => openDrawer("tab-vault"));
  closeDrawerBtn.addEventListener("click", closeDrawer);
  drawerOverlay.addEventListener("click", (e) => {
    if (e.target === drawerOverlay) closeDrawer();
  });

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

  // Tauri Streaming Events
  if (listen) {
    listen("agent-stream-event", handleStreamEvent);
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
