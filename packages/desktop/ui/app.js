// OpenCode Sovereign AI Assistant — Modern Responsive Client Logic
// Direct High-Speed Provider Integration (Groq, Gemini, NVIDIA, DeepSeek, OpenRouter)

const invoke = window.__TAURI__?.core?.invoke || window.__TAURI__?.invoke || null;
const listen = window.__TAURI__?.event?.listen || null;

// DOM Elements
const streamScroll = document.getElementById("streamScroll");
const streamContainer = document.getElementById("streamContainer");
const cmdInput = document.getElementById("cmdInput");
const sendBtn = document.getElementById("sendBtn");
const apiModal = document.getElementById("apiModal");
const apiKeyBtn = document.getElementById("apiKeyBtn");
const bannerKeyBtn = document.getElementById("bannerKeyBtn");
const closeModal = document.getElementById("closeModal");
const saveKeyBtn = document.getElementById("saveKeyBtn");
const apiKeyInput = document.getElementById("apiKeyInput");
const keyProviderSelect = document.getElementById("keyProviderSelect");
const keyStatusIndicator = document.getElementById("keyStatusIndicator");
const keyDot = document.getElementById("keyDot");
const modelSelector = document.getElementById("modelSelector");
const quickKeyAction = document.getElementById("quickKeyAction");

let isExecuting = false;

// Running conversation history
const conversationHistory = [
  {
    role: "system",
    content: "You are OpenCode Sovereign AI, a fast, highly capable, friendly and helpful personal AI assistant. You answer all questions directly, naturally, and warmly in the user's language (natural fluent Arabic or English). Use clean markdown formatting with lists and code blocks when appropriate."
  }
];

// --- PROVIDER CONFIGURATION & ENDPOINTS ---

const PROVIDER_CONFIGS = {
  groq: {
    name: "Groq LPU",
    url: "https://api.groq.com/openai/v1/chat/completions",
    defaultModel: "llama-3.3-70b-versatile",
    guideTitle: "Groq LPU Console Key",
    portalUrl: "https://console.groq.com/keys",
    desc: "أسرع معالجة ذكاء اصطناعي في العالم عبر رقاقات LPU مع باقة مجانية كريمة تكفي لآلاف الرسائل اليومية مجاناً.",
    steps: [
      "اضغط على زر 'استخراج المفتاح' لفتح Groq Console.",
      "سجل دخولك بنقرة واحدة باستخدام حساب Google أو GitHub.",
      "اضغط 'Create API Key' ثم انسخ المفتاح (يبدأ بـ gsk_...) والصقه هنا."
    ]
  },
  gemini: {
    name: "Google Gemini",
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    defaultModel: "gemini-1.5-flash",
    guideTitle: "Google AI Studio Key",
    portalUrl: "https://aistudio.google.com/app/apikey",
    desc: "نماذج Gemini الحديثة من Google مجانية 100% مع قدرات فائقة واستجابة سريعة جداً.",
    steps: [
      "اضغط على زر 'استخراج المفتاح' لفتح Google AI Studio.",
      "سجل دخولك بحساب Google واضغط على 'Get API key'.",
      "اضغط 'Create API key' ثم انسخ المفتاح الذي يبدأ بـ AIza... والصقه هنا."
    ]
  },
  nvidia: {
    name: "NVIDIA NIM",
    url: "https://integrate.api.nvidia.com/v1/chat/completions",
    defaultModel: "meta/llama-3.3-70b-instruct",
    guideTitle: "NVIDIA NIM API Key",
    portalUrl: "https://build.nvidia.com/",
    desc: "رصيد مجاني 1,000 نقطة لتشغيل DeepSeek R1 و Llama 3.3 70B بأعلى دقة.",
    steps: [
      "سجل دخولك إلى منصة NVIDIA Build عبر الرابط.",
      "اختر أيقونة الحساب ثم 'API Keys' أو اختر أي نموذج واضغط 'Get API Key'.",
      "انسخ المفتاح الذي يبدأ بـ nvapi-... والصقه هنا."
    ]
  },
  deepseek: {
    name: "DeepSeek Official",
    url: "https://api.deepseek.com/chat/completions",
    defaultModel: "deepseek-chat",
    guideTitle: "DeepSeek Platform Key",
    portalUrl: "https://platform.deepseek.com/api_keys",
    desc: "الوصول المباشر لنماذج DeepSeek V3 و R1 الأصلية.",
    steps: [
      "سجل الدخول إلى منصة DeepSeek للمطورين.",
      "اختر 'API keys' من القائمة ثم اضغط 'Create new API key'.",
      "انسخ المفتاح الذي يبدأ بـ sk-... والصقه هنا."
    ]
  },
  openrouter: {
    name: "OpenRouter",
    url: "https://openrouter.ai/api/v1/chat/completions",
    defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
    guideTitle: "OpenRouter Free Models Key",
    portalUrl: "https://openrouter.ai/keys",
    desc: "بوابة موحدة للعديد من النماذج العالمية المجانية والمفتوحة.",
    steps: [
      "سجل دخولك بحساب Google في OpenRouter.",
      "توجه إلى Keys ثم اضغط 'Create Key'.",
      "انسخ المفتاح الذي يبدأ بـ sk-or-... والصقه هنا."
    ]
  },
  openai: {
    name: "OpenAI Direct",
    url: "https://api.openai.com/v1/chat/completions",
    defaultModel: "gpt-4o-mini",
    guideTitle: "OpenAI Secret Key",
    portalUrl: "https://platform.openai.com/api-keys",
    desc: "الوصول الرسمي لنماذج OpenAI GPT-4o.",
    steps: [
      "سجل الدخول إلى OpenAI Dashboard.",
      "اذهب إلى API Keys واضغط 'Create new secret key'.",
      "انسخ المفتاح 'sk-proj-...' والصقه هنا."
    ]
  }
};

