@echo off
chcp 65001 >nul
cls
echo ╔════════════════════════════════════════════════════════════════╗
echo ║     GERADOR DE INSTALADOR V2 - SISTEMA GESTÃO ESCOLAR         ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo Este script irá:
echo   1. Verificar dependências
echo   2. Fazer build do frontend
echo   3. Copiar frontend para Electron
echo   4. Instalar dependências do Electron
echo   5. Gerar instalador Windows (.exe)
echo.
echo ⏱️  Tempo estimado: 10-15 minutos
echo 💾 Espaço necessário: ~500MB
echo.
echo ⚠️  IMPORTANTE: Execute como ADMINISTRADOR!
echo.
pause

REM ============================================================================
REM VERIFICAÇÕES INICIAIS
REM ============================================================================

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║ ETAPA 1/6: Verificando ambiente                               ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

REM Verificar Node.js
echo [✓] Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [✗] ERRO: Node.js não está instalado!
    echo.
    echo Por favor, instale Node.js 18 ou superior:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo     Node.js %NODE_VERSION% encontrado ✓
echo.

REM Verificar npm
echo [✓] Verificando npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo [✗] ERRO: npm não está instalado!
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo     npm %NPM_VERSION% encontrado ✓
echo.

REM Verificar estrutura de pastas
echo [✓] Verificando estrutura do projeto...
if not exist "frontend" (
    echo [✗] ERRO: Pasta 'frontend' não encontrada!
    pause
    exit /b 1
)
if not exist "electron" (
    echo [✗] ERRO: Pasta 'electron' não encontrada!
    pause
    exit /b 1
)
echo     Estrutura do projeto OK ✓
echo.

echo ✅ Ambiente verificado com sucesso!
echo.
pause

REM ============================================================================
REM BUILD DO FRONTEND
REM ============================================================================

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║ ETAPA 2/6: Build do Frontend                                  ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo ⏱️  Isso pode demorar 5-10 minutos...
echo 📦 Gerando arquivos otimizados para produção...
echo.

cd frontend

REM Verificar se node_modules existe
if not exist "node_modules" (
    echo [!] Dependências do frontend não instaladas
    echo [✓] Instalando dependências...
    call npm install
    if errorlevel 1 (
        echo [✗] ERRO: Falha ao instalar dependências do frontend
        cd ..
        pause
        exit /b 1
    )
)

REM Limpar build anterior
if exist "dist" (
    echo [✓] Limpando build anterior...
    rmdir /s /q dist
)

REM Fazer build
echo [✓] Iniciando build do frontend...
call npm run build
if errorlevel 1 (
    echo.
    echo [✗] ERRO: Build do frontend falhou!
    cd ..
    pause
    exit /b 1
)

REM Verificar se build foi criado
if not exist "dist\index.html" (
    echo [✗] ERRO: Build não gerou arquivos esperados!
    cd ..
    pause
    exit /b 1
)

cd ..
echo.
echo ✅ Frontend build concluído!
echo    📁 Arquivos em: frontend\dist\
echo.
pause

REM ============================================================================
REM COPIAR FRONTEND PARA ELECTRON
REM ============================================================================

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║ ETAPA 3/6: Copiando Frontend para Electron                    ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

cd electron

REM Remover pasta antiga
if exist "frontend" (
    echo [✓] Removendo cópia anterior...
    rmdir /s /q frontend
)

REM Criar estrutura
echo [✓] Criando estrutura de pastas...
mkdir frontend\dist

REM Copiar arquivos
echo [✓] Copiando arquivos do frontend...
xcopy /E /I /Y ..\frontend\dist frontend\dist >nul
if errorlevel 1 (
    echo [✗] ERRO: Falha ao copiar frontend!
    cd ..
    pause
    exit /b 1
)

cd ..
echo.
echo ✅ Frontend copiado para Electron!
echo.
pause

REM ============================================================================
REM DEPENDÊNCIAS DO ELECTRON
REM ============================================================================

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║ ETAPA 4/6: Instalando Dependências do Electron                ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

