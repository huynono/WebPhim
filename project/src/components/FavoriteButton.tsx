import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface FavoriteButtonProps {
  movieId: number;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  onToggle?: (isFavorite: boolean) => void;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({ 
  movieId, 
  size = 'md', 
  showText = false,
  onToggle 
}) => {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const sizeClasses = {
    sm: 'p-1',
    md: 'p-2',
    lg: 'p-3'
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24
  };

  // Kiểm tra trạng thái favorite khi component mount
  useEffect(() => {
    if (user && movieId) {
      checkFavoriteStatus();
    } else {
      setChecking(false);
    }
  }, [user, movieId]);

  const checkFavoriteStatus = async () => {
    if (!user) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/favorites/check/${movieId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setIsFavorite(data.isFavorite);
      }
    } catch (error) {
      console.error('Error checking favorite status:', error);
    } finally {
      setChecking(false);
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      // Redirect to login or show login modal
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const method = isFavorite ? 'DELETE' : 'POST';
      
      const response = await fetch(`http://localhost:3000/api/favorites/${movieId}`, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const newFavoriteStatus = !isFavorite;
        setIsFavorite(newFavoriteStatus);
        onToggle?.(newFavoriteStatus);
      } else {
        const errorData = await response.json();
        console.error('Error toggling favorite:', errorData.message);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <button
        onClick={() => {
          // Có thể mở login modal hoặc redirect
          window.location.href = '/login';
        }}
        className={`${sizeClasses[size]} bg-gray-700 text-gray-400 rounded-lg hover:bg-gray-600 hover:text-white transition-colors flex items-center space-x-2`}
        title="Đăng nhập để thêm vào yêu thích"
      >
        <Heart size={iconSizes[size]} />
        {showText && <span className="text-sm">Yêu thích</span>}
      </button>
    );
  }

  if (checking) {
    return (
      <div className={`${sizeClasses[size]} bg-gray-700 text-gray-400 rounded-lg flex items-center space-x-2`}>
        <Heart size={iconSizes[size]} />
        {showText && <span className="text-sm">...</span>}
      </div>
    );
  }

  return (
    <button
      onClick={toggleFavorite}
      disabled={loading}
      className={`${sizeClasses[size]} ${
        isFavorite 
          ? 'bg-red-600 text-white hover:bg-red-700' 
          : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
      } rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed`}
      title={isFavorite ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
    >
      <Heart 
        size={iconSizes[size]} 
        className={isFavorite ? 'fill-current' : ''}
      />
      {showText && (
        <span className="text-sm">
          {isFavorite ? 'Đã yêu thích' : 'Yêu thích'}
        </span>
      )}
    </button>
  );
};

export default FavoriteButton;
