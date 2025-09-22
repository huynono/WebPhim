const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendOTPEmail } = require('../utils/emailService');

const prisma = new PrismaClient();

// JWT Secret - nên đặt trong .env
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Danh sách avatar hoạt hình/anime mặc định
const DEFAULT_AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=1&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=2&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=3&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=4&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=5&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=6&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=7&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=8&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=9&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=10&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=11&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=12&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=13&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=14&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=15&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf'
];

// Function để random avatar
const getRandomAvatar = () => {
  const randomIndex = Math.floor(Math.random() * DEFAULT_AVATARS.length);
  return DEFAULT_AVATARS[randomIndex];
};

// Export JWT_SECRET để sử dụng trong middleware
module.exports.JWT_SECRET = JWT_SECRET;

// Register user
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng điền đầy đủ thông tin' 
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email đã được sử dụng' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with random avatar
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        provider: 'local',
        avatar: getRandomAvatar()
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        provider: true,
        createdAt: true
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '4d' }
    );

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      data: {
        user,
        token
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server' 
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng điền đầy đủ thông tin' 
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email hoặc mật khẩu không đúng' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tài khoản đã bị khóa' 
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email hoặc mật khẩu không đúng' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '4d' }
    );

    // Return user data (without password)
    const { password: _, ...userData } = user;

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        user: userData,
        token
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server' 
    });
  }
};

// OAuth login/register (Google, Facebook)
const oauthCallback = async (req, res) => {
  try {
    const { provider, providerId, email, name, avatar } = req.body;

    // Validation
    if (!provider || !providerId || !email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Thiếu thông tin OAuth' 
      });
    }

    // Check if user exists
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { providerId, provider }
        ]
      }
    });

    if (user) {
      // Update provider info if needed
      if (user.provider !== provider || user.providerId !== providerId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            provider,
            providerId,
            avatar: avatar || user.avatar,
            name: name || user.name
          },
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            provider: true,
            createdAt: true
          }
        });
      }
    } else {
      // Create new user with random avatar if no avatar provided
      user = await prisma.user.create({
        data: {
          email,
          name,
          avatar: avatar || getRandomAvatar(),
          provider,
          providerId
        },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          provider: true,
          createdAt: true
        }
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '4d' }
    );

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        user,
        token
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server' 
    });
  }
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    const userId = req.userId; // From middleware

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        provider: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy user' 
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server' 
    });
  }
};

// Logout (client-side token removal)
const logout = async (req, res) => {
  res.json({
    success: true,
    message: 'Đăng xuất thành công'
  });
};

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        provider: true,
        isActive: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: { users }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server' 
    });
  }
};

// Create user (Admin only)
const createUser = async (req, res) => {
  try {
    const { name, email, password, isActive } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng điền đầy đủ thông tin' 
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email đã được sử dụng' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        provider: 'local',
        avatar: getRandomAvatar(),
        isActive: isActive !== undefined ? isActive : true
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        provider: true,
        isActive: true,
        createdAt: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Tạo user thành công',
      data: { user }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server' 
    });
  }
};

// Update user (Admin only)
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, isActive } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy user' 
      });
    }

    // Check if email is already used by another user
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email }
      });

      if (emailExists) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email đã được sử dụng' 
        });
      }
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(isActive !== undefined && { isActive })
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        provider: true,
        isActive: true,
        createdAt: true
      }
    });

    res.json({
      success: true,
      message: 'Cập nhật user thành công',
      data: { user }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server' 
    });
  }
};

// Delete user (Admin only)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy user' 
      });
    }

    // Delete user
    await prisma.user.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Xóa user thành công'
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server' 
    });
  }
};

// Forgot password - Send OTP
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Email không tồn tại trong hệ thống' 
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiry time (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Delete any existing OTP for this email
    await prisma.oTP.deleteMany({
      where: { email }
    });
    
    // Store OTP in database
    await prisma.oTP.create({
      data: {
        email,
        code: otp,
        expiresAt
      }
    });
    

    // Send email with OTP
    const emailResult = await sendOTPEmail(email, otp, user.name);
    
    if (emailResult.success) {
      res.json({
        success: true,
        message: 'Mã OTP đã được gửi đến email của bạn',
        data: { 
          email: email
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Không thể gửi email. Vui lòng thử lại sau.',
        error: emailResult.error
      });
    }

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server' 
    });
  }
};

// Verify OTP
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validation
    if (!email || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng nhập đầy đủ email và mã OTP' 
      });
    }

    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Mã OTP phải là 6 chữ số' 
      });
    }

    // Find valid OTP in database
    const otpRecord = await prisma.oTP.findFirst({
      where: {
        email,
        code: otp,
        isUsed: false,
        expiresAt: {
          gt: new Date() // Chưa hết hạn
        }
      }
    });

    if (!otpRecord) {
      return res.status(400).json({ 
        success: false, 
        message: 'Mã OTP không hợp lệ hoặc đã hết hạn' 
      });
    }

    // Mark OTP as used
    await prisma.oTP.update({
      where: { id: otpRecord.id },
      data: { isUsed: true }
    });

    res.json({
      success: true,
      message: 'Xác thực OTP thành công'
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server' 
    });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Validation
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng nhập đầy đủ thông tin' 
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Email không tồn tại trong hệ thống' 
      });
    }

    // Verify OTP
    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Mã OTP không hợp lệ' 
      });
    }

    // Find valid OTP in database
    const otpRecord = await prisma.oTP.findFirst({
      where: {
        email,
        code: otp,
        isUsed: false,
        expiresAt: {
          gt: new Date() // Chưa hết hạn
        }
      }
    });

    if (!otpRecord) {
      return res.status(400).json({ 
        success: false, 
        message: 'Mã OTP không hợp lệ hoặc đã hết hạn' 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and mark OTP as used
    await prisma.$transaction([
      prisma.user.update({
        where: { email },
        data: { password: hashedPassword }
      }),
      prisma.oTP.update({
        where: { id: otpRecord.id },
        data: { isUsed: true }
      })
    ]);

    res.json({
      success: true,
      message: 'Đặt lại mật khẩu thành công'
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server' 
    });
  }
};

// Clean up expired OTPs (có thể gọi định kỳ)
const cleanupExpiredOTPs = async () => {
  try {
    const result = await prisma.oTP.deleteMany({
      where: {
        expiresAt: {
          lt: new Date() // Đã hết hạn
        }
      }
    });
    return result.count;
  } catch (error) {
    return 0;
  }
};

module.exports = {
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
  resetPassword,
  cleanupExpiredOTPs
};
