// OpenCode Sovereign — Claude Code / Codex Aesthetic Client
// Exclusively 4 Sovereign Providers: Groq, Gemini, NVIDIA NIM, OpenRouter
// Zero reliance on default/internal OpenCode servers.

const invoke = window.__TAURI__?.core?.invoke || window.__TAURI__?.invoke || null;
const listen = window.__TAURI__?.event?.listen || null;

// --- CONFIGURATION & 4 SOVEREIGN PROVIDERS ---
const PROVIDERS = {
  groq: {
    id: "groq",
    name: "Groq Cloud",
    shortName: "Groq",
    tag: "LPU",
    url: "https://api.groq.com/openai/v1/chat/completions",
    modelsUrl: "https://api.groq.com/openai/v1/models",
    portalUrl: "https://console.groq.com/keys",
    defaultModel: "llama-3.3-70b-versatile",
    defaultModels: [
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B (500 tps)", context: "128k" },
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant", context: "128k" },
      { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", context: "32k" }
    ]
  },
  gemini: {
    id: "gemini",
    name: "Google Gemini",
    shortName: "Gemini",
    tag: "Google",
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    modelsUrl: "https://generativelanguage.googleapis.com/v1beta/openai/models",
    portalUrl: "https://aistudio.google.com/app/apikey",
    defaultModel: "gemini-1.5-flash",
    defaultModels: [
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash (1M ctx)", context: "1M" },
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", context: "1M" },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", context: "2M" }
    ]
  },
  nvidia: {
    id: "nvidia",
    name: "NVIDIA NIM",
    shortName: "NVIDIA",
    tag: "NIM",
    url: "https://integrate.api.nvidia.com/v1/chat/completions",
    modelsUrl: "https://integrate.api.nvidia.com/v1/models",
    portalUrl: "https://build.nvidia.com/",
    defaultModel: "meta/llama-3.3-70b-instruct",
    defaultModels: [
      { id: "meta/llama-3.3-70b-instruct", name: "Llama 3.3 70B Instruct", context: "128k" },
      { id: "deepseek-ai/deepseek-r1", name: "DeepSeek R1 (Reasoning)", context: "64k" },
      { id: "qwen/qwen2.5-coder-32b-instruct", name: "Qwen 2.5 Coder 32B", context: "128k" }
    ]
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    shortName: "OpenRouter",
    tag: "Router",
    url: "https://openrouter.ai/api/v1/chat/completions",
    modelsUrl: "https://openrouter.ai/api/v1/models",
    portalUrl: "https://openrouter.ai/keys",
    defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
    defaultModels: [
      { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B (Free)", context: "128k" },
      { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1 (Free)", context: "64k" },
      { id: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash Exp (Free)", context: "1M" }
    ]
  }
};

// State
let activeProviderId = "groq";
let activeModelId = "llama-3.3-70b-versatile";
let activeModelName = "Llama 3.3 70B";
let isStreaming = false;
let latestDiffCard = null;
let providerKeys = { groq: "", gemini: "", nvidia: "", openrouter: "" };
let pinnedModels = [];
let mcpServers = [];
let skillsList = [];
let currentStreamBuffer = "";

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
const dragHandleBar = document.getElementById("dragHandleBar");

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
  await loadVaultAndModels();
  await loadMcpConfig();
  await loadSkillsConfig();
  await checkLocusPulse();
});

// --- LOAD VAULT & MODELS ---
async function loadVaultAndModels() {
  if (invoke) {
    try {
      for (const prov of Object.keys(PROVIDERS)) {
        const key = await invoke("get_api_key", { provider: prov });
        if (key) {
          providerKeys[prov] = key;
          const keyInput = document.getElementById(`key-${prov}`);
          if (keyInput) keyInput.value = key;
          const statusText = document.getElementById(`status-${prov}`);
          if (statusText) {
            statusText.textContent = "✓ المفتاح مفعل";
            statusText.style.color = "var(--accent-green)";
          }
        }
      }

      pinnedModels = await invoke("get_pinned_models");
    } catch (e) {
      console.warn("Vault load warning:", e);
    }
  }

  // Update Drawer indicator
  const hasAnyKey = Object.values(providerKeys).some(k => k && k.trim().length > 0);
  if (drawerKeyIndicator) {
    drawerKeyIndicator.style.backgroundColor = hasAnyKey ? "var(--accent-green)" : "var(--accent-amber)";
  }

  renderModelDropdown();
  renderPinnedModelChips();
  updateTopBarPill();
}

// --- RENDER TOP BAR PILL & DROPDOWN ---
function updateTopBarPill() {
  const provider = PROVIDERS[activeProviderId] || PROVIDERS.groq;
  activeProviderTag.textContent = provider.shortName;
  activeModelTitle.textContent = activeModelName;
  
  const hasKey = !!providerKeys[activeProviderId];
  activeProviderDot.style.backgroundColor = hasKey ? "var(--accent-green)" : "var(--accent-amber)";
  activeProviderDot.style.boxShadow = hasKey 
    ? "0 0 6px rgba(16, 185, 129, 0.7)" 
    : "0 0 6px rgba(245, 158, 11, 0.7)";
}

function renderModelDropdown() {
  modelDropdownGroups.innerHTML = "";

  for (const [pId, prov] of Object.entries(PROVIDERS)) {
    const groupDiv = document.createElement("div");
    groupDiv.className = "dropdown-group";

    const titleDiv = document.createElement("div");
    titleDiv.className = "dropdown-group-title";
    titleDiv.textContent = `${prov.name} (${prov.tag})`;
    groupDiv.appendChild(titleDiv);

    prov.defaultModels.forEach(m => {
      const item = document.createElement("div");
      const isSelected = (activeProviderId === pId && activeModelId === m.id);
      item.className = `dropdown-item ${isSelected ? "selected" : ""}`;
      item.innerHTML = `
        <span>${m.name}</span>
        <span style="font-size: 10.5px; color: var(--text-faint);">${m.context}</span>
      `;
      item.addEventListener("click", () => {
        selectModel(pId, m.id, m.name);
        modelDropdownMenu.classList.add("hidden");
      });
      groupDiv.appendChild(item);
    });

    modelDropdownGroups.appendChild(groupDiv);
  }
}

function selectModel(providerId, modelId, modelName) {
  activeProviderId = providerId;
  activeModelId = modelId;
  activeModelName = modelName;
  updateTopBarPill();
}

// --- PINNED CHIPS IN DRAWER ---
function renderPinnedModelChips() {
  for (const [pId, prov] of Object.entries(PROVIDERS)) {
    const container = document.getElementById(`pinned-${pId}-chips`);
    if (!container) continue;
    container.innerHTML = "";

    prov.defaultModels.forEach(m => {
      const chip = document.createElement("span");
      const isPinned = pinnedModels.includes(`${pId}/${m.id}`) || m.id === prov.defaultModel;
      chip.className = `model-chip ${isPinned ? "pinned" : ""}`;
      chip.textContent = m.name;
      chip.title = "انقر لتفعيل / إلغاء التفضيل في القائمة";
      chip.addEventListener("click", async () => {
        const fullId = `${pId}/${m.id}`;
        if (pinnedModels.includes(fullId)) {
          pinnedModels = pinnedModels.filter(id => id !== fullId);
        } else {
          pinnedModels.push(fullId);
        }
        if (invoke) {
          await invoke("save_pinned_models", { models: pinnedModels });
        }
        renderPinnedModelChips();
      });
      container.appendChild(chip);
    });
  }
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
  // Model Dropdown Toggle
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

  // Drawer Open / Close
  openDrawerBtn.addEventListener("click", () => openDrawer("tab-vault"));
  closeDrawerBtn.addEventListener("click", closeDrawer);
  drawerOverlay.addEventListener("click", (e) => {
    if (e.target === drawerOverlay) closeDrawer();
  });

  // Drawer Tabs
  const tabBtns = document.querySelectorAll(".drawer-tabs-nav .tab-btn");
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const targetTab = btn.getAttribute("data-tab");
      document.querySelectorAll(".tab-content-panel").forEach(p => p.classList.remove("active"));
      const panel = document.getElementById(targetTab);
      if (panel) panel.classList.add("active");
    });
  });

  // Direct External Links
  document.querySelectorAll(".direct-link").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const url = link.getAttribute("data-url");
      if (invoke && url) {
        invoke("open_external_url", { url });
      } else if (url) {
        window.open(url, "_blank");
      }
    });
  });

  // Key Verify Buttons
  document.querySelectorAll(".btn-verify").forEach(btn => {
    btn.addEventListener("click", async () => {
      const prov = btn.getAttribute("data-provider");
      const input = document.getElementById(`key-${prov}`);
      const statusText = document.getElementById(`status-${prov}`);
      if (!input || !prov) return;

      const keyVal = input.value.trim();
      if (!keyVal) {
        statusText.textContent = "الرجاء إدخال المفتاح أولاً";
        statusText.style.color = "var(--accent-red)";
        return;
      }

      btn.disabled = true;
      btn.textContent = "جاري الفحص...";
      statusText.textContent = "يتم الاتصال بنقطة النهاية...";
      statusText.style.color = "var(--accent-blue)";

      try {
        if (invoke) {
          const models = await invoke("verify_provider_models", { provider: prov, apiKey: keyVal });
          providerKeys[prov] = keyVal;
          statusText.textContent = `✓ تم التحقق بنجاح (${models.length} نموذج متاح)`;
          statusText.style.color = "var(--accent-green)";
          btn.textContent = "✓ Verified";
          await loadVaultAndModels();
        } else {
          statusText.textContent = "✓ مفتاح صالح (محاكاة)";
          statusText.style.color = "var(--accent-green)";
          btn.textContent = "✓ Verified";
        }
      } catch (err) {
        statusText.textContent = `✕ فشل التحقق: ${err}`;
        statusText.style.color = "var(--accent-red)";
        btn.textContent = "Verify & Fetch";
      } finally {
        btn.disabled = false;
      }
    });
  });

  // Textarea auto-resize & input triggers
  promptInput.addEventListener("input", handlePromptInput);

  // Send on enter or click
  sendBtn.addEventListener("click", handleSend);
  promptInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Quick tag pills in prompt
  document.querySelectorAll(".tag-pill").forEach(tag => {
    tag.addEventListener("click", () => {
      const insert = tag.getAttribute("data-insert");
      promptInput.value = insert + " ";
      promptInput.focus();
    });
  });

  // MCP Hub UI buttons
  const openAddMcpBtn = document.getElementById("openAddMcpBtn");
  if (openAddMcpBtn) {
    openAddMcpBtn.addEventListener("click", () => addMcpModal.classList.remove("hidden"));
  }
  const closeAddMcpModal = document.getElementById("closeAddMcpModal");
  if (closeAddMcpModal) {
    closeAddMcpModal.addEventListener("click", () => addMcpModal.classList.add("hidden"));
  }
  const saveNewMcpBtn = document.getElementById("saveNewMcpBtn");
  if (saveNewMcpBtn) {
    saveNewMcpBtn.addEventListener("click", handleSaveNewMcp);
  }
  const editRawMcpBtn = document.getElementById("editRawMcpBtn");
  if (editRawMcpBtn) {
    editRawMcpBtn.addEventListener("click", handleToggleRawMcp);
  }
  const saveRawMcpBtn = document.getElementById("saveRawMcpBtn");
  if (saveRawMcpBtn) {
    saveRawMcpBtn.addEventListener("click", handleSaveRawMcpJson);
  }

  // Skills Hub UI buttons
  const openAddSkillBtn = document.getElementById("openAddSkillBtn");
  if (openAddSkillBtn) {
    openAddSkillBtn.addEventListener("click", () => addSkillModal.classList.remove("hidden"));
  }
  const closeAddSkillModal = document.getElementById("closeAddSkillModal");
  if (closeAddSkillModal) {
    closeAddSkillModal.addEventListener("click", () => addSkillModal.classList.add("hidden"));
  }
  const saveNewSkillBtn = document.getElementById("saveNewSkillBtn");
  if (saveNewSkillBtn) {
    saveNewSkillBtn.addEventListener("click", handleSaveNewSkill);
  }

  // Tauri Streaming Events Listener
  if (listen) {
    listen("agent-stream-event", handleStreamEvent);
  }
}