// --- KEY STORAGE HELPERS ---

async function getStoredKey(provider) {
  // Check localStorage first
  const localKey = localStorage.getItem(`opencode_key_${provider}`);
  if (localKey && localKey.trim()) return localKey.trim();

  // If inside Tauri, check native vault
  if (invoke) {
    try {
      const vaultKey = await invoke("get_api_key", { provider });
      if (vaultKey && vaultKey.trim()) {
        localStorage.setItem(`opencode_key_${provider}`, vaultKey.trim());
        return vaultKey.trim();
      }
    } catch (e) {
      // Vault empty or not configured
    }
  }
  return null;
}

async function saveKey(provider, key) {
  const trimmed = key.trim();
  if (trimmed) {
    localStorage.setItem(`opencode_key_${provider}`, trimmed);
  } else {
    localStorage.removeItem(`opencode_key_${provider}`);
  }

  if (invoke) {
    try {
      await invoke("save_api_key", { provider, key: trimmed });
    } catch (e) {
      console.error("Failed to save to vault:", e);
    }
  }

  updateKeyIndicator();
}

function getSelectedProvider() {
  const modelVal = modelSelector.value;
  const parts = modelVal.split("/");
  return parts[0] || "groq";
}

function getResolvedModelName(provider) {
  const modelVal = modelSelector.value;
  const prefix = provider + "/";
  if (modelVal.startsWith(prefix)) {
    return modelVal.substring(prefix.length);
  }
  return PROVIDER_CONFIGS[provider]?.defaultModel || "llama-3.3-70b-versatile";
}

async function updateKeyIndicator() {
  const currentProvider = getSelectedProvider();
  const key = await getStoredKey(currentProvider);
  if (key) {
    keyDot.className = "key-dot-active";
    keyDot.title = `مفتاح ${currentProvider} مفعّل بنجاح`;
    if (quickKeyAction) quickKeyAction.style.display = "none";
  } else {
    keyDot.className = "key-dot-unconfigured";
    keyDot.title = `يرجى إضافة مفتاح ${currentProvider}`;
    if (quickKeyAction) quickKeyAction.style.display = "flex";
  }
}

// --- MODAL HANDLING ---

