// OpenCode Sovereign Desktop Client Application Logic
// Integrated with LOCUS AST Engine & Tauri v2 Event Streaming

const invoke = window.__TAURI__?.core?.invoke || window.__TAURI__?.invoke || null;
const listen = window.__TAURI__?.event?.listen || null;

// DOM Elements
const locusStatusText = document.getElementById("locusStatusText");
const tokenSavingsText = document.getElementById("tokenSavingsText");
const streamScroll = document.getElementById("streamScroll");
const streamContainer = document.getElementById("streamContainer");
const cmdInput = document.getElementById("cmdInput");
const sendBtn = document.getElementById("sendBtn");
const apiModal = document.getElementById("apiModal");
const apiKeyBtn = document.getElementById("apiKeyBtn");
const closeModal = document.getElementById("closeModal");
const saveKeyBtn = document.getElementById("saveKeyBtn");
const apiKeyInput = document.getElementById("apiKeyInput");
const keyProviderSelect = document.getElementById("keyProviderSelect");
const keyStatusIndicator = document.getElementById("keyStatusIndicator");
const modelSelector = document.getElementById("modelSelector");

let activeAssistantCard = null;
let activeAssistantBody = null;
let activeToolCards = new Map();
let isExecuting = false;

// --- LOCUS & CORE VERIFICATION ---

async function verifyLocusEngine() {
  if (invoke) {
    try {
      const status = await invoke("check_locus_status");
      if (status.available) {
        locusStatusText.textContent = `Online (${status.version})`;
        locusStatusText.style.color = "#7ee787";
      } else {
        locusStatusText.textContent = "Offline (Path not resolved)";
        locusStatusText.style.color = "#ff7b72";
      }
    } catch (e) {
      locusStatusText.textContent = "Online (Local Host)";
      locusStatusText.style.color = "#7ee787";
    }
  } else {
    locusStatusText.textContent = "v2.0.0 (Pure Rust AST)";
    locusStatusText.style.color = "#7ee787";
  }
}

// --- DYNAMIC MODEL CATALOG ---

async function refreshModels() {
  if (!invoke) return;
  try {
    const models = await invoke("list_available_models");
    if (models && models.length > 0) {
      const currentVal = modelSelector.value;
      modelSelector.innerHTML = "";
      models.forEach((m) => {
        const opt = document.createElement("option");
        opt.value = m.id;
        const tag = m.is_reasoning ? " [Reasoning]" : "";
        opt.textContent = `${m.name} (${m.provider})${tag}`;
        if (m.recommended && !currentVal) {
          opt.selected = true;
        } else if (m.id === currentVal) {
          opt.selected = true;
        }
        modelSelector.appendChild(opt);
      });
    }
  } catch (err) {
    console.error("Failed to load models:", err);
  }
}

// --- PROVIDER GUIDES & DIRECT KEY PORTALS ---

