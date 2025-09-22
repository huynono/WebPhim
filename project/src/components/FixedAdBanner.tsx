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

const FixedAdBanner = () => {
  const [banner, setBanner] = useState<HomeBanner | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBanner();
  }, []);

  const fetchBanner = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/home-banners/type/FIXED');
      const banners = await response.json();
      
      // Lấy banner đầu tiên đang active
      const activeBanner = banners.find((b: HomeBanner) => b.isActive);
      
      if (activeBanner) {
        setBanner(activeBanner);
      }
    } catch (error) {
      console.error('Error fetching FIXED banner:', error);
    } finally {
      setLoading(false);
    }
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

  if (loading || !banner) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-full max-w-6xl mx-4 md:mx-0" style={{ transform: 'translateX(calc(-50% - 20px))' }}>
      <div 
        className="relative bg-gradient-to-r from-orange-500 to-red-500 border-2 border-yellow-400 shadow-2xl rounded-lg overflow-hidden cursor-pointer"
        style={{ height: '100px' }}
        onClick={handleClick}
      >
        {/* Video Background */}
        <video
          src={banner.videoUrl}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover rounded-lg"
          style={{ height: '100px' }}
        />
        
        {/* Container giữ nguyên kích thước như cũ */}
        <div className="relative flex items-center justify-between px-4 md:px-8 py-4 z-10 h-full">
          {/* Empty space để giữ layout */}
        </div>
      </div>
    </div>
  );
};

export default FixedAdBanner;
