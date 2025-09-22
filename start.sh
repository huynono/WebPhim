#!/bin/bash

# Build frontend
echo "Building frontend..."
cd project
npm install
npm run build
cd ..

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install
cd ..

# Start backend server
echo "Starting backend server..."
cd backend
npm start
