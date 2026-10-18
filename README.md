# OpenCode Sovereign Edition (AgentAI)
### *Next-Generation Autonomous Coding Agent Powered by LOCUS AST Engine & Tauri v2*

<p align="center">
  <img src="packages/desktop/src-tauri/icons/128x128@2x.png" width="96" height="96" alt="OpenCode Sovereign Logo" />
</p>

<p align="center">
  <a href="https://github.com/ahmadshady747-create/AgentAI/releases/latest"><img src="https://img.shields.io/github/v/release/ahmadshady747-create/AgentAI?color=2ea043&label=Release&style=flat-square" alt="Latest Release" /></a>
  <img src="https://img.shields.io/badge/Engine-LOCUS%20Pure%20Rust-blue?style=flat-square" alt="LOCUS Engine" />
  <img src="https://img.shields.io/badge/GUI-Tauri%20v2%20(No%20Electron)-388bfd?style=flat-square" alt="Tauri v2" />
  <img src="https://img.shields.io/badge/Inference-NVIDIA%20NIM%20%7C%20Groq%20%7C%20Cloudflare-orange?style=flat-square" alt="Providers" />
  <img src="https://img.shields.io/badge/Platforms-Windows%20%7C%20Linux%20%7C%20macOS%20%7C%20Android-informational?style=flat-square" alt="Platforms" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License" />
</p>

---

## ⚡ Overview

**OpenCode Sovereign Edition** is a high-performance, private, zero-bloat source fork of OpenCode re-architected for autonomous software engineering:
1. **Zero Blind Reads**: All file reads are intercepted through the pure-Rust **LOCUS AST Engine**, reducing prompt token costs by **~85%** via high-fidelity structural skeletons.
2. **Deterministic Safety Firewall**: Evaluates **32 enterprise invariants** in `< 0.20ms` before code mutations are permitted (preventing null-dereferences, unhandled Option/null returns, and broken imports).
3. **Sovereign Multi-Provider Router**: Intelligent task-based routing across **NVIDIA NIM** (DeepSeek R1, Llama 3.3 70B, Qwen 2.5 Coder 32B), **Groq LPU**, **Cloudflare Workers AI**, Anthropic, and local **Ollama** with instant cascading failover.
4. **Claude Code Minimalist Aesthetic**: Native **Tauri v2** client (under 18 MB, zero Chromium/Electron memory overhead) featuring a calm monospace terminal stream, live token streaming, and collapsible syntax-highlighted diff cards.
5. **Universal Cross-Platform**: Native compilation for Windows, macOS, Linux, and **Android** smartphones/tablets.

---

## 🚀 Direct Downloads & Binaries

Get the latest standalone release binary directly from the official GitHub Release:

