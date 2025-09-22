require('dotenv').config();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware để xác thực JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Token không được cung cấp' 
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        message: 'Token không hợp lệ' 
      });
    }

    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.user = { id: decoded.userId, email: decoded.email };
    next();
  });
};

// Middleware optional - không bắt buộc phải có token
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.userId = null;
    req.userEmail = null;
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      req.userId = null;
      req.userEmail = null;
      req.user = null;
    } else {
      req.userId = decoded.userId;
      req.userEmail = decoded.email;
      req.user = { id: decoded.userId, email: decoded.email };
    }
    next();
  });
};

module.exports = {
  authenticateToken,
  optionalAuth
};
