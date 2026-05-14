@echo off
setlocal

cd /d "%~dp0"

if "%SETUP_TOKEN%"=="" (
  set SETUP_TOKEN=dev-setup-token
)

go run ./cmd/api
