@echo off

echo Building frontend...
cd project
call npm install
call npm run build
cd ..

echo Installing backend dependencies...
cd backend
call npm install
cd ..

echo Starting backend server...
cd backend
call npm start