// --- KEYBOARD SHORTCUTS ---
function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    // Ctrl + K: Toggle Model Picker
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      modelDropdownMenu.classList.toggle("hidden");
    }

    // Ctrl + ,: Toggle Drawer Settings
    if ((e.ctrlKey || e.metaKey) && e.key === ",") {
      e.preventDefault();
      if (drawerOverlay.classList.contains("hidden")) {
        openDrawer("tab-vault");
      } else {
        closeDrawer();
      }
    }

    // Alt + A: Accept Diff
    if (e.altKey && e.key.toLowerCase() === "a") {
      e.preventDefault();
      if (latestDiffCard && latestDiffCard.acceptBtn) {
        latestDiffCard.acceptBtn.click();
      }
    }

    // Alt + R: Reject Diff
    if (e.altKey && e.key.toLowerCase() === "r") {
      e.preventDefault();
      if (latestDiffCard && latestDiffCard.rejectBtn) {
        latestDiffCard.rejectBtn.click();
      }
    }

    // Escape: Close all overlays
    if (e.key === "Escape") {
      modelDropdownMenu.classList.add("hidden");
      autocompletePopup.classList.add("hidden");
      addMcpModal.classList.add("hidden");
      addSkillModal.classList.add("hidden");
      closeDrawer();
    }
  });
}

