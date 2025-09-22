@echo off
echo Fixing dependency conflicts...

echo Removing node_modules and package-lock.json...
cd backend
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

echo Installing dependencies...
npm install

echo Dependencies fixed!
pause