cd electron

if not exist "node_modules" (
    echo [✓] Instalando dependências do Electron...
    echo    Isso pode demorar 2-3 minutos...
    echo.
    call npm install
    if errorlevel 1 (
        echo [✗] ERRO: Falha ao instalar dependências do Electron
        cd ..
        pause
        exit /b 1
    )
) else (
    echo [✓] Dependências já instaladas
    echo [✓] Verificando fs-extra...
    call npm install fs-extra
)

cd ..
echo.
echo ✅ Dependências do Electron instaladas!
echo.
pause

REM ============================================================================
REM GERAR INSTALADOR
REM ============================================================================

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║ ETAPA 5/6: Gerando Instalador Windows                         ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo ⏱️  Isso pode demorar 5-10 minutos...
echo 📦 Empacotando aplicação...
echo.

cd electron

REM Limpar dist anterior
if exist "dist" (
    echo [✓] Limpando instaladores anteriores...
    rmdir /s /q dist
)

echo [✓] Iniciando electron-builder...
echo.
call npm run build:win
if errorlevel 1 (
    echo.
    echo [✗] ERRO: Falha ao gerar instalador!
    echo.
    echo Tente:
    echo   1. Liberar espaço em disco (mínimo 2GB)
    echo   2. Desabilitar antivírus temporariamente
    echo   3. Executar como Administrador
    echo.
    cd ..
    pause
    exit /b 1
)

cd ..
echo.
echo ✅ Instalador gerado com sucesso!
echo.
pause

REM ============================================================================
REM VERIFICAÇÃO FINAL
REM ============================================================================

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║ ETAPA 6/6: Verificação Final                                  ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

REM Verificar se instalador foi criado
if not exist "electron\dist\*.exe" (
    echo [✗] ERRO: Instalador não foi encontrado!
    pause
    exit /b 1
)

REM Obter informações do instalador
for %%F in (electron\dist\*.exe) do (
    set INSTALADOR=%%~nxF
    set TAMANHO=%%~zF
)

REM Converter tamanho para MB
set /a TAMANHO_MB=%TAMANHO% / 1048576

echo [✓] Instalador encontrado:
echo     📄 Nome: %INSTALADOR%
echo     💾 Tamanho: ~%TAMANHO_MB% MB
echo     📁 Local: %CD%\electron\dist\
echo.

REM ============================================================================
REM CONCLUSÃO
REM ============================================================================

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                    ✅ PROCESSO CONCLUÍDO!                      ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo 🎉 Instalador gerado com sucesso!
echo.
echo 📦 Arquivo: %INSTALADOR%
echo 📁 Local: %CD%\electron\dist\
echo 💾 Tamanho: ~%TAMANHO_MB% MB
echo.
echo ═══════════════════════════════════════════════════════════════
echo  PRÓXIMOS PASSOS:
echo ═══════════════════════════════════════════════════════════════
echo.
echo  1️⃣  TESTAR O INSTALADOR
echo     • Execute o instalador neste PC
echo     • Verifique se tudo funciona
echo     • Teste login e funcionalidades
echo.
echo  2️⃣  CONFIGURAR BACKEND
echo     • O app precisa do backend rodando
echo     • Opção 1: Backend no Vercel (atual)
echo     • Opção 2: Backend local (npm start no backend)
echo.
echo  3️⃣  DISTRIBUIR PARA USUÁRIOS
echo     • Copie o arquivo .exe
echo     • Envie por email, pen drive ou rede
echo     • Usuários executam e instalam
echo.
echo ═══════════════════════════════════════════════════════════════
echo.
echo 💡 IMPORTANTE:
echo    • O frontend está empacotado no instalador
echo    • O backend precisa estar acessível (Vercel ou local)
echo    • Configure a URL do backend no .env se necessário
echo.
echo Deseja abrir a pasta do instalador? (S/N)
set /p ABRIR=
if /i "%ABRIR%"=="S" (
    explorer electron\dist
)
echo.
echo Pressione qualquer tecla para sair...
pause >nul