const guideTitle = document.getElementById("guideTitle");
const guideDescription = document.getElementById("guideDescription");
const guideSteps = document.getElementById("guideSteps");
const openDirectLinkBtn = document.getElementById("openDirectLinkBtn");

let currentPortalUrl = "https://console.groq.com/keys";

async function refreshModalContent() {
  const provider = keyProviderSelect.value;
  const cfg = PROVIDER_CONFIGS[provider] || PROVIDER_CONFIGS.groq;
  currentPortalUrl = cfg.portalUrl;

  guideTitle.textContent = cfg.guideTitle;
  guideDescription.textContent = cfg.desc;
  guideSteps.innerHTML = "";
  cfg.steps.forEach((s) => {
    const li = document.createElement("li");
    li.textContent = s;
    guideSteps.appendChild(li);
  });

  const existingKey = await getStoredKey(provider);
  if (existingKey) {
    apiKeyInput.value = existingKey;
    keyStatusIndicator.textContent = `✓ المفتاح محفوظ وجاهز لمزود '${cfg.name}'.`;
    keyStatusIndicator.style.color = "#7ee787";
  } else {
    apiKeyInput.value = "";
    keyStatusIndicator.textContent = `لم يتم ضبط مفتاح بعد لمزود '${cfg.name}'.`;
    keyStatusIndicator.style.color = "#d29922";
  }
}

function openModal(preselectProvider = null) {
  if (preselectProvider && PROVIDER_CONFIGS[preselectProvider]) {
    keyProviderSelect.value = preselectProvider;
  } else {
    keyProviderSelect.value = getSelectedProvider();
  }
  apiModal.classList.remove("hidden");
  refreshModalContent();
  setTimeout(() => apiKeyInput.focus(), 150);
}

function closeModalWindow() {
  apiModal.classList.add("hidden");
}

apiKeyBtn?.addEventListener("click", () => openModal());
bannerKeyBtn?.addEventListener("click", () => openModal("groq"));
closeModal?.addEventListener("click", closeModalWindow);
keyProviderSelect?.addEventListener("change", refreshModalContent);

openDirectLinkBtn?.addEventListener("click", async () => {
  if (invoke) {
    try {
      await invoke("open_external_url", { url: currentPortalUrl });
      return;
    } catch (e) {
      console.warn("open_external_url fallback to window.open", e);
    }
  }
  window.open(currentPortalUrl, "_blank");
});

saveKeyBtn?.addEventListener("click", async () => {
  const provider = keyProviderSelect.value;
  const key = apiKeyInput.value.trim();
  await saveKey(provider, key);
  closeModalWindow();
  appendSystemMessage(`تم حفظ وتفعيل مفتاح '${PROVIDER_CONFIGS[provider]?.name || provider}' بنجاح! يمكنك الآن الدردشة بحرية.`);
});

modelSelector?.addEventListener("change", updateKeyIndicator);

// --- UI MESSAGE RENDERING ---

function appendUserMessage(text) {
  const card = document.createElement("div");
  card.className = "user-card";
  card.setAttribute("dir", "auto");
  card.innerHTML = `<div class="card-body">${escapeHtml(text)}</div>`;
  streamScroll.appendChild(card);
  scrollToBottom();
}

function appendSystemMessage(text) {
  const card = document.createElement("div");
  card.className = "system-card";
  card.setAttribute("dir", "auto");
  card.textContent = text;
  streamScroll.appendChild(card);
  scrollToBottom();
}

function createAssistantCard(modelName) {
  const card = document.createElement("div");
  card.className = "agent-card";
  card.setAttribute("dir", "auto");
  card.innerHTML = `
    <div class="card-header">
      <span class="agent-avatar">⚡</span>
      <span class="agent-name">${escapeHtml(modelName)}</span>
      <span class="status-tag status-running">جاري الرد...</span>
    </div>
    <div class="stream-text"></div>
  `;
  streamScroll.appendChild(card);
  scrollToBottom();
  return {
    card,
    body: card.querySelector(".stream-text"),
    tag: card.querySelector(".status-tag")
  };
}

