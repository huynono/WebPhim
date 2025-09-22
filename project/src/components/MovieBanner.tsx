import React, { useState, useEffect } from 'react';

interface MovieBanner {
  id: number;
  videoUrl: string;
  linkUrl: string;
  type: 'POPUP' | 'FIXED' | 'MIDDLE' | 'MOVIE_BANNER_1' | 'MOVIE_BANNER_2' | 'MOVIE_BANNER_3' | 'MOVIE_BANNER_4';
  isActive: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

interface MovieBannerProps {
  type: 'MOVIE_BANNER_1' | 'MOVIE_BANNER_2' | 'MOVIE_BANNER_3' | 'MOVIE_BANNER_4';
  className?: string;
  onClick?: () => void;
}

const MovieBanner: React.FC<MovieBannerProps> = ({ type, className = '', onClick }) => {
  const [banner, setBanner] = useState<MovieBanner | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBanner = async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/home-banners/type/${type}`);
        if (response.ok) {
          const banners = await response.json();
          // Lấy banner đầu tiên (active)
          const activeBanner = banners.find((b: MovieBanner) => b.isActive);
          setBanner(activeBanner || null);
        }
      } catch (error) {
        console.error('Error fetching banner:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBanner();
  }, [type]);

  const handleBannerClick = async () => {
    if (banner) {
      // Tăng view count
      try {
        await fetch(`http://localhost:3000/api/home-banners/${banner.id}/view`, {
          method: 'POST'
        });
      } catch (error) {
        console.error('Error incrementing banner view:', error);
      }

      // Mở link nếu có
      if (banner.linkUrl) {
        window.open(banner.linkUrl, '_blank');
      }

      // Gọi onClick callback nếu có
      if (onClick) {
        onClick();
      }
    }
  };

  if (isLoading) {
    return (
      <div className={`${className} bg-gray-800 rounded-xl animate-pulse flex items-center justify-center`}>
        <div className="text-gray-400">Đang tải banner...</div>
      </div>
    );
  }

  if (!banner) {
    return null; // Không hiển thị gì nếu không có banner
  }

  return (
    <div 
      className={`${className} cursor-pointer group transition-transform duration-200 hover:scale-105`}
      onClick={handleBannerClick}
    >
      <video
        src={banner.videoUrl}
        className="w-full h-full object-cover rounded-xl"
        autoPlay
        loop
        muted
        playsInline
        onError={(e) => {
          // Fallback to image if video fails
          const videoElement = e.target as HTMLVideoElement;
          const img = document.createElement('img');
          img.src = banner.videoUrl;
          img.className = 'w-full h-full object-cover rounded-xl';
          img.alt = 'Banner quảng cáo';
          videoElement.parentNode?.replaceChild(img, videoElement);
        }}
      />
    </div>
  );
};

export default MovieBanner;