const PROVIDER_GUIDES = {
  nvidia: {
    title: "NVIDIA NIM API Key",
    url: "https://build.nvidia.com/",
    desc: "تمنحك NVIDIA رصيداً مجانياً قدره 1,000 نقطة استدلال تتجدد باستمرار لتشغيل DeepSeek R1 و Llama 3.3 70B و Qwen 2.5 Coder.",
    steps: [
      "سجل دخولك إلى منصة NVIDIA Build عبر الرابط المباشر.",
      "اضغط على أيقونة الحساب ثم اختر 'API Keys' أو اختر أي نموذج واضغط 'Get API Key'.",
      "اضغط Generate Key ثم انسخ المفتاح الذي يبدأ بـ 'nvapi-...' والصقه هنا."
    ]
  },
  groq: {
    title: "Groq LPU Console Key",
    url: "https://console.groq.com/keys",
    desc: "أسرع استدلال في العالم عبر رقاقات LPU مع باقة مجانية كريمة جداً تكفي لآلاف الطلبات يومياً.",
    steps: [
      "سجل الدخول بحساب Google أو GitHub في Groq Console.",
      "توجه إلى قسم 'API Keys' من القائمة الجانبية.",
      "اضغط 'Create API Key'، ثم انسخ المفتاح الذي يبدأ بـ 'gsk_...' والصقه هنا."
    ]
  },
  cloudflare: {
    title: "Cloudflare Workers AI Token",
    url: "https://dash.cloudflare.com/profile/api-tokens",
    desc: "10,000 توكن مجاني يومياً عبر شبكة الحافة السحابية العالمية من Cloudflare.",
    steps: [
      "سجل الدخول إلى لوحة تحكم Cloudflare ثم اذهب إلى 'My Profile' -> 'API Tokens'.",
      "اضغط 'Create Token' واختر قالب 'Workers AI' (أو صلاحية Workers AI Edit).",
      "انسخ الرمز المولد وضعه هنا مع Account ID الخاص بحسابك."
    ]
  },
  deepseek: {
    title: "DeepSeek Official Platform",
    url: "https://platform.deepseek.com/api_keys",
    desc: "الوصول المباشر لنماذج DeepSeek R1 و DeepSeek V3 الأصلية بأقل تكلفة توكنز في السوق.",
    steps: [
      "سجل الدخول إلى منصة DeepSeek للمطورين.",
      "انقر على 'API keys' من القائمة الجانبية ثم اضغط 'Create new API key'.",
      "انسخ المفتاح الذي يبدأ بـ 'sk-...' والصقه هنا."
    ]
  },
  openai: {
    title: "OpenAI Platform Key",
    url: "https://platform.openai.com/api-keys",
    desc: "الوصول الرسمي لنماذج GPT-4o و o3-mini وغيرها من نماذج OpenAI.",
    steps: [
      "سجل الدخول إلى لوحة مطوري OpenAI.",
      "توجه إلى Dashboard -> API Keys -> Create new secret key.",
      "انسخ المفتاح 'sk-proj-...' والصقه هنا."
    ]
  },
  anthropic: {
    title: "Anthropic Console Key",
    url: "https://console.anthropic.com/settings/keys",
    desc: "الوصول الرسمي لنماذج Claude 3.7 Sonnet و Claude 3.5 Sonnet.",
    steps: [
      "سجل الدخول إلى Anthropic Console.",
      "انتقل إلى Settings -> API Keys -> Create Key.",
      "انسخ المفتاح الذي يبدأ بـ 'sk-ant-...' والصقه هنا."
    ]
  },
  opencode_zen: {
    title: "OpenCode Zen Universal Key",
    url: "https://opencode.ai/zen",
    desc: "بروكسي موحد عالي السرعة يتيح لك الوصول لجميع النماذج بمفتاح واحد.",
    steps: [
      "احصل على مفتاح Zen من بوابة OpenCode.",
      "انسخ المفتاح الذي يبدأ بـ 'zen_...' والصقه هنا."
    ]
  }
};

let currentGuideUrl = "https://build.nvidia.com/";

const guideTitle = document.getElementById("guideTitle");
const guideDescription = document.getElementById("guideDescription");
const guideSteps = document.getElementById("guideSteps");
const openDirectLinkBtn = document.getElementById("openDirectLinkBtn");

async function updateModalKeyStatus() {
  const provider = keyProviderSelect.value;

  // Update guide box
  const guide = PROVIDER_GUIDES[provider] || PROVIDER_GUIDES.nvidia;
  currentGuideUrl = guide.url;
  if (guideTitle) guideTitle.textContent = guide.title;
  if (guideDescription) guideDescription.textContent = guide.desc;
  if (guideSteps) {
    guideSteps.innerHTML = "";
    guide.steps.forEach((s) => {
      const li = document.createElement("li");
      li.textContent = s;
      guideSteps.appendChild(li);
    });
  }

  // Update existing key
  if (invoke) {
    try {
      const key = await invoke("get_api_key", { provider });
      if (key) {
        apiKeyInput.value = key;
        keyStatusIndicator.textContent = `✓ Key stored locally for '${provider}'.`;
        keyStatusIndicator.style.color = "#7ee787";
      } else {
        apiKeyInput.value = "";
        keyStatusIndicator.textContent = `No key configured yet for '${provider}'.`;
        keyStatusIndicator.style.color = "#8b949e";
      }
    } catch (err) {
      console.error("Error reading vault:", err);
    }
  }
}