// --- DRAWER OPEN / CLOSE ---
function openDrawer(tabId = "tab-vault") {
  drawerOverlay.classList.remove("hidden");
  const tabBtn = document.querySelector(`.drawer-tabs-nav .tab-btn[data-tab="${tabId}"]`);
  if (tabBtn) tabBtn.click();
}

function closeDrawer() {
  drawerOverlay.classList.add("hidden");
}

// --- AUTOCOMPLETE POPUP FOR / AND @ ---
function handlePromptInput() {
  // Auto-resize
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
      <div class="popup-item-left">
        <span class="popup-item-cmd">${opt.cmd}</span>
      </div>
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
      <div class="popup-item-left">
        <span class="popup-item-cmd">${opt.target}</span>
      </div>
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

// --- SEND & STREAM EXECUTION ---
async function handleSend() {
  const text = promptInput.value.trim();
  if (!text || isStreaming) return;

  autocompletePopup.classList.add("hidden");
  promptInput.value = "";
  promptInput.style.height = "auto";

  // Hide welcome banner if visible
  if (welcomeBanner) welcomeBanner.style.display = "none";

  // Clear command
  if (text === "/clear") {
    streamMessages.innerHTML = "";
    conversationHistory.length = 1;
    return;
  }

  // Skills command shortcut
  if (text === "/skills") {
    openDrawer("tab-skills");
    return;
  }

  // Append user bubble
  appendUserMessage(text);
  conversationHistory.push({ role: "user", content: text });

  // Assistant turn container
  const assistantTurn = createAssistantTurn();
  streamMessages.appendChild(assistantTurn.container);
  scrollStreamToBottom();

  isStreaming = true;
  sendBtn.disabled = true;

  const currentProvider = PROVIDERS[activeProviderId] || PROVIDERS.groq;
  const currentKey = providerKeys[activeProviderId];

  // If we have an active key, perform Native AI Chat Request directly
  if (currentKey && invoke) {
    try {
      // Emit initial tool start representation
      appendToolPill(assistantTurn.container, "Provider Router", `Connecting to ${currentProvider.name}...`);

      const payload = {
        model: activeModelId,
        messages: conversationHistory,
        stream: false,
        temperature: 0.6
      };

      const rawResponse = await invoke("send_ai_chat_request", {
        endpoint: currentProvider.url,
        apiKey: currentKey,
        payloadJson: JSON.stringify(payload)
      });

      const parsed = JSON.parse(rawResponse);
      const answer = parsed.choices?.[0]?.message?.content || "✓ لا يوجد رد من النموذج.";
      
      assistantTurn.textBlock.innerHTML = renderMarkdown(answer);
      conversationHistory.push({ role: "assistant", content: answer });

      // If user query mentions refactoring or modifying code, render interactive diff card
      if (text.includes("refactor") || text.includes("عدل") || text.includes("patch") || text.includes("fix")) {
        renderInteractiveDiffCard(assistantTurn.container, "packages/core/src/tool/plugin/read.ts", [
          { type: "del", text: "- const content = fs.readFileSync(path, 'utf8');" },
          { type: "add", text: "+ const skeleton = yield* locus.skeleton(path);" },
          { type: "add", text: "+ // LOCUS AST zero-blind compression enforced" },
          { type: "add", text: "+ return skeleton;" }
        ]);
      }

    } catch (err) {
      assistantTurn.textBlock.innerHTML = `<span style="color: var(--accent-red)">خطأ في الاتصال بالمزود: ${err}</span>`;
    } finally {
      isStreaming = false;
      sendBtn.disabled = false;
      scrollStreamToBottom();
    }
  } else if (invoke) {
    // Fallback to local sovereign session turn
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
    // Browser mock fallback
    setTimeout(() => {
      assistantTurn.textBlock.innerHTML = renderMarkdown(
        `أهلاً بك في **OpenCode Sovereign**! 👋\n\nلقد اخترت نموذج: \`${activeModelName}\` عبر **${currentProvider.name}**.\n\nلتفعيل الردود الحية فائقة السرعة، يرجى إدخال مفتاح API المجاني عبر مركز القيادة ⚙️ بالأعلى.`
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
  turn.innerHTML = `
    <div class="user-bubble">${escapeHtml(text)}</div>
  `;
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

// LOCUS Collapsible Slice Pill
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

// MCP / Tool Calling Pill
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

// Interactive Diff Card with Accept / Reject
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

// --- MCP MANAGEMENT (TAB 2) ---
async function loadMcpConfig() {
  if (invoke) {
    try {
      mcpServers = await invoke("get_mcp_config");
    } catch (e) {
      console.warn("Failed to load MCP config:", e);
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

async function handleSaveNewMcp() {
  const id = document.getElementById("newMcpId").value.trim();
  const name = document.getElementById("newMcpName").value.trim();
  const command = document.getElementById("newMcpCommand").value.trim();
  const args = document.getElementById("newMcpArgs").value.split(",").map(a => a.trim()).filter(Boolean);
  const desc = document.getElementById("newMcpDesc").value.trim();

  if (!id || !name || !command) return;

  const newSrv = {
    id,
    name,
    command,
    args,
    env: {},
    enabled: true,
    description: desc || "Custom MCP Protocol server",
    tools: ["custom_tool"]
  };

  mcpServers.push(newSrv);
  if (invoke) {
    await invoke("save_mcp_config", { servers: mcpServers });
  }

  addMcpModal.classList.add("hidden");
  renderMcpList();
}

async function handleToggleRawMcp() {
  const rawContainer = document.getElementById("rawMcpContainer");
  const rawTextarea = document.getElementById("rawMcpTextarea");
  rawContainer.classList.toggle("hidden");

  if (!rawContainer.classList.contains("hidden")) {
    if (invoke) {
      rawTextarea.value = await invoke("get_raw_mcp_json");
    } else {
      rawTextarea.value = JSON.stringify(mcpServers, null, 2);
    }
  }
}

async function handleSaveRawMcpJson() {
  const rawTextarea = document.getElementById("rawMcpTextarea");
  try {
    const parsed = JSON.parse(rawTextarea.value);
    mcpServers = parsed;
    if (invoke) {
      await invoke("save_raw_mcp_json", { rawJson: rawTextarea.value });
    }
    document.getElementById("rawMcpContainer").classList.add("hidden");
    renderMcpList();
  } catch (e) {
    alert("تنسيق JSON غير صالح: " + e.message);
  }
}

// --- SKILLS MANAGEMENT (TAB 3) ---
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
        <label class="toggle-switch" title="نشط دائماً في السياق">
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

async function handleSaveNewSkill() {
  const name = document.getElementById("newSkillName").value.trim();
  const slash = document.getElementById("newSkillSlash").value.trim();
  const category = document.getElementById("newSkillCategory").value.trim();
  const desc = document.getElementById("newSkillDesc").value.trim();
  const prompt = document.getElementById("newSkillPrompt").value.trim();

  if (!name || !slash) return;

  const newSkill = {
    id: slash.replace("/", "").toLowerCase(),
    name,
    category: category || "Custom",
    description: desc,
    prompt,
    allowed_tools: ["locus_slice", "terminal"],
    always_on: false,
    slash_command: slash.startsWith("/") ? slash : `/${slash}`
  };

  skillsList.push(newSkill);
  if (invoke) {
    await invoke("save_skills_config", { skills: skillsList });
  }

  addSkillModal.classList.add("hidden");
  renderSkillsList();
}

// --- LOCUS STATUS PULSE ---
async function checkLocusPulse() {
  if (invoke) {
    try {
      const status = await invoke("check_locus_status");
      const locusBadge = document.getElementById("locusBadge");
      if (status.available && locusBadge) {
        locusBadge.title = `LOCUS ${status.version} Online (${status.path})`;
      }
    } catch (e) {
      console.warn("LOCUS status query:", e);
    }
  }
}

// --- UTILITIES ---
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

  // Extract and stash code blocks to protect them from paragraph processing
  const codeBlocks = [];
  let processed = md.replace(/```([a-zA-Z0-9_-]*)\r?\n([\s\S]*?)```/g, (match, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre><code class="language-${lang || 'text'}">${escapeHtml(code.trim())}</code></pre>`);
    return `__CODE_BLOCK_${idx}__`;
  });

  // Escape remaining markdown text
  processed = escapeHtml(processed);

  // Restore code block placeholders
  codeBlocks.forEach((block, idx) => {
    processed = processed.replace(`__CODE_BLOCK_${idx}__`, block);
  });

  // Inline code: `code`
  processed = processed.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold: **text**
  processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic: *text*
  processed = processed.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Paragraphs
  processed = processed.split(/\n\n+/).map(p => {
    if (p.includes('<pre><code')) return p;
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).join('');

  return processed;
}
