@echo off
echo Parando processos Node na porta 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /F /PID %%a 2>nul
timeout /t 2 /nobreak >nul
echo Iniciando backend...
cd backend
start "Backend Server" cmd /k "npm run dev"
echo Backend iniciado!
