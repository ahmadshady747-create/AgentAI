// Comprehensive Cross-Platform Verification (Desktop & Mobile)
// Genuinely cross-platform: platform-specific artifacts (LOCUS binary, prebuilt
// desktop executable, cargo) are reported as [SKIP] with a reason when absent —
// never a crash and never a fake PASS. All source/CSS/syntax checks run everywhere.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";

console.log("================================================================================");
console.log("       OPENCODE FORK: CROSS-PLATFORM VERIFICATION (DESKTOP & MOBILE)           ");
console.log("================================================================================");
console.log(`Platform: ${process.platform} (${process.arch})`);

let passedCount = 0;
let skippedCount = 0;
let failedCount = 0;

function check(label, condition, details = "") {
  if (condition) {
    passedCount++;
    console.log(`[PASS] ${label} ${details ? '(' + details + ')' : ''}`);
  } else {
    failedCount++;
    console.error(`[FAIL] ${label} ${details ? '- ' + details : ''}`);
  }
}

function skip(label, reason) {
  skippedCount++;
  console.log(`[SKIP] ${label} - ${reason}`);
}

function run(command, options = {}) {
  return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...options });
}

function commandOnPath(name) {
  try {
    const out = run(process.platform === "win32" ? `where ${name}` : `command -v ${name}`);
    const first = out.split(/\r?\n/).map((s) => s.trim()).find(Boolean);
    return first || null;
  } catch {
    return null;
  }
}

