// OpenCode Sovereign — Headless Core Bridge
// Fully decouples Tauri backend IPC, State, and Events from visual presentation.
// Enables hot-swapping UI skins/layouts (Claude, Split IDE, Mission Control, Spotlight, Custom).

(function () {
  "use strict";

  const tauriCore = window.__TAURI__?.core || window.__TAURI__;
  const tauriEvent = window.__TAURI__?.event;

  const invokeNative = (cmd, args) => {
    if (tauriCore && typeof tauriCore.invoke === "function") {
      return tauriCore.invoke(cmd, args);
    }
    console.warn(`[SovereignBridge] Tauri invoke unavailable for '${cmd}'`);
    return Promise.reject(new Error(`Tauri invoke unavailable: ${cmd}`));
  };

  const listenNative = (event, handler) => {
    if (tauriEvent && typeof tauriEvent.listen === "function") {
      return tauriEvent.listen(event, handler);
    }
    return Promise.resolve(() => {});
  };

  class SovereignBridgeCore {
    constructor() {
      this.version = "2.0.32";
      this.listeners = new Map();

      // Reactive State
      this.state = {
        activeLayout: localStorage.getItem("sovereign_ui_layout") || "claude",
        customUiPath: localStorage.getItem("sovereign_custom_ui_path") || "",
        customCss: localStorage.getItem("sovereign_custom_css") || "",
        connections: [],
        activeConnectionId: null,
        activeModelId: null,
        conversationHistory: [
          {
            role: "system",
            content: "You are OpenCode Sovereign AI, built on Tauri v2 and LOCUS AST engine. Strictly answer queries with calm, linear, helpful clarity."
          }
        ],
        projectFiles: [],
        activeFile: null,
        activeFileContent: "",
        activeDiffHunk: null,
        locusStatus: { available: false, version: "2.0.0", path: "locus" },
        tokensSaved: 0,
        totalTokens: 0,
        isStreaming: false,
        runningTools: [],
        safetyGateRequests: []
      };

      // Set initial layout attribute on root
      document.documentElement.setAttribute("data-layout", this.state.activeLayout);

      // Apply saved custom CSS if custom layout
      if (this.state.activeLayout === "custom" && this.state.customCss) {
        this.injectCustomCss(this.state.customCss);
      }

      this.initNativeEventStream();
    }

    // --- EVENT EMITTER SYSTEM ---
    on(event, callback) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, new Set());
      }
      this.listeners.get(event).add(callback);
      return () => this.off(event, callback);
    }

    off(event, callback) {
      if (this.listeners.has(event)) {
        this.listeners.get(event).delete(callback);
      }
    }

    emit(event, data) {
      if (this.listeners.has(event)) {
        for (const cb of this.listeners.get(event)) {
          try {
            cb(data);
          } catch (err) {
            console.error(`[SovereignBridge] Error in '${event}' listener:`, err);
          }
        }
      }
    }

    // --- NATIVE TAURI STREAM LISTENER ---
    initNativeEventStream() {
      listenNative("agent-stream-event", (event) => {
        const data = event.payload;
        if (!data) return;

        if (data.type === "Token") {
          this.emit("stream-token", data.payload);
        } else if (data.type === "ToolStart") {
          this.state.runningTools.push(data.payload);
          this.emit("tool-start", data.payload);
        } else if (data.type === "ToolEnd") {
          this.emit("tool-end", data.payload);
        } else if (data.type === "DiffHunk") {
          this.state.activeDiffHunk = data.payload;
          this.emit("diff-hunk", data.payload);
        } else if (data.type === "Finish") {
          this.state.isStreaming = false;
          this.state.totalTokens = data.payload.total_tokens || 0;
          this.state.tokensSaved += data.payload.tokens_saved || 0;
          this.emit("stream-finish", data.payload);
        } else if (data.type === "Error") {
          this.state.isStreaming = false;
          this.emit("stream-error", data.payload);
        }
      }).catch(console.warn);

      listenNative("key-rotation-event", (event) => {
        this.emit("key-rotation", event.payload);
      }).catch(console.warn);
    }

    // --- UI LAYOUT & SKIN MANAGEMENT ---
    setLayout(layoutName) {
      const validLayouts = ["claude", "split-ide", "mission-control", "spotlight", "custom"];
      const target = validLayouts.includes(layoutName) ? layoutName : "claude";
      this.state.activeLayout = target;
      localStorage.setItem("sovereign_ui_layout", target);

      document.documentElement.setAttribute("data-layout", target);
      const ws = document.getElementById("sovereignWorkspace");
      if (ws) ws.setAttribute("data-layout", target);

      this.emit("layout-changed", target);

      // Auto-fetch files if switching to Split IDE
      if (target === "split-ide" && this.state.projectFiles.length === 0) {
        this.fetchProjectFiles().catch(console.warn);
      }
      return target;
    }

    getLayout() {
      return this.state.activeLayout;
    }

    setCustomUiPath(path) {
      this.state.customUiPath = path;
      localStorage.setItem("sovereign_custom_ui_path", path);
      this.emit("custom-ui-path-changed", path);
    }

    injectCustomCss(cssString) {
      this.state.customCss = cssString;
      localStorage.setItem("sovereign_custom_css", cssString);
      let styleTag = document.getElementById("sovereignCustomStyle");
      if (!styleTag) {
        styleTag = document.createElement("style");
        styleTag.id = "sovereignCustomStyle";
        document.head.appendChild(styleTag);
      }
      styleTag.textContent = cssString;
      this.emit("custom-css-applied", cssString);
    }

    // --- AGENT TURN EXECUTION ---
    async sendPrompt(text, cwd = ".") {
      if (!text || !text.trim()) return;
      this.state.isStreaming = true;
      this.state.runningTools = [];
      this.emit("stream-start", { prompt: text });

      try {
        await invokeNative("execute_session_turn", {
          prompt: text,
          model: this.state.activeModelId,
          connectionId: this.state.activeConnectionId,
          cwd: cwd
        });
      } catch (err) {
        this.state.isStreaming = false;
        this.emit("stream-error", String(err));
        throw err;
      }
    }

    // --- WORKSPACE & FILE OPERATIONS ---
    async fetchProjectFiles(cwd = ".") {
      try {
        const files = await invokeNative("list_project_files_command", { cwd });
        this.state.projectFiles = files;
        this.emit("files-updated", files);
        return files;
      } catch (err) {
        console.warn("[SovereignBridge] fetchProjectFiles failed:", err);
        return [];
      }
    }

    async readFile(filePath, cwd = ".") {
      try {
        const content = await invokeNative("read_file_content", { filePath, cwd });
        this.state.activeFile = filePath;
        this.state.activeFileContent = content;
        this.emit("file-selected", { filePath, content });
        return content;
      } catch (err) {
        console.warn(`[SovereignBridge] readFile '${filePath}' failed:`, err);
        throw err;
      }
    }

    async applyDiff(path, code, accept) {
      return invokeNative("apply_diff_action", { path, code, accept });
    }

    async revertSnapshot(snapshotId) {
      return invokeNative("revert_file_snapshot", { snapshotId });
    }

    // --- SAFETY GATE ---
    async checkSafety(command) {
      return invokeNative("check_safety_gate", { command });
    }

    async authorizeSafety(requestId, approved) {
      return invokeNative("authorize_safety_command", { requestId, approved });
    }

    // --- UNIVERSAL API CONNECTIONS ---
    async loadConnections() {
      try {
        const conns = await invokeNative("get_api_connections");
        this.state.connections = conns;
        this.emit("connections-updated", conns);
        return conns;
      } catch (e) {
        console.warn("[SovereignBridge] loadConnections failed:", e);
        return [];
      }
    }

    async saveConnection(connection) {
      const conns = await invokeNative("save_api_connection", { connection });
      this.state.connections = conns;
      this.emit("connections-updated", conns);
      return conns;
    }

    async deleteConnection(id) {
      const conns = await invokeNative("delete_api_connection", { id });
      this.state.connections = conns;
      this.emit("connections-updated", conns);
      return conns;
    }

    async toggleConnection(id, enabled) {
      const conns = await invokeNative("toggle_api_connection", { id, enabled });
      this.state.connections = conns;
      this.emit("connections-updated", conns);
      return conns;
    }

    async fetchModels(baseUrl, apiKey) {
      return invokeNative("fetch_connection_models", { baseUrl, apiKey });
    }

    async validateAndFetchModels(baseUrl, apiKey, testModel) {
      return invokeNative("validate_and_fetch_models", { baseUrl, apiKey, testModel });
    }

    setActiveSelection(connectionId, modelId) {
      this.state.activeConnectionId = connectionId;
      this.state.activeModelId = modelId;
      this.emit("model-selected", { connectionId, modelId });
    }

    // --- LOCUS & STATUS ---
    async checkLocus() {
      try {
        const status = await invokeNative("check_locus_status");
        this.state.locusStatus = status;
        this.emit("locus-status", status);
        return status;
      } catch (e) {
        return { available: false, version: "unavailable", path: "locus" };
      }
    }

    // --- PROJECT MEMORY & SKILLS & MCP ---
    async getMemory(cwd = ".") {
      return invokeNative("get_project_memory", { cwd });
    }

    async saveMemory(content, cwd = ".") {
      return invokeNative("save_project_memory", { content, cwd });
    }

    async getSkills() {
      return invokeNative("get_skills_config");
    }

    async toggleSkill(id, alwaysOn) {
      return invokeNative("toggle_skill", { id, alwaysOn });
    }

    async getMcp() {
      return invokeNative("get_mcp_config");
    }

    async toggleMcp(id, enabled) {
      return invokeNative("toggle_mcp_server", { id, enabled });
    }

    async getDaemonStatus() {
      return invokeNative("get_daemon_status");
    }
  }

  // Expose as global singleton
  window.SovereignBridge = new SovereignBridgeCore();
})();
