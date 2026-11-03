@echo off
cd /d "%~dp0"
if not exist logs mkdir logs
"C:\Program Files\nodejs\node.exe" publish.js --run --headless >> logs\publish.log 2>&1