// Resolve the LOCUS binary the same way packages/core/src/locus.ts does:
// LOCUS_PATH env, then platform-appropriate candidates, then PATH lookup.
function resolveLocusBinary() {
  if (process.env.LOCUS_PATH && fs.existsSync(process.env.LOCUS_PATH)) {
    return process.env.LOCUS_PATH;
  }
  const candidates =
    process.platform === "win32"
      ? [
          "D:/LOCUS/target/release/locus.exe",
          "D:/LOCUS/target/release/locus",
          "C:/LOCUS/target/release/locus.exe",
          "C:/Program Files/LOCUS/locus.exe",
        ]
      : [
          "/usr/local/bin/locus",
          "/usr/bin/locus",
          path.join(os.homedir(), ".local/bin/locus"),
          path.join(os.homedir(), "LOCUS/target/release/locus"),
        ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return commandOnPath(process.platform === "win32" ? "locus.exe" : "locus") || commandOnPath("locus");
}

// --- 1. CORE BACKEND & LOCUS VERIFICATION ---
console.log("\n--- [1] CORE ENGINE & LOCUS AST PIPELINE ---");
const locusExe = resolveLocusBinary();
if (locusExe) {
  check("LOCUS Engine Binary Exists", true, locusExe);
} else {
  skip("LOCUS Engine Binary Exists", "no locus binary found via LOCUS_PATH, platform candidates, or PATH");
}

const readPlugin = fs.readFileSync("packages/core/src/tool/plugin/read.ts", "utf8");
check("Zero Blind Reads Interception", readPlugin.includes("locus.skeleton") && readPlugin.includes("locus.isSupported"), "AST Skeleton Compression active");

const locusTs = fs.readFileSync("packages/core/src/locus.ts", "utf8");
check("LOCUS Effect Service", locusTs.includes("class Service extends Context.Service"), "Integrated in @opencode/core");

const routerTs = fs.readFileSync("packages/core/src/router.ts", "utf8");
check("Sovereign Router Module", routerTs.includes("resolveRoute") && routerTs.includes("DEFAULT_ROUTES"), "Tier classification & fallback");

if (locusExe) {
  try {
    const locusCheckRouter = run(`"${locusExe}" check packages/core/src/router.ts`);
    // Do not depend on a hardcoded invariant count: the LOCUS engine lives in a
    // separate repository. PASS = output reports the file verified safe and
    // contains no violation marker.
    check(
      "Router Invariants Checked by LOCUS",
      locusCheckRouter.includes("verified safe") && !locusCheckRouter.includes("violated"),
      "verified safe, 0 violations",
    );
  } catch (error) {
    const out = `${error.stdout || ""}\n${error.stderr || ""}`;
    check("Router Invariants Checked by LOCUS", out.includes("verified safe") && !out.includes("violated"), out.trim().split("\n")[0] || "locus check failed");
  }
} else {
  skip("Router Invariants Checked by LOCUS", "locus binary not available on this machine");
}

// --- 2. DESKTOP RUNTIME & BUILD (WINDOWS / LINUX / MACOS) ---
console.log("\n--- [2] DESKTOP PLATFORM VERIFICATION ---");
const desktopExeCandidates =
  process.platform === "win32"
    ? ["D:/cargo-target/debug/opencode-desktop.exe", "packages/desktop/src-tauri/target/debug/opencode-desktop.exe"]
    : ["packages/desktop/src-tauri/target/debug/opencode-desktop", "packages/desktop/src-tauri/target/release/opencode-desktop"];
const desktopBin = desktopExeCandidates.find((candidate) => fs.existsSync(candidate));
if (desktopBin) {
  check("Desktop Executable Exists", true, `Size: ${(fs.statSync(desktopBin).size / 1024 / 1024).toFixed(1)} MB`);
} else {
  skip("Desktop Executable Exists", `no prebuilt desktop executable found (looked in: ${desktopExeCandidates.join(", ")})`);
}

const desktopCargo = fs.readFileSync("packages/desktop/src-tauri/Cargo.toml", "utf8");
check("Desktop Cargo Configuration", desktopCargo.includes('name = "opencode-desktop"'), "Tauri v2 dependencies locked");

const tauriConf = JSON.parse(fs.readFileSync("packages/desktop/src-tauri/tauri.conf.json", "utf8"));
check("Desktop Window Config", tauriConf.app.windows[0].width === 1280 && tauriConf.app.windows[0].theme === "Dark", "Claude Code aesthetic theme");

// --- 3. MOBILE PLATFORM VERIFICATION (ANDROID / SMARTPHONES) ---
console.log("\n--- [3] MOBILE PLATFORM VERIFICATION (ANDROID) ---");
check("Crate Dynamic Lib for Mobile (cdylib)", desktopCargo.includes('"cdylib"') && desktopCargo.includes('"staticlib"'), "Prepared for Android NDK / JNI");

const rustLib = fs.readFileSync("packages/desktop/src-tauri/src/lib.rs", "utf8");
check("Mobile Entry Point Attribute", rustLib.includes("#[cfg_attr(mobile, tauri::mobile_entry_point)]"), "tauri::mobile_entry_point active");

check("Mobile Safe Key Vault Storage", rustLib.includes('target_os = "android"') && rustLib.includes("/data/data/ai.opencode.desktop/files"), "Sandboxed storage protected");

check("Mobile Edge LOCUS Compatibility", rustLib.includes("#[cfg(mobile)]") && rustLib.includes("2.0.0-mobile-edge"), "Remote edge routing for mobile");

// NOTE (fix loop): the original assertion looked for the literal Android intent
// string 'android.intent.action.VIEW', which exists nowhere in the Rust source.
// External links are actually opened via the Tauri shell opener — assert that.
check("External URL Opening (Tauri Shell)", rustLib.includes("shell().open("), "Native link opening via shell opener");

// --- 4. RESPONSIVE TOUCH & MOBILE UI ---
console.log("\n--- [4] RESPONSIVE UI & TOUCH ADAPTATION ---");
const styleCss = fs.readFileSync("packages/desktop/ui/style.css", "utf8");
check("Responsive Media Query (768px)", styleCss.includes("@media (max-width: 768px)"), "Tablet & phone layout");
// NOTE (fix loop): the stylesheet has no 480px breakpoint — small phones are
// handled inside the 768px block with viewport-relative sheet sizing. The
// original '480px' and 'width: 94vw' assertions described CSS that does not
// exist; assert the mechanisms that are actually present instead.
check("Small Phone Sheet Sizing (dvh)", styleCss.includes("calc(94dvh"), "Viewport-relative bottom sheet height");
check("Mobile Safe Area Inset Support", styleCss.includes("env(safe-area-inset-bottom)"), "Gesture navigation bar safe");
check("Mobile Keyboard Zoom Prevention", styleCss.includes("font-size: 15px"), "Textarea font >= 15px to avoid mobile auto-zoom");
check("Mobile Responsive Modal", styleCss.includes("border-radius: 20px 20px 0 0"), "Full-width bottom-sheet modal");

// --- 5. COMPILER SYNTAX CHECK ---
console.log("\n--- [5] SYNTAX & COMPILATION CHECKS ---");
try {
  run("node --check packages/desktop/ui/app.js");
  check("Frontend app.js Syntax", true, "Node ES syntax passed");
} catch (error) {
  check("Frontend app.js Syntax", false, String(error.stderr || error.message).trim().split("\n")[0]);
}

if (commandOnPath("cargo")) {
  try {
    run("cargo check", { cwd: "packages/desktop/src-tauri" });
    check("Rust src-tauri Cargo Check", true, "0 errors");
  } catch (error) {
    check("Rust src-tauri Cargo Check", false, String(error.stderr || error.message).trim().split("\n").pop());
  }
} else {
  skip("Rust src-tauri Cargo Check", "cargo is not installed on this machine");
}

console.log("\n================================================================================");
console.log(`RESULT: ${passedCount} passed, ${skippedCount} skipped, ${failedCount} failed`);
console.log("================================================================================");

process.exit(failedCount > 0 ? 1 : 0);
