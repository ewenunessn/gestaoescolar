@echo off
setlocal

cd /d "%~dp0"

if not exist "node_modules\vite\bin\vite.js" (
  if exist "..\frontend\node_modules\vite\bin\vite.js" (
    if not exist "node_modules" (
      mklink /J node_modules "..\frontend\node_modules" >nul
    )
  )
)

where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  node ".\node_modules\vite\bin\vite.js" --host 0.0.0.0 --port 5174
  exit /b %ERRORLEVEL%
)

set CODEX_NODE=%LOCALAPPDATA%\OpenAI\Codex\bin\node.exe
if exist "%CODEX_NODE%" (
  "%CODEX_NODE%" ".\node_modules\vite\bin\vite.js" --host 0.0.0.0 --port 5174
  exit /b %ERRORLEVEL%
)

echo Node.js nao encontrado.
echo Instale o Node.js LTS em https://nodejs.org/ e abra o terminal novamente.
exit /b 1