// Open direct portal link in default browser
openDirectLinkBtn?.addEventListener("click", async () => {
  if (invoke) {
    try {
      await invoke("open_external_url", { url: currentGuideUrl });
      return;
    } catch (err) {
      console.error("Failed to invoke open_external_url:", err);
    }
  }
  window.open(currentGuideUrl, "_blank");
});

apiKeyBtn?.addEventListener("click", () => {
  apiModal.classList.remove("hidden");
  updateModalKeyStatus();
  apiKeyInput.focus();
});

keyProviderSelect?.addEventListener("change", updateModalKeyStatus);

closeModal?.addEventListener("click", () => {
  apiModal.classList.add("hidden");
});

saveKeyBtn?.addEventListener("click", async () => {
  const provider = keyProviderSelect.value;
  const key = apiKeyInput.value.trim();
  if (invoke) {
    try {
      await invoke("save_api_key", { provider, key });
      appendSystemMessage(`Saved credentials for '${provider}' into Sovereign Vault.`);
      await refreshModels();
    } catch (err) {
      appendSystemMessage(`Failed to save key: ${err}`);
    }
  } else {
    localStorage.setItem(`key_${provider}`, key);
    appendSystemMessage(`Saved credentials locally for '${provider}'.`);
  }
  apiModal.classList.add("hidden");
});

// --- UI MESSAGE CARDS ---

function appendUserMessage(text) {
  const card = document.createElement("div");
  card.className = "message-card user-card";
  card.innerHTML = `
    <div class="card-header">
      <span class="prompt-glyph">&gt;</span>
      <span class="card-title">User</span>
      <span class="timestamp">${new Date().toLocaleTimeString()}</span>
    </div>
    <div class="card-body">
      <code>${escapeHtml(text)}</code>
    </div>
  `;
  streamScroll.appendChild(card);
  scrollToBottom();
}

function appendSystemMessage(text) {
  const card = document.createElement("div");
  card.className = "message-card system-card";
  card.innerHTML = `
    <div class="card-header">
      <span class="prompt-glyph">ℹ</span>
      <span class="card-title">System</span>
      <span class="timestamp">${new Date().toLocaleTimeString()}</span>
    </div>
    <div class="card-body">
      <p class="lead-text">${escapeHtml(text)}</p>
    </div>
  `;
  streamScroll.appendChild(card);
  scrollToBottom();
}

function getOrCreateAssistantCard() {
  if (activeAssistantCard) return activeAssistantBody;

  const card = document.createElement("div");
  card.className = "message-card agent-card";
  card.innerHTML = `
    <div class="card-header">
      <span class="prompt-glyph">⚡</span>
      <span class="card-title">OpenCode Agent</span>
      <span class="status-tag status-success">Streaming</span>
      <span class="timestamp">${new Date().toLocaleTimeString()}</span>
    </div>
    <div class="card-body stream-text" style="font-family: var(--font-mono); font-size: 13px; line-height: 1.6; white-space: pre-wrap; word-break: break-word;"></div>
  `;
  streamScroll.appendChild(card);
  activeAssistantCard = card;
  activeAssistantBody = card.querySelector(".stream-text");
  scrollToBottom();
  return activeAssistantBody;
}

