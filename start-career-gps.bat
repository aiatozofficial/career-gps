@echo off
cd /d "%~dp0"
echo Starting Career GPS Backend Server...
start cmd /k "node server/index.js"
echo Starting Career GPS Frontend at http://127.0.0.1:5173
echo Keep this window open while using the app.
npm.cmd run dev -- --port 5173