function appendOnboardingGuideCard(userPrompt) {
  const card = document.createElement("div");
  card.className = "agent-card";
  card.setAttribute("dir", "auto");

  card.innerHTML = `
    <div class="card-header">
      <span class="agent-avatar">👋</span>
      <span class="agent-name">مساعد OpenCode الذكي</span>
      <span class="status-tag status-running" style="color: #d29922; border-color: #d29922;">خطوة إعداد سهلة</span>
    </div>
    <div class="stream-text">
      <p><strong>أهلاً بك! لقد استلمت رسالتك: "${escapeHtml(userPrompt)}"</strong></p>
      <p>أنا مساعدك الذكي الخاص اليومي، فائق السرعة وبدون أي اشتراكات أو قيود.</p>
      <p>⚙️ <strong>لتفعيل الردود الحية وفائقة السرعة:</strong></p>
      <p>تحتاج فقط لإضافة مفتاح ذكاء اصطناعي مجاني (يستغرق دقيقة واحدة وبدون أي بطاقة بنكية):</p>
      <ul style="margin: 8px 18px; line-height: 1.6;">
        <li><strong>Groq (نوصي به بشدة):</strong> يعطيك سرعة فائقة (500 كلمة بالثانية) لنموذج Llama 3.3 وهو مجاني 100%.</li>
        <li><strong>Google Gemini:</strong> مجاني بالكامل مع حصة ضخمة جداً تصل لمليون توكن.</li>
      </ul>
      <div style="margin-top: 14px;">
        <button id="cardKeySetupBtn" style="background: #238636; color: white; border: none; padding: 9px 18px; border-radius: 8px; font-size: 13.5px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;">
          <span>🔑 اضغط هنا لضبط مفتاح Groq المجاني والبدء فوراً</span>
        </button>
      </div>
    </div>
  `;

  streamScroll.appendChild(card);
  scrollToBottom();

  card.querySelector("#cardKeySetupBtn")?.addEventListener("click", () => {
    openModal("groq");
  });
}

