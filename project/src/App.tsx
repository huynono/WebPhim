import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import Detail from "./pages/MovieDetail";
import UserUpload from "./pages/UserUpload";
import Favorites from "./pages/Favorites";
import WatchHistory from "./pages/WatchHistory";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import AuthModal from "./components/AuthModal";
import TokenExpiredModal from "./components/TokenExpiredModal";
import { useState, useEffect } from "react";
import { isTokenExpired, getToken } from "./utils/auth";

// Component để sử dụng Auth context
const AppContent = () => {
  const { isAuthModalOpen, closeAuthModal, openAuthModal } = useAuth();
  const [showTokenExpiredModal, setShowTokenExpiredModal] = useState(false);
  
  // Check for expired token periodically
  useEffect(() => {
    const checkTokenExpiry = () => {
      const token = getToken();
      if (token && isTokenExpired(token)) {
        console.log('Token expired, clearing data');
        // Clear expired data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Không mở login modal, chỉ clear data
      }
    };
    
    // Check immediately
    checkTokenExpiry();
    
    // Check every 1 minute (since token expires in 15 minutes)
    const interval = setInterval(checkTokenExpiry, 60 * 1000);
    
    return () => clearInterval(interval);
  }, [openAuthModal]);
  
  const handleTokenExpiredLogin = () => {
    setShowTokenExpiredModal(false);
    openAuthModal();
  };
  
  return (
    <>
      <div className="min-h-screen bg-black">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/movie/:slug" element={<Detail />} />
          <Route path="/user-upload" element={<UserUpload />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/watch-history" element={<WatchHistory />} />
        </Routes>
      </div>
      
      {/* Auth Modal - render ở cấp cao nhất */}
      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
      
      {/* Token Expired Modal */}
      <TokenExpiredModal 
        isOpen={showTokenExpiredModal} 
        onClose={() => setShowTokenExpiredModal(false)}
        onLogin={handleTokenExpiredLogin}
      />
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
