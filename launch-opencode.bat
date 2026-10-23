@echo off
setlocal
cd /d "c:\Users\awsat\Desktop\AgentAI\opencode"
set "PATH=%LOCALAPPDATA%\Programs\Git\cmd;%USERPROFILE%\.bun\bin;%PATH%"

netstat -ano | findstr ":4096 " | findstr "LISTENING" >nul
if errorlevel 1 (
    start "" /b bun run --cwd packages/cli src/index.ts serve --port 4096
    timeout /t 2 /nobreak >nul
)

start "" msedge.exe --app="http://127.0.0.1:4096"
