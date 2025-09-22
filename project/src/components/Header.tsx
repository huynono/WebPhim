import { Menu, User, Film, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import { clearAuthData } from '../utils/auth';


const Header = () => {
  const { openAuthModal, user, setUser } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);


  const handleUserClick = () => {
    if (user) {
      setShowUserMenu(!showUserMenu);
    } else {
      openAuthModal();
    }
  };

  const handleLogout = () => {
    clearAuthData();
    setUser(null);
    setShowUserMenu(false);
    setShowMobileMenu(false);
    window.location.reload();
  };


  return (
    <header className="bg-black/95 backdrop-blur-sm text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Film className="h-8 w-8 text-red-600" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-400 bg-clip-text text-transparent">
              MovieStream
            </h1>
          </Link>

          {/* Navigation Menu */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/user-upload" className="text-gray-300 hover:text-red-400 transition-colors font-medium">
              Gửi Video Cho Chúng Tôi
            </Link>
            {user && (
              <>
                <Link to="/favorites" className="text-gray-300 hover:text-red-400 transition-colors font-medium">
                  Phim yêu thích
                </Link>
                <Link to="/watch-history" className="text-gray-300 hover:text-red-400 transition-colors font-medium">
                  Lịch sử xem
                </Link>
              </>
            )}
          </nav>

          {/* User */}
          <div className="flex items-center space-x-2 md:space-x-4">

            <div className="relative">
              <button 
                onClick={handleUserClick}
                className="p-2 hover:bg-gray-800 rounded-full transition-colors flex items-center space-x-2"
              >
                {user?.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user.name} 
                    className="h-6 w-6 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-5 w-5" />
                )}
                {user && (
                  <span className="hidden sm:block text-sm font-medium">
                    {user.name}
                  </span>
                )}
              </button>

              {/* User Menu Dropdown */}
              {showUserMenu && user && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-700">
                    <p className="text-sm font-medium text-white">{user.name}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                  
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center space-x-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>

            <button 
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 hover:bg-gray-800 rounded-full transition-colors flex items-center justify-center"
            >
              <Menu className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-gray-700 bg-gray-900/95 backdrop-blur-sm">
            <div className="px-4 py-4 space-y-4">
              <Link 
                to="/user-upload" 
                onClick={() => setShowMobileMenu(false)}
                className="block text-gray-300 hover:text-red-400 transition-colors font-medium py-2"
              >
                Gửi Video Cho Chúng Tôi
              </Link>

              {user && (
                <>
                  <Link 
                    to="/favorites" 
                    onClick={() => setShowMobileMenu(false)}
                    className="block text-gray-300 hover:text-red-400 transition-colors font-medium py-2"
                  >
                    Phim yêu thích
                  </Link>
                  
                  <Link 
                    to="/watch-history" 
                    onClick={() => setShowMobileMenu(false)}
                    className="block text-gray-300 hover:text-red-400 transition-colors font-medium py-2"
                  >
                    Lịch sử xem
                  </Link>
                </>
              )}

              {/* Mobile User Menu */}
              {user ? (
                <div className="pt-4 border-t border-gray-700 space-y-2">
                  <div className="px-2 py-2">
                    <p className="text-sm font-medium text-white">{user.name}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                  
                  <button
                    onClick={() => {
                      handleLogout();
                      setShowMobileMenu(false);
                    }}
                    className="flex items-center space-x-2 text-gray-300 hover:text-red-400 transition-colors py-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              ) : (
                <div className="pt-4 border-t border-gray-700">
                  <button
                    onClick={() => {
                      openAuthModal();
                      setShowMobileMenu(false);
                    }}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    Đăng nhập
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;