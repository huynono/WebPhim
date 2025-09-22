import { useState, useEffect, useCallback } from 'react';
import { Heart, PlayCircle, Eye, ChevronLeft, ChevronRight, Loader2, AlertCircle, Star, Search, Trash2, Grid, List } from 'lucide-react';
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
  likes?: number;
  rating?: string;
  averageRating?: number;
  totalRatings?: number;
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

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalFavorites: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  limit: number;
}

const Favorites = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [filteredMovies, setFilteredMovies] = useState<Movie[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedMovies, setSelectedMovies] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalFavorites: 0,
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

  const fetchFavorites = useCallback(async (page = 1) => {
    if (!user) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/favorites?page=${page}&limit=12`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMovies(data.favorites);
        setFilteredMovies(data.favorites);
        setPagination(data.pagination);
      } else {
        console.error('Failed to fetch favorites');
        setMovies([]);
        setFilteredMovies([]);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
      setMovies([]);
      setFilteredMovies([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user, fetchFavorites]);

  // Filter movies based on search query
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = movies.filter(movie =>
        movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        movie.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        movie.categories.some(cat => 
          cat.category.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
      setFilteredMovies(filtered);
    } else {
      setFilteredMovies(movies);
    }
  }, [searchQuery, movies]);

  const removeFromFavorites = async (movieId: number) => {
    if (!user) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/favorites/${movieId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showToast('Đã xóa khỏi danh sách yêu thích', 'success');
        await fetchFavorites(pagination.currentPage);
      } else {
        const errorData = await response.json();
        showToast(errorData.message || 'Không thể xóa khỏi yêu thích', 'error');
      }
    } catch (error) {
      console.error('Error removing from favorites:', error);
      showToast('Có lỗi xảy ra', 'error');
    }
  };

  const removeSelectedMovies = async () => {
    if (selectedMovies.size === 0) return;

    try {
      const token = localStorage.getItem('token');
      const promises = Array.from(selectedMovies).map(movieId =>
        fetch(`http://localhost:3000/api/favorites/${movieId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      );

      await Promise.all(promises);
      setSelectedMovies(new Set());
      showToast(`Đã xóa ${selectedMovies.size} phim khỏi danh sách yêu thích`, 'success');
      await fetchFavorites(pagination.currentPage);
    } catch (error) {
      console.error('Error removing selected movies:', error);
      showToast('Có lỗi xảy ra khi xóa phim', 'error');
    }
  };

  const incrementViewAndNavigate = async (movieId: number, slug: string) => {
    try {
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

    navigate(`/movie/${slug}`);
  };

  const handlePageChange = (page: number) => {
    fetchFavorites(page);
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const toggleMovieSelection = (movieId: number) => {
    const newSelection = new Set(selectedMovies);
    if (newSelection.has(movieId)) {
      newSelection.delete(movieId);
    } else {
      newSelection.add(movieId);
    }
    setSelectedMovies(newSelection);
  };

  const selectAllMovies = () => {
    if (selectedMovies.size === filteredMovies.length) {
      setSelectedMovies(new Set());
    } else {
      setSelectedMovies(new Set(filteredMovies.map(movie => movie.id)));
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23a855f7' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>
        <div className="text-center relative z-10">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-lg animate-pulse"></div>
            <div className="relative p-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full">
              <AlertCircle size={48} className="text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent mb-4">
            Vui lòng đăng nhập
          </h2>
          <p className="text-gray-400 text-lg">Bạn cần đăng nhập để xem danh sách yêu thích</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 flex items-center justify-center">
        <div className="flex items-center space-x-4 text-white">
          <Loader2 className="animate-spin text-purple-400" size={32} />
          <span className="text-xl font-medium">Đang tải danh sách yêu thích...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23a855f7' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>

      {/* Header */}
      <div className="relative z-10 border-b border-white/10 backdrop-blur-lg bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-600 rounded-full blur-lg animate-pulse"></div>
                <div className="relative p-3 bg-gradient-to-r from-red-500 to-pink-600 rounded-full shadow-2xl">
                  <Heart className="text-white fill-current" size={28} />
                </div>
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white via-red-200 to-pink-200 bg-clip-text text-transparent">
                  Phim Yêu Thích
                </h1>
                <p className="text-gray-300 mt-1">
                  {pagination.totalFavorites} phim trong danh sách yêu thích
                </p>
              </div>
            </div>

            {/* Search and Controls */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 w-64"
                />
              </div>
              
              <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'grid' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Grid size={18} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'list' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <List size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedMovies.size > 0 && (
            <div className="mt-6 flex items-center justify-between bg-red-500/10 backdrop-blur-sm border border-red-500/20 rounded-xl p-4">
              <span className="text-white font-medium">
                Đã chọn {selectedMovies.size} phim
              </span>
              <div className="flex items-center space-x-3">
                <button
                  onClick={selectAllMovies}
                  className="text-purple-400 hover:text-purple-300 font-medium"
                >
                  {selectedMovies.size === filteredMovies.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </button>
                <button
                  onClick={removeSelectedMovies}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                  <span>Xóa đã chọn</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {filteredMovies.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-8xl mb-6">💔</div>
            <h3 className="text-2xl font-bold text-white mb-4">
              {searchQuery ? 'Không tìm thấy phim' : 'Chưa có phim yêu thích'}
            </h3>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              {searchQuery 
                ? 'Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc'
                : 'Hãy thêm phim vào danh sách yêu thích để xem lại sau'
              }
            </p>
            {!searchQuery && (
              <button
                onClick={() => navigate('/')}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:scale-105 transition-transform duration-300 shadow-lg"
              >
                Khám phá phim ngay
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Movies Display */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {filteredMovies.map((movie) => (
                  <div key={movie.id} className="group relative">
                    {/* Selection Checkbox */}
                    <div className="absolute top-2 left-2 z-10">
                      <input
                        type="checkbox"
                        checked={selectedMovies.has(movie.id)}
                        onChange={() => toggleMovieSelection(movie.id)}
                        className="w-4 h-4 text-purple-600 bg-white/20 backdrop-blur-sm border-white/30 rounded focus:ring-purple-500 focus:ring-2"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    <div 
                      className="aspect-[2/3] bg-gradient-to-br from-gray-800 to-gray-700 rounded-2xl overflow-hidden shadow-2xl cursor-pointer transform hover:scale-105 transition-all duration-500 hover:shadow-purple-500/25"
                      onClick={() => incrementViewAndNavigate(movie.id, movie.slug)}
                    >
                      {movie.posterUrl ? (
                        <img
                          src={movie.posterUrl}
                          alt={movie.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x450?text=No+Image';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <PlayCircle size={48} className="text-gray-500" />
                        </div>
                      )}
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 transform scale-75 group-hover:scale-100 transition-all duration-300">
                            <PlayCircle size={24} className="text-white" />
                          </div>
                        </div>
                        <div className="absolute bottom-4 left-4 right-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromFavorites(movie.id);
                            }}
                            className="w-full bg-red-500/80 backdrop-blur-sm hover:bg-red-600 text-white py-2 rounded-lg transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                          >
                            <Heart size={16} className="fill-current" />
                            <span>Xóa khỏi yêu thích</span>
                          </button>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium backdrop-blur-sm ${
                          movie.status === 'completed' 
                            ? 'bg-green-500/80 text-white' 
                            : 'bg-yellow-500/80 text-black'
                        }`}>
                          {movie.status === 'completed' ? 'Hoàn thành' : 'Đang cập nhật'}
                        </span>
                      </div>

                      {/* Rating Badge */}
                      {movie.averageRating && movie.averageRating > 0 && (
                        <div className="absolute bottom-2 right-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-black px-2 py-1 rounded-full text-xs font-bold flex items-center space-x-1">
                          <Star className="h-3 w-3 fill-current" />
                          <span>{movie.averageRating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>

                    {/* Movie Info */}
                    <div className="mt-4">
                      <h3 
                        className="text-white font-semibold text-sm line-clamp-2 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-pink-400 group-hover:bg-clip-text transition-all duration-300 cursor-pointer"
                        onClick={() => incrementViewAndNavigate(movie.id, movie.slug)}
                      >
                        {movie.title}
                      </h3>
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-xs bg-white/10 px-2 py-1 rounded-full">
                            {movie.releaseYear || 'N/A'}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-1 text-red-400">
                            <Heart className="h-3 w-3 fill-current" />
                            <span>{(movie.likes || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-blue-400">
                            <Eye size={12} />
                            <span>{(movie.views || 0).toLocaleString()}</span>
                          </div>
                        </div>
                        
                        {/* Categories */}
                        <div className="flex flex-wrap gap-1">
                          {movie.categories?.slice(0, 2).map((categoryItem, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 text-xs bg-purple-500/20 text-purple-300 rounded-full"
                            >
                              {categoryItem.category?.name}
                            </span>
                          ))}
                          {movie.categories?.length > 2 && (
                            <span className="px-2 py-1 text-xs bg-gray-600/20 text-gray-400 rounded-full">
                              +{movie.categories.length - 2}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // List View
              <div className="space-y-4">
                {filteredMovies.map((movie) => (
                  <div key={movie.id} className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
                    <div className="flex items-center space-x-6">
                      {/* Selection Checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedMovies.has(movie.id)}
                        onChange={() => toggleMovieSelection(movie.id)}
                        className="w-4 h-4 text-purple-600 bg-white/20 backdrop-blur-sm border-white/30 rounded focus:ring-purple-500 focus:ring-2"
                      />

                      {/* Poster */}
                      <div 
                        className="w-20 h-28 bg-gray-800 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer hover:scale-105 transition-transform duration-300"
                        onClick={() => incrementViewAndNavigate(movie.id, movie.slug)}
                      >
                        {movie.posterUrl ? (
                          <img
                            src={movie.posterUrl}
                            alt={movie.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80x112?text=No+Image';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <PlayCircle size={24} className="text-gray-500" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 
                              className="text-xl font-bold text-white mb-2 cursor-pointer hover:text-transparent hover:bg-gradient-to-r hover:from-purple-400 hover:to-pink-400 hover:bg-clip-text transition-all duration-300"
                              onClick={() => incrementViewAndNavigate(movie.id, movie.slug)}
                            >
                              {movie.title}
                            </h3>
                            {movie.description && (
                              <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                                {movie.description}
                              </p>
                            )}
                            <div className="flex items-center space-x-4 text-sm">
                              <span className="text-gray-400">{movie.releaseYear || 'N/A'}</span>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                movie.status === 'completed' 
                                  ? 'bg-green-500/20 text-green-400' 
                                  : 'bg-yellow-500/20 text-yellow-400'
                              }`}>
                                {movie.status === 'completed' ? 'Hoàn thành' : 'Đang cập nhật'}
                              </span>
                              {movie.averageRating && movie.averageRating > 0 && (
                                <div className="flex items-center space-x-1 text-yellow-400">
                                  <Star className="h-4 w-4 fill-current" />
                                  <span>{movie.averageRating.toFixed(1)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-4 text-sm text-gray-400">
                              <div className="flex items-center space-x-1">
                                <Heart className="h-4 w-4 text-red-400 fill-current" />
                                <span>{(movie.likes || 0).toLocaleString()}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Eye size={16} />
                                <span>{(movie.views || 0).toLocaleString()}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => incrementViewAndNavigate(movie.id, movie.slug)}
                              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                            >
                              <PlayCircle size={16} />
                              <span>Xem</span>
                            </button>
                            <button
                              onClick={() => removeFromFavorites(movie.id)}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <Heart size={18} className="fill-current" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 mt-12">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="flex items-center px-6 py-3 text-sm font-medium text-white bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl hover:bg-purple-600/50 hover:border-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105"
                >
                  <ChevronLeft size={16} className="mr-2" />
                  Trước
                </button>

                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 hover:scale-105 ${
                        page === pagination.currentPage
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                          : 'text-white bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-purple-600/50 hover:border-purple-500/50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="flex items-center px-6 py-3 text-sm font-medium text-white bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl hover:bg-purple-600/50 hover:border-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105"
                >
                  Sau
                  <ChevronRight size={16} className="ml-2" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-right duration-300">
          <div className={`flex items-center space-x-3 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-lg ${
            toast.type === 'success' 
              ? 'bg-green-500/90 text-white' 
              : 'bg-red-500/90 text-white'
          }`}>
            <Heart size={20} className={toast.type === 'success' ? 'fill-current' : ''} />
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Favorites;