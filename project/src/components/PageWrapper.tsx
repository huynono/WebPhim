import { useState, useEffect } from 'react';

interface PageWrapperProps {
  children: React.ReactNode;
}

const PageWrapper = ({ children }: PageWrapperProps) => {
  const [showContent, setShowContent] = useState(false);
  const [hasBanner, setHasBanner] = useState(false);

  useEffect(() => {
    // Kiểm tra xem có banner POPUP active không
    const checkBanner = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/home-banners/type/POPUP');
        const banners = await response.json();
        const activeBanner = banners.find((b: any) => b.isActive);
        
        if (activeBanner) {
          setHasBanner(true);
          // Nếu có banner, ẩn content ban đầu
          setShowContent(false);
        } else {
          // Nếu không có banner, hiển thị content ngay
          setShowContent(true);
        }
      } catch (error) {
        console.error('Error checking banner:', error);
        // Nếu lỗi, hiển thị content
        setShowContent(true);
      }
    };

    checkBanner();
  }, []);

  // Lắng nghe sự kiện từ AdBanner khi đóng banner
  useEffect(() => {
    const handleBannerClosed = () => {
      setShowContent(true);
    };

    window.addEventListener('bannerClosed', handleBannerClosed);
    
    return () => {
      window.removeEventListener('bannerClosed', handleBannerClosed);
    };
  }, []);

  return (
    <div 
      className={`transition-opacity duration-500 ${
        showContent ? 'opacity-100' : 'opacity-30'
      }`}
      style={{
        filter: showContent ? 'none' : 'blur(2px)',
        pointerEvents: showContent ? 'auto' : 'none'
      }}
    >
      {children}
    </div>
  );
};

export default PageWrapper;