| Platform | Target Architecture | Package / Executable | Direct Download Link |
| :--- | :--- | :--- | :--- |
| **Windows Desktop** | `x86_64` (Windows 10/11) | Native Executable (`.exe`) | [**📥 Download opencode-desktop-windows-x64.exe**](https://github.com/ahmadshady747-create/AgentAI/releases/download/v2.0.32-sovereign/opencode-desktop-windows-x64.exe) |
| **Android Mobile** | `aarch64` / `armv7` | APK / Android Project | [Build Instructions](#-android-mobile-build) |
| **macOS Desktop** | Apple Silicon & Intel | DMG / Universal Binary | [Build from Source](#-building-from-source) |
| **Linux Desktop** | `x86_64` / `aarch64` | AppImage / Deb / Binary | [Build from Source](#-building-from-source) |

> [!NOTE]
> All releases and changelogs are published on the [Releases Page](https://github.com/ahmadshady747-create/AgentAI/releases).

---

## 🧠 Architectural Pillars

```
┌────────────────────────────────────────────────────────┐
│           Tauri v2 Sovereign Client UI                 │
│ (Claude Code Monospace Linear Stream + Collapsible Diff)│
└──────────────────────────┬─────────────────────────────┘
                           │ IPC Streaming Events (agent-stream-event)
                           ▼
┌────────────────────────────────────────────────────────┐
│       Rust Core Bridge & Sovereign Model Router        │
│  - Secure Vault (~/.opencode/secure_vault.json)        │
│  - Task Tier Classifier (Reasoning / Coder / Fast)     │
│  - Cascading Fallback Chain (NVIDIA -> Groq -> Edge)   │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│  LOCUS Pure-Rust AST Engine  │ │ Multi-Provider Inference     │
│  - Zero Blind Read Skeletons │ │  - NVIDIA NIM DGX Cloud      │
│  - 32 Enterprise Invariants  │ │  - Groq LPU (Ultra-Fast)     │
│  - Semantic Intent Slicing   │ │  - Cloudflare Workers AI     │
│  - Hybrid AST + Vector Search│ │  - Anthropic / OpenAI / Zen  │
└──────────────────────────────┘ └──────────────────────────────┘
```

### 1. LOCUS AST Context Compression & Safety
Traditional AI coding agents paste raw files blindly into LLM context windows, wasting tens of thousands of tokens. OpenCode Sovereign routes code read operations through `locus.exe`:
- **AST Skeleton Extraction**: Preserves signatures, types, imports, and symbol topology while collapsing implementation bodies (`~85% token reduction`).
- **Semantic Intent Slicing**: Extracts high-density context slices around a specific target symbol (`locus slice <symbol> <file>`).
- **Safety Invariant Verification**: Validates 32 rules deterministically in milliseconds before applying changes.

### 2. Sovereign Model Router
The built-in router dispatches prompts to the optimal inference model based on task intent:
- **`router/reasoning`**: Dispatched to `deepseek-ai/deepseek-r1` on NVIDIA DGX Cloud for rigorous mathematical, algorithmic, and architectural reasoning.
- **`router/coder`**: Dispatched to `qwen/qwen2.5-coder-32b-instruct` on NVIDIA NIM for code generation and refactoring.
- **`router/fast`**: Dispatched to `meta/llama-3.3-70b-instruct` on NVIDIA NIM / Groq for rapid turnaround.
- **`router/auto`**: Automatic real-time prompt classification with failover cascading.

### 3. Local Secure Vault & Free Inference Credits
API credentials are encrypted and stored locally in `~/.opencode/secure_vault.json` (or the Android app sandbox).
Check out the [**API Keys & Free Credits Guide (كتيب استخراج المفاتيح)**](API_KEYS_GUIDE.md) for direct login links to claim:
- **1,000 Free Inference Credits** on NVIDIA NIM.
- **Free Generous Tier** on Groq LPU.
- **10,000 Free Daily Tokens** on Cloudflare Workers AI.

---

## 🛠️ CLI & Terminal Slash Commands

The desktop interface supports both standard natural-language interaction and direct developer commands:

| Command | Description |
| :--- | :--- |
| `/locus check <path>` | Run deterministic safety verification on a target source file |
| `/locus skeleton <path>` | Extract high-speed AST skeleton preserving interfaces (~85% savings) |
| `/locus slice <sym> <path>` | Extract isolated semantic intent slice around a specific symbol |
| `/locus graph <dir>` | Index directory and construct cross-file architectural dependency graph |
| `/help` | Display list of available sovereign commands |
| `/clear` | Clear the session stream |

---

## 💻 Building from Source

### Prerequisites
- **Node.js**: v20 or v24
- **Rust**: `rustc` and `cargo` $\ge$ 1.80
- **LOCUS Engine**: `D:\LOCUS\target\release\locus.exe` (or in `PATH`)

### Desktop Development
```bash
# Clone the repository
git clone https://github.com/ahmadshady747-create/AgentAI.git
cd AgentAI

# Build the desktop Tauri app
cd packages/desktop
npm install
npm run dev     # Starts Tauri v2 in hot-reload development mode
npm run build   # Compiles optimized production binary in target/release
```

### 📱 Android Mobile Build
The Rust crate is configured with `crate-type = ["staticlib", "cdylib", "rlib"]` and `#[cfg_attr(mobile, tauri::mobile_entry_point)]`:
```bash
cd packages/desktop

# Initialize Android scaffolding (if not present)
npx @tauri-apps/cli android init

# Build debug APK for Android
npx @tauri-apps/cli android build --debug
```

---

## 🧪 Verification & Test Suite

Run the automated cross-platform test suite to verify LOCUS AST compression, router matrix decisions, and mobile readiness:

```bash
# Cross-Platform Comprehensive Test (20/20 Checks)
node verify_cross_platform.mjs

# NVIDIA Provider & Sovereign Router POC Test
node verify_nvidia_router_standalone.mjs
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
OpenCode Sovereign Edition is maintained by [Ahmed Shadi](https://github.com/ahmadshady747-create).