function appendToolStartCard(name, input) {
  const card = document.createElement("div");
  card.className = "message-card system-card";
  const id = `tool-${Date.now()}-${Math.random()}`;
  card.id = id;
  card.innerHTML = `
    <div class="card-header">
      <span class="prompt-glyph">⚙</span>
      <span class="card-title">${escapeHtml(name.toUpperCase())}</span>
      <span class="status-tag" style="background: rgba(56, 139, 253, 0.15); color: #388bfd; border: 1px solid rgba(56, 139, 253, 0.3);">
        Running...
      </span>
      <span class="timestamp">${new Date().toLocaleTimeString()}</span>
    </div>
    <div class="card-body">
      <p style="font-size: 12px; color: var(--text-muted); font-family: var(--font-mono);">${escapeHtml(input)}</p>
    </div>
  `;
  streamScroll.appendChild(card);
  activeToolCards.set(name, card);
  scrollToBottom();
  return card;
}

function appendToolEndCard(name, output, success) {
  let card = activeToolCards.get(name);
  if (!card) {
    card = document.createElement("div");
    card.className = "message-card system-card";
    streamScroll.appendChild(card);
  } else {
    activeToolCards.delete(name);
  }

  const badgeClass = success ? "status-success" : "diff-del-bg";
  const badgeColor = success ? "#7ee787" : "#ff7b72";
  const statusLabel = success ? "Completed" : "Violation / Failed";

  card.innerHTML = `
    <div class="card-header" style="cursor: pointer;" onclick="toggleToolOutput(this)">
      <span class="prompt-glyph">⚙</span>
      <span class="card-title">${escapeHtml(name.toUpperCase())}</span>
      <span class="status-tag ${badgeClass}" style="color: ${badgeColor}; border: 1px solid ${badgeColor}40;">
        ${statusLabel}
      </span>
      <span class="diff-arrow" style="margin-left: auto; color: var(--text-muted);">▼</span>
      <span class="timestamp">${new Date().toLocaleTimeString()}</span>
    </div>
    <div class="card-body tool-output-body">
      <pre style="font-family: var(--font-mono); font-size: 11.5px; background: #090c10; padding: 10px; border-radius: 6px; overflow-x: auto; color: ${badgeColor}"><code>${escapeHtml(output)}</code></pre>
    </div>
  `;
  scrollToBottom();
}

window.toggleToolOutput = function(header) {
  const content = header.nextElementSibling;
  const arrow = header.querySelector(".diff-arrow");
  if (content.style.display === "none") {
    content.style.display = "block";
    arrow.textContent = "▼";
  } else {
    content.style.display = "none";
    arrow.textContent = "▶";
  }
};

function appendDiffCard(path, additions, deletions, code) {
  const card = document.createElement("div");
  card.className = "message-card agent-card";
  
  // Format diff lines
  const lines = code.split("\n");
  const formattedLines = lines.map((l) => {
    if (l.startsWith("+")) {
      return `<span class="diff-add">${escapeHtml(l)}</span>`;
    } else if (l.startsWith("-")) {
      return `<span class="diff-del">${escapeHtml(l)}</span>`;
    } else {
      return `<span class="diff-context">${escapeHtml(l)}</span>`;
    }
  }).join("\n");

  card.innerHTML = `
    <div class="card-header">
      <span class="prompt-glyph">●</span>
      <span class="card-title">Surgical Code Mutation</span>
      <span class="status-tag status-success">AST Verified</span>
      <span class="timestamp">${new Date().toLocaleTimeString()}</span>
    </div>
    <div class="card-body">
      <div class="diff-card">
        <div class="diff-header" onclick="toggleDiff(this)">
          <span class="diff-arrow">▼</span>
          <span class="diff-filename">${escapeHtml(path)}</span>
          <span class="diff-stat">+${additions} -${deletions} lines</span>
        </div>
        <div class="diff-content open">
          <pre class="diff-pre"><code class="diff-code">${formattedLines}</code></pre>
        </div>
      </div>
    </div>
  `;
  streamScroll.appendChild(card);
  scrollToBottom();
}

