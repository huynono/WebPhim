import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Mail, Lock, User, UserCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { setUser } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isOTPVerification, setIsOTPVerification] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    otp: '',
    newPassword: '',
    confirmNewPassword: ''
  });

  // Load saved credentials when modal opens
  useEffect(() => {
    if (isOpen) {
      // Load current user avatar if logged in
      const currentUser = localStorage.getItem('user');
      if (currentUser) {
        try {
          const userData = JSON.parse(currentUser);
          setUserAvatar(userData.avatar);
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
      
      const savedEmail = localStorage.getItem('rememberedEmail');
      const savedPassword = localStorage.getItem('rememberedPassword');
      const savedRememberMe = localStorage.getItem('rememberMe') === 'true';
      
      if (savedEmail && savedPassword && savedRememberMe) {
        console.log('Loading saved credentials (user will click login manually)');
        setFormData(prev => ({
          ...prev,
          email: savedEmail,
          password: savedPassword
        }));
        setRememberMe(true);
        // KHÔNG tự động submit, để user click "Đăng nhập"
      } else {
        // Nếu không có remember me, reset form
        console.log('No remember me, clearing form');
        setFormData({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          otp: '',
          newPassword: '',
          confirmNewPassword: ''
        });
        setRememberMe(false);
      }
    } else {
      // Reset avatar when modal closes
      setUserAvatar(null);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isLogin) {
        // Xử lý đăng nhập
        const response = await fetch('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password
          })
        });

        const data = await response.json();
        console.log('Login response:', data);
        console.log('Response status:', response.status);
        
        if (data.success) {
          // Lưu token vào localStorage
          console.log('Saving token:', data.data.token);
          console.log('Saving user:', data.data.user);
          localStorage.setItem('token', data.data.token);
          localStorage.setItem('user', JSON.stringify(data.data.user));
          
          // Update context
          setUser(data.data.user);
          
          // Verify data was saved
          console.log('Token saved:', localStorage.getItem('token'));
          console.log('User saved:', localStorage.getItem('user'));
          
          // Lưu thông tin đăng nhập nếu "Ghi nhớ đăng nhập" được chọn
          if (rememberMe) {
            localStorage.setItem('rememberedEmail', formData.email);
            localStorage.setItem('rememberedPassword', formData.password);
            localStorage.setItem('rememberMe', 'true');
          } else {
            // Xóa thông tin đã lưu nếu không chọn "Ghi nhớ"
            localStorage.removeItem('rememberedEmail');
            localStorage.removeItem('rememberedPassword');
            localStorage.removeItem('rememberMe');
          }
          
          // Lưu avatar để hiển thị
          setUserAvatar(data.data.user.avatar);
          alert('Đăng nhập thành công!');
          onClose();
          // Trigger custom event để Header update
          window.dispatchEvent(new CustomEvent('userLoggedIn'));
          // Không reload ngay, để Header tự update
          // window.location.reload();
        } else {
          alert(data.message || 'Đăng nhập thất bại!');
        }
      } else {
        // Xử lý đăng ký
        if (formData.password !== formData.confirmPassword) {
          alert('Mật khẩu xác nhận không khớp!');
          return;
        }

        const response = await fetch('http://localhost:3000/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password
          })
        });

        const data = await response.json();
        
        if (data.success) {
          // Lưu avatar để hiển thị
          setUserAvatar(data.data.user.avatar);
          alert('Đăng ký thành công! Vui lòng đăng nhập.');
          // Chuyển sang form đăng nhập
          setIsLogin(true);
          setFormData({
            name: '',
            email: formData.email, // Giữ lại email để user dễ đăng nhập
            password: '',
            confirmPassword: '',
            otp: '',
            newPassword: '',
            confirmNewPassword: ''
          });
        } else {
          alert(data.message || 'Đăng ký thất bại!');
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      alert('Có lỗi xảy ra, vui lòng thử lại!');
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setRememberMe(false);
    setIsForgotPassword(false);
    setIsOTPVerification(false);
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      otp: '',
      newPassword: '',
      confirmNewPassword: ''
    });
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      alert('Vui lòng nhập email!');
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setIsOTPVerification(true);
        alert('Mã OTP đã được gửi đến email của bạn!');
      } else {
        alert(data.message || 'Gửi OTP thất bại!');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      alert('Có lỗi xảy ra, vui lòng thử lại!');
    }
  };


  const handleResetPassword = async () => {
    if (!formData.newPassword || !formData.confirmNewPassword) {
      alert('Vui lòng nhập đầy đủ mật khẩu mới!');
      return;
    }

    if (formData.newPassword !== formData.confirmNewPassword) {
      alert('Mật khẩu xác nhận không khớp!');
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          otp: formData.otp,
          newPassword: formData.newPassword
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Đặt lại mật khẩu thành công! Vui lòng đăng nhập.');
        // Reset form và quay về login
        setIsForgotPassword(false);
        setIsOTPVerification(false);
        setIsLogin(true);
        setFormData({
          name: '',
          email: formData.email, // Giữ lại email để user dễ đăng nhập
          password: '',
          confirmPassword: '',
          otp: '',
          newPassword: '',
          confirmNewPassword: ''
        });
      } else {
        alert(data.message || 'Đặt lại mật khẩu thất bại!');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      alert('Có lỗi xảy ra, vui lòng thử lại!');
    }
  };

  const goBackToLogin = () => {
    setIsForgotPassword(false);
    setIsOTPVerification(false);
    setIsLogin(true);
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      otp: '',
      newPassword: '',
      confirmNewPassword: ''
    });
  };

  const handleGoogleLogin = async () => {
    try {
      // Tạm thời sử dụng mock data cho Google OAuth
      // Trong thực tế, bạn sẽ tích hợp với Google OAuth API
      const mockGoogleData = {
        provider: 'google',
        providerId: 'google_' + Date.now(),
        email: 'user@gmail.com',
        name: 'Google User',
        avatar: 'https://via.placeholder.com/150'
      };

      const response = await fetch('http://localhost:3000/api/auth/oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockGoogleData)
      });

      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        
        // Update context
        setUser(data.data.user);
        
        alert('Đăng nhập Google thành công!');
        onClose();
        window.location.reload();
      } else {
        alert(data.message || 'Đăng nhập Google thất bại!');
      }
    } catch (error) {
      console.error('Google OAuth error:', error);
      alert('Có lỗi xảy ra với Google OAuth!');
    }
  };

  const handleFacebookLogin = async () => {
    try {
      // Tạm thời sử dụng mock data cho Facebook OAuth
      // Trong thực tế, bạn sẽ tích hợp với Facebook OAuth API
      const mockFacebookData = {
        provider: 'facebook',
        providerId: 'facebook_' + Date.now(),
        email: 'user@facebook.com',
        name: 'Facebook User',
        avatar: 'https://via.placeholder.com/150'
      };

      const response = await fetch('http://localhost:3000/api/auth/oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockFacebookData)
      });

      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        
        // Update context
        setUser(data.data.user);
        
        alert('Đăng nhập Facebook thành công!');
        onClose();
        window.location.reload();
      } else {
        alert(data.message || 'Đăng nhập Facebook thất bại!');
      }
    } catch (error) {
      console.error('Facebook OAuth error:', error);
      alert('Có lỗi xảy ra với Facebook OAuth!');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-md relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center justify-center mb-4">
            {userAvatar ? (
              <div className="relative">
                <img 
                  src={userAvatar} 
                  alt="User Avatar" 
                  className="w-16 h-16 rounded-full object-cover border-2 border-red-500"
                />
                <div className="absolute -bottom-1 -right-1 bg-green-500 w-5 h-5 rounded-full border-2 border-gray-900 flex items-center justify-center">
                  <UserCheck className="w-3 h-3 text-white" />
                </div>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-700 border-2 border-gray-600 flex items-center justify-center">
                <User className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 text-center">
            {isForgotPassword 
              ? (isOTPVerification ? 'Xác thực OTP' : 'Quên mật khẩu')
              : (isLogin ? 'Đăng nhập' : 'Đăng ký')
            }
          </h2>
          <p className="text-gray-400 text-center">
            {isForgotPassword 
              ? (isOTPVerification 
                  ? 'Nhập mã OTP đã gửi đến email của bạn' 
                  : 'Nhập email để nhận mã OTP')
                : (isLogin 
                    ? 'Chào mừng bạn quay trở lại!' 
                    : 'Tạo tài khoản mới để bắt đầu')
            }
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 pt-0">
          {/* Quên mật khẩu - Bước 1: Nhập email */}
          {isForgotPassword && !isOTPVerification && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-gray-800 text-white pl-10 pr-4 py-3 rounded-lg border border-gray-700 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                    placeholder="Nhập email của bạn"
                    required
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleForgotPassword}
                className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white py-3 rounded-lg font-medium hover:from-red-700 hover:to-red-600 transition-all duration-200 transform hover:scale-[1.02] mb-4"
              >
                Gửi mã OTP
              </button>

              <button
                type="button"
                onClick={goBackToLogin}
                className="w-full bg-gray-700 text-white py-3 rounded-lg font-medium hover:bg-gray-600 transition-all duration-200"
              >
                Quay lại đăng nhập
              </button>
            </>
          )}

          {/* Quên mật khẩu - Bước 2: Xác thực OTP */}
          {isForgotPassword && isOTPVerification && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Mã OTP
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="otp"
                    value={formData.otp}
                    onChange={handleInputChange}
                    className="w-full bg-gray-800 text-white pl-10 pr-4 py-3 rounded-lg border border-gray-700 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                    placeholder="Nhập mã OTP 6 số"
                    required
                    maxLength={6}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    className="w-full bg-gray-800 text-white pl-10 pr-12 py-3 rounded-lg border border-gray-700 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                    placeholder="Nhập mật khẩu mới"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Xác nhận mật khẩu mới
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmNewPassword"
                    value={formData.confirmNewPassword}
                    onChange={handleInputChange}
                    className="w-full bg-gray-800 text-white pl-10 pr-4 py-3 rounded-lg border border-gray-700 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                    placeholder="Nhập lại mật khẩu mới"
                    required
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetPassword}
                className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white py-3 rounded-lg font-medium hover:from-red-700 hover:to-red-600 transition-all duration-200 transform hover:scale-[1.02] mb-4"
              >
                Đặt lại mật khẩu
              </button>

              <button
                type="button"
                onClick={goBackToLogin}
                className="w-full bg-gray-700 text-white py-3 rounded-lg font-medium hover:bg-gray-600 transition-all duration-200"
              >
                Quay lại đăng nhập
              </button>
            </>
          )}

          {/* Form đăng nhập/đăng ký bình thường */}
          {!isForgotPassword && (
            <>
              {!isLogin && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Họ và tên
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full bg-gray-800 text-white pl-10 pr-4 py-3 rounded-lg border border-gray-700 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                      placeholder="Nhập họ và tên"
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-gray-800 text-white pl-10 pr-4 py-3 rounded-lg border border-gray-700 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                    placeholder="Nhập email"
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Mật khẩu
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full bg-gray-800 text-white pl-10 pr-12 py-3 rounded-lg border border-gray-700 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                    placeholder="Nhập mật khẩu"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Xác nhận mật khẩu
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full bg-gray-800 text-white pl-10 pr-4 py-3 rounded-lg border border-gray-700 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                      placeholder="Nhập lại mật khẩu"
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              {isLogin && (
                <div className="mb-6">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 text-red-600 bg-gray-800 border-gray-700 rounded focus:ring-red-500 focus:ring-2"
                      />
                      <span className="ml-2 text-sm text-gray-300">Ghi nhớ đăng nhập</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(true)}
                      className="text-sm text-red-400 hover:text-red-300 transition-colors"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white py-3 rounded-lg font-medium hover:from-red-700 hover:to-red-600 transition-all duration-200 transform hover:scale-[1.02]"
              >
                {isLogin ? 'Đăng nhập' : 'Đăng ký'}
              </button>
            </>
          )}

          {/* Switch mode - chỉ hiển thị khi không ở chế độ quên mật khẩu */}
          {!isForgotPassword && (
            <div className="mt-6 text-center">
              <p className="text-gray-400">
                {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
                <button
                  type="button"
                  onClick={switchMode}
                  className="ml-1 text-red-400 hover:text-red-300 font-medium transition-colors"
                >
                  {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
                </button>
              </p>
            </div>
          )}

          {/* Social login - chỉ hiển thị khi không ở chế độ quên mật khẩu */}
          {!isForgotPassword && (
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-900 text-gray-400">Hoặc tiếp tục với</span>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-700 rounded-lg shadow-sm bg-gray-800 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="ml-2">Google</span>
                </button>
                
                <button
                  type="button"
                  onClick={handleFacebookLogin}
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-700 rounded-lg shadow-sm bg-gray-800 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span className="ml-2">Facebook</span>
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
