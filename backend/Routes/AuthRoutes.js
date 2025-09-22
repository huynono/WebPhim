const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  oauthCallback, 
  getCurrentUser, 
  logout,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  forgotPassword,
  verifyOTP,
  resetPassword
} = require('../Controller/AuthController');
const { authenticateToken } = require('../Middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/oauth', oauthCallback);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/me', authenticateToken, getCurrentUser);

// User Management routes - Public (không cần token)
router.get('/users', getAllUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

module.exports = router;