function scrollToBottom() {
  if (streamContainer) {
    streamContainer.scrollTop = streamContainer.scrollHeight;
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatMarkdown(text) {
  if (!text) return "";
  // Simple clean markdown parser for instant mobile display
  let html = escapeHtml(text);

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Code blocks
  html = html.replace(/```([a-z]*)\n([\s\S]*?)```/g, "<pre><code>$2</code></pre>");
  // Bullet lists
  html = html.replace(/^\s*[-•*]\s+(.*)$/gm, "<li>$1</li>");
  // Wrap list items
  html = html.replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>");
  // Line breaks
  html = html.replace(/\n\n/g, "</p><p>");
  html = html.replace(/\n/g, "<br>");

  return `<p>${html}</p>`;
}

// --- STREAMING INFERENCE ENGINE ---

async function executeChatStream(provider, modelName, apiKey, prompt) {
  const cfg = PROVIDER_CONFIGS[provider];
  if (!cfg) throw new Error(`Unknown provider: ${provider}`);

  const assistant = createAssistantCard(modelName);

  // Add user prompt to history
  conversationHistory.push({ role: "user", content: prompt });

  let endpoint = cfg.url;
  const headers = {
    "Content-Type": "application/json"
  };

  if (provider === "gemini") {
    endpoint += `?key=${apiKey}`;
    headers["Authorization"] = `Bearer ${apiKey}`;
  } else {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  // 1. Try Native Rust Request First (bypasses CORS 100%, works with NVIDIA NIM!)
  if (invoke) {
    try {
      const nonStreamPayload = {
        model: modelName,
        messages: conversationHistory,
        stream: false,
        temperature: 0.7,
        max_tokens: 3000
      };

      const result = await invoke("send_ai_chat_request", {
        endpoint: endpoint,
        apiKey: apiKey,
        payloadJson: JSON.stringify(nonStreamPayload)
      });

      const parsed = JSON.parse(result);
      const text = parsed.choices?.[0]?.message?.content;
      if (text) {
        assistant.body.innerHTML = formatMarkdown(text);
        assistant.tag.textContent = "مكتمل";
        assistant.tag.className = "status-tag status-success";
        conversationHistory.push({ role: "assistant", content: text });
        scrollToBottom();
        return;
      }
    } catch (rustErr) {
      console.warn("Native Rust request failed:", rustErr);
      if (rustErr && typeof rustErr === "string" && rustErr.includes("Server returned HTTP")) {
        throw new Error(rustErr);
      }
    }
  }

  // 2. Fallback to Browser Streaming Fetch (Works out-of-the-box for Groq, Gemini, DeepSeek, OpenRouter)
  const payload = {
    model: modelName,
    messages: conversationHistory,
    stream: true,
    temperature: 0.7,
    max_tokens: 3000
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errText = "";
      try {
        const errJson = await response.json();
        errText = errJson?.error?.message || JSON.stringify(errJson);
      } catch (e) {
        errText = await response.text();
      }
      throw new Error(`خطأ من خادم ${cfg.name} (${response.status}): ${errText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let accumulatedText = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // keep incomplete chunk

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(":")) continue;

        if (trimmed === "data: [DONE]") {
          break;
        }

        if (trimmed.startsWith("data: ")) {
          const jsonStr = trimmed.substring(6);
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              accumulatedText += delta;
              assistant.body.innerHTML = formatMarkdown(accumulatedText);
              scrollToBottom();
            }
          } catch (e) {
            // Partial JSON chunk, ignore
          }
        }
      }
    }

    // Finished streaming
    assistant.tag.textContent = "مكتمل";
    assistant.tag.className = "status-tag status-success";

    // Add to history
    conversationHistory.push({ role: "assistant", content: accumulatedText });

  } catch (err) {
    console.error("Stream error:", err);
    assistant.tag.textContent = "تعذر الإكمال";
    assistant.tag.className = "status-tag";
    assistant.tag.style.color = "#ff7b72";

    let customHelp = err.message;
    if (err.message && err.message.includes("fetch")) {
      customHelp = `تعذر الاتصال المباشر بخادم '${cfg.name}' بسبب قيود CORS في المتصفح. نوصي باختيار Groq LPU أو Google Gemini من القائمة فهما يدعمان الاتصال الفوري بنسبة 100%!`;
    }

    assistant.body.innerHTML += `<div style="margin-top: 10px; color: #ff7b72; font-size: 13px;">⚠️ ${escapeHtml(customHelp)}</div>`;
  }
}

// --- COMMAND & INPUT DISPATCH ---

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
    conversationHistory.length = 1; // reset history to system prompt only
    appendSystemMessage("تم مسح المحادثة وبدء جلسة جديدة.");
    return;
  }

  // Client-side quick command: /help
  if (val === "/help") {
    appendSystemMessage(`أوامر OpenCode المتاحة:
• /clear - مسح شاشة المحادثة وبدء محادثة جديدة.
• 🔑 زر المفتاح بالأعلى لضبط مزودات الذكاء الاصطناعي (Groq, Gemini, NVIDIA, DeepSeek).
• محادثة حرة ومباشرة لكافة الاستفسارات اليومية، النصوص، والبرمجة.`);
    return;
  }

  isExecuting = true;
  sendBtn.disabled = true;
  cmdInput.disabled = true;

  try {
    const provider = getSelectedProvider();
    const modelName = getResolvedModelName(provider);
    const key = await getStoredKey(provider);

    if (key && key.trim()) {
      // Execute live real streaming AI call
      await executeChatStream(provider, modelName, key, val);
    } else {
      // Friendly onboarding guide card with 1-click key modal setup
      appendOnboardingGuideCard(val);
    }
  } finally {
    isExecuting = false;
    sendBtn.disabled = false;
    cmdInput.disabled = false;
    cmdInput.focus();
  }
}

// Auto-expand input textarea
cmdInput?.addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = Math.min(this.scrollHeight, 120) + "px";
});

cmdInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleCommand();
  }
});

sendBtn?.addEventListener("click", handleCommand);

// Initialization
updateKeyIndicator();
