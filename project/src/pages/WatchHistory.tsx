import { useState, useEffect, useCallback } from 'react';
import { Clock, PlayCircle, Calendar, Eye, Trash2, ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface Movie {
  id: number;
  title: string;
  slug: string;
  description?: string;
  posterUrl?: string;
  backgroundUrl?: string;
  releaseYear?: number;
  country: string;
  status: string;
  type: string;
  views?: number;
  duration?: string;
  createdAt: string;
  updatedAt: string;
  categories: {
    movie: Movie;
    category: {
      id: number;
      name: string;
      slug: string;
    };
  }[];
  genres: {
    movie: Movie;
    genre: {
      id: number;
      name: string;
      slug: string;
    };
  }[];
  actors: {
    movie: Movie;
    actor: {
      id: number;
      name: string;
      avatar?: string;
      slug: string;
    };
  }[];
  episodes: {
    id: number;
    title: string;
    videoUrl: string;
    createdAt: string;
  }[];
}

interface WatchHistoryItem {
  id: number;
  progress: number;
  createdAt: string;
  updatedAt: string;
  movie: Movie;
  episode?: {
    id: number;
    title: string;
    videoUrl: string;
    createdAt: string;
  };
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalHistory: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  limit: number;
}

const WatchHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalHistory: 0,
    hasNextPage: false,
    hasPrevPage: false,
    limit: 12
  });
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  }>({
    show: false,
    message: '',
    type: 'success'
  });

  const fetchWatchHistory = useCallback(async (page = 1) => {
    if (!user) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      console.log('Fetching watch history for user:', user.id, 'page:', page);
      
      const response = await fetch(`http://localhost:3000/api/watch-history?page=${page}&limit=12`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Watch history response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Watch history data:', data);
        console.log('Watch history array:', data.watchHistory);
        console.log('Watch history length:', data.watchHistory?.length || 0);
        console.log('Pagination:', data.pagination);
        
        // Log chi tiết từng bản ghi
        if (data.watchHistory && data.watchHistory.length > 0) {
          data.watchHistory.forEach((item: WatchHistoryItem, index: number) => {
            console.log(`Record ${index + 1}:`, {
              id: item.id,
              progress: item.progress,
              movieId: item.movie.id,
              movieTitle: item.movie?.title,
              updatedAt: item.updatedAt,
              createdAt: item.createdAt
            });
          });
        } else {
          console.log('No watch history records found');
        }
        setWatchHistory(data.watchHistory);
        setPagination(data.pagination);
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch watch history:', response.status, errorData);
        setWatchHistory([]);
      }
    } catch (error) {
      console.error('Error fetching watch history:', error);
      setWatchHistory([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const deleteWatchHistory = async (movieId: number) => {
    if (!user) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/watch-history/${movieId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showToast('Đã xóa khỏi lịch sử xem', 'success');
        // Refresh current page
        await fetchWatchHistory(pagination.currentPage);
      } else {
        const errorData = await response.json();
        showToast(errorData.message || 'Không thể xóa lịch sử xem', 'error');
      }
    } catch (error) {
      console.error('Error deleting watch history:', error);
      showToast('Có lỗi xảy ra', 'error');
    }
  };

  const incrementViewAndNavigate = async (movieId: number, slug: string, progressSeconds?: number) => {
    try {
      // Tăng view count
      const response = await fetch(`http://localhost:3000/api/movies/${movieId}/view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log('View count incremented successfully');
      } else {
        console.error('Failed to increment view count');
      }
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }

    // Navigate to movie detail page
    const url = progressSeconds ? `/movie/${slug}?t=${progressSeconds}` : `/movie/${slug}`;
    navigate(url);
  };

  const formatProgress = (progress: number) => {
    const minutes = Math.floor(progress / 60);
    const seconds = progress % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const parseDurationToSeconds = (duration?: string) => {
    if (!duration) return null;
    
    // Parse duration string like "1h 30m" or "90m" or "5400s"
    const match = duration.match(/(\d+)h?\s*(\d+)?m?/);
    if (match) {
      const hours = parseInt(match[1]) || 0;
      const minutes = parseInt(match[2]) || 0;
      return hours * 3600 + minutes * 60;
    }
    
    // Try to parse as seconds
    const seconds = parseInt(duration);
    if (!isNaN(seconds)) return seconds;
    
    return null;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} tuần trước`;
    return date.toLocaleDateString('vi-VN');
  };

  const getProgressPercentage = (progress: number, movieDuration?: number) => {
    // Nếu có thời lượng phim, tính phần trăm thực tế
    if (movieDuration && movieDuration > 0) {
      return Math.min(100, (progress / movieDuration) * 100);
    }
    
    // Fallback: Ước tính dựa trên thời gian xem
    // Giả sử phim trung bình dài 90 phút (5400 giây)
    const estimatedDuration = 5400; // 90 phút
    return Math.min(100, (progress / estimatedDuration) * 100);
  };

  const handlePageChange = (page: number) => {
    fetchWatchHistory(page);
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  useEffect(() => {
    if (user) {
      fetchWatchHistory();
    }
  }, [user, fetchWatchHistory]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={64} className="text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Vui lòng đăng nhập</h2>
          <p className="text-gray-400">Bạn cần đăng nhập để xem lịch sử xem</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <Loader2 className="animate-spin text-blue-500" size={24} />
          <span className="text-white text-lg">Đang tải lịch sử xem...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center">
                <Clock className="text-blue-500 mr-3" size={32} />
                Lịch Sử Xem
              </h1>
              <p className="text-gray-400 mt-2">
                {pagination.totalHistory} phim đã xem
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {watchHistory.length === 0 ? (
          <div className="text-center py-16">
            <Clock size={64} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Chưa có lịch sử xem</h3>
            <p className="text-gray-400 mb-6">Hãy xem phim để tạo lịch sử xem</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Khám phá phim
            </button>
          </div>
        ) : (
          <>
            {/* Watch History List */}
            <div className="space-y-4">
              {watchHistory.map((item) => (
                <div key={item.id} className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors">
                  <div className="flex items-start space-x-4">
                    {/* Movie Poster */}
                    <div className="flex-shrink-0">
                      <div className="w-20 h-28 bg-gray-700 rounded-lg overflow-hidden">
                        {item.movie.posterUrl ? (
                          <img
                            src={item.movie.posterUrl}
                            alt={item.movie.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x450?text=No+Image';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <PlayCircle size={24} className="text-gray-500" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Movie Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white hover:text-blue-400 transition-colors cursor-pointer"
                              onClick={() => incrementViewAndNavigate(item.movie.id, item.movie.slug)}>
                            {item.movie.title}
                          </h3>

                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
                            <span className="flex items-center">
                              <Calendar size={14} className="mr-1" />
                              {formatDate(item.updatedAt)}
                            </span>
                            <span className="flex items-center">
                              <Clock size={14} className="mr-1" />
                              Đã xem: {formatProgress(item.progress)}
                            </span>
                            <span className="flex items-center">
                              <Eye size={14} className="mr-1" />
                              {item.movie.views?.toLocaleString() || '0'} lượt xem
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                              <span>Tiến độ xem</span>
                              <span>{formatProgress(item.progress)}</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${getProgressPercentage(item.progress, parseDurationToSeconds(item.movie.duration) || undefined)}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {item.progress > 0 ? (
                                (() => {
                                  const movieDuration = parseDurationToSeconds(item.movie.duration);
                                  const percentage = getProgressPercentage(item.progress, movieDuration || undefined);
                                  return `Đã xem ${Math.round(item.progress / 60)} phút (${Math.round(percentage)}%)`;
                                })()
                              ) : 'Chưa xem'}
                            </div>
                          </div>

                          {/* Categories */}
                          <div className="flex flex-wrap gap-1 mt-3">
                            {item.movie.categories?.slice(0, 3).map((categoryItem, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 text-xs bg-purple-600 text-purple-200 rounded"
                              >
                                {categoryItem.category?.name}
                              </span>
                            ))}
                            {item.movie.categories?.length > 3 && (
                              <span className="px-2 py-1 text-xs bg-gray-600 text-gray-300 rounded">
                                +{item.movie.categories.length - 3}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => {
                              // Chuyển đến trang detail với thời gian đã xem và tăng view count
                              const progressSeconds = item.progress;
                              incrementViewAndNavigate(item.movie.id, item.movie.slug, progressSeconds);
                            }}
                            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            title="Tiếp tục xem"
                          >
                            <PlayCircle size={16} />
                          </button>
                          <button
                            onClick={() => deleteWatchHistory(item.movie.id)}
                            className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            title="Xóa khỏi lịch sử"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 mt-8">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} className="mr-1" />
                  Trước
                </button>

                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg ${
                        page === pagination.currentPage
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sau
                  <ChevronRight size={16} className="ml-1" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
          <div className={`flex items-center space-x-3 px-4 py-3 rounded-lg shadow-lg ${
            toast.type === 'success' 
              ? 'bg-green-600 text-white' 
              : 'bg-red-600 text-white'
          }`}>
            <Clock size={20} />
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WatchHistory;