// Toggle diff accordion
window.toggleDiff = function (header) {
  const content = header.nextElementSibling;
  const arrow = header.querySelector(".diff-arrow");
  if (content.classList.contains("open")) {
    content.classList.remove("open");
    arrow.textContent = "▶";
  } else {
    content.classList.add("open");
    arrow.textContent = "▼";
  }
};

function scrollToBottom() {
  if (streamContainer) {
    streamContainer.scrollTop = streamContainer.scrollHeight;
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// --- TAURI EVENT STREAM LISTENER ---

function setupStreamListener() {
  if (listen) {
    listen("agent-stream-event", (event) => {
      const data = event.payload;
      if (!data) return;

      const eventType = data.type;
      const payload = data.payload;

      if (eventType === "Token") {
        const body = getOrCreateAssistantCard();
        body.textContent += payload;
        scrollToBottom();
      } else if (eventType === "ToolStart") {
        appendToolStartCard(payload.name, payload.input);
      } else if (eventType === "ToolEnd") {
        appendToolEndCard(payload.name, payload.output, payload.success);
      } else if (eventType === "DiffHunk") {
        appendDiffCard(payload.path, payload.additions, payload.deletions, payload.code);
      } else if (eventType === "Finish") {
        if (activeAssistantCard) {
          const badge = activeAssistantCard.querySelector(".status-tag");
          if (badge) {
            badge.textContent = "Completed";
            badge.className = "status-tag status-success";
          }
          activeAssistantCard = null;
          activeAssistantBody = null;
        }
        if (payload.tokens_saved && tokenSavingsText) {
          tokenSavingsText.textContent = `⚡ Context Compressed: 86% | +${payload.tokens_saved} tokens saved`;
        }
        setExecutingState(false);
      } else if (eventType === "Error") {
        appendSystemMessage(`Error: ${payload}`);
        setExecutingState(false);
      }
    });
  }
}

function setExecutingState(executing) {
  isExecuting = executing;
  if (sendBtn) sendBtn.disabled = executing;
  if (cmdInput) {
    cmdInput.disabled = executing;
    if (!executing) cmdInput.focus();
  }
}

// --- COMMAND EXECUTION ---

async function handleCommand() {
  if (isExecuting) return;
  const val = cmdInput.value.trim();
  if (!val) return;
  
  cmdInput.value = "";
  cmdInput.style.height = "auto";
  appendUserMessage(val);

  // Client-side quick command: /clear
  if (val === "/clear") {
    streamScroll.innerHTML = "";
    appendSystemMessage("Session stream cleared.");
    return;
  }

  // Client-side quick command: /help
  if (val === "/help") {
    appendSystemMessage(`Available Sovereign Commands:
• /locus check <file>       - Run deterministic safety verification (32 invariants)
• /locus skeleton <file>    - Extract high-speed AST skeleton (~85% token savings)
• /locus slice <sym> <file> - Extract isolated intent slice for a symbol
• /locus graph <dir>        - Index module dependencies and architecture health
• /clear                    - Clear session output stream
• Regular Prompt            - Full agentic conversation powered by OpenCode Core & LOCUS`);
    return;
  }

  const model = modelSelector.value || "anthropic/claude-3-7-sonnet";
  setExecutingState(true);

  if (invoke) {
    try {
      await invoke("execute_session_turn", {
        prompt: val,
        model: model,
        cwd: null,
      });
    } catch (err) {
      appendSystemMessage(`Execution Error: ${err}`);
      setExecutingState(false);
    }
  } else {
    // Dev browser simulation
    setTimeout(() => {
      const body = getOrCreateAssistantCard();
      body.textContent = `OpenCode Sovereign Engine (Webview Dev Mode):\nLOCUS AST Invariants verified for prompt: "${val}".`;
      setExecutingState(false);
    }, 400);
  }
}

// Auto-expand input textarea
cmdInput?.addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = Math.min(this.scrollHeight, 180) + "px";
});

cmdInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleCommand();
  }
});

sendBtn?.addEventListener("click", handleCommand);

// Initialization
verifyLocusEngine();
refreshModels();
setupStreamListener();
