#!/bin/bash

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install
cd ..

# Start backend server
echo "Starting backend server..."
cd backend
npm start
