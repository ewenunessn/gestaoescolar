@echo off
echo ========================================
echo BACKUP COMPLETO DO BANCO DE DADOS POSTGRESQL
echo ========================================
echo.

REM Configurações do banco de dados
set HOST=localhost
set PORT=5432
set DATABASE=alimentacao_escolar
set USER=postgres
set PGPASSWORD=postgres

REM Nome do arquivo de backup com data e hora
set BACKUP_FILE=backup-alimentacao-escolar-%date:~-4,4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%%time:~6,2%.sql
set BACKUP_FILE=%BACKUP_FILE: =0%

echo Criando backup do banco de dados: %DATABASE%
echo Arquivo: %BACKUP_FILE%
echo.

REM Criar diretório de backup se não existir
if not exist "backups" mkdir backups

REM Executar o pg_dump para criar backup completo
echo Executando backup...
pg_dump -h %HOST% -p %PORT% -U %USER% -d %DATABASE% -f "backups\%BACKUP_FILE%" -v --clean --create --inserts --column-inserts

REM Verificar se o backup foi criado com sucesso
if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo BACKUP CONCLUÍDO COM SUCESSO!
    echo ========================================
    echo Arquivo criado: backups\%BACKUP_FILE%
    echo Tamanho do arquivo:
    for %%I in (backups\%BACKUP_FILE%) do echo %%~zI bytes
) else (
    echo.
    echo ========================================
    echo ERRO AO CRIAR BACKUP!
    echo ========================================
)

echo.
echo Pressione qualquer tecla para sair...
pause > nul