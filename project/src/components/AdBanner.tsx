import { useState, useEffect } from 'react';

interface HomeBanner {
  id: number;
  videoUrl: string;
  linkUrl: string;
  type: 'POPUP' | 'FIXED' | 'MIDDLE';
  isActive: boolean;
  viewCount: number;
  createdAt: string;
}

const AdBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [banner, setBanner] = useState<HomeBanner | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBanner();
  }, []);

  const fetchBanner = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/home-banners/type/POPUP');
      const banners = await response.json();
      
      // Lấy banner đầu tiên đang active
      const activeBanner = banners.find((b: HomeBanner) => b.isActive);
      if (activeBanner) {
        setBanner(activeBanner);
        // Hiển thị banner ngay lập tức khi có banner
        setIsVisible(true);
      }
    } catch (error) {
      console.error('Error fetching POPUP banner:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Đóng banner ngay lập tức
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsClosing(false);
      
      // Dispatch event để thông báo đã đóng banner
      window.dispatchEvent(new CustomEvent('bannerClosed'));
    }, 300);
  };

  const handleClick = () => {
    if (banner?.linkUrl) {
      // Tăng view count trước khi mở link
      incrementViewCount();
      window.open(banner.linkUrl, '_blank');
    }
  };

  const incrementViewCount = async () => {
    try {
      await fetch(`http://localhost:3000/api/home-banners/${banner?.id}/view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  };

  if (!isVisible || loading || !banner) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
      onClick={handleClose}
      style={{
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)'
      }}
    >
      <div 
        className={`relative bg-gradient-to-br from-teal-400 to-cyan-500 rounded-2xl shadow-2xl border-4 border-cyan-300 transform transition-all duration-300 cursor-pointer overflow-hidden ${
          isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
        style={{
          width: '400px',
          height: '300px',
          boxShadow: '0 0 30px rgba(34, 211, 238, 0.5)'
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleClick();
        }}
      >
        {/* Video Background */}
        <video
          src={banner.videoUrl}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Close button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          className="absolute top-3 right-3 w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white font-bold transition-all duration-200 z-20 shadow-lg"
          title="Đóng banner"
        >
          ×
        </button>

        {/* Container giữ nguyên kích thước như cũ */}
        <div className="absolute inset-0 flex flex-col justify-center items-center z-10">
          {/* Chỉ để trống để giữ layout */}
        </div>
      </div>
    </div>
  );
};

export default AdBanner;
