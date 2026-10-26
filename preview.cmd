@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0preview.ps1" %*
