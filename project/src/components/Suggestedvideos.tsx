import { useEffect, useState } from "react";
import { ThumbsUp, Play, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Movie {
  id: number;
  title: string;
  posterUrl: string;
  releaseYear: number;
  rating?: string;
  slug: string;
  views?: number;
  isHidden?: boolean;
}

interface SuggestedVideosProps {
  currentMovieId?: number;
  currentMovieCategories?: { category: { name: string; slug: string } }[];
}

const SuggestedVideos = ({ currentMovieId, currentMovieCategories }: SuggestedVideosProps) => {
  const [suggestedMovies, setSuggestedMovies] = useState<Movie[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalMovies: 0,
    hasNextPage: false,
    hasPrevPage: false,
    limit: 24
  });
  const navigate = useNavigate();

  const fetchData = async (page = currentPage) => {
    try {
      // Tạo URL với filter theo category nếu có
      let url = `http://localhost:3000/api/movies?page=${page}&hideFromPublic=true&limit=24&sortBy=views`;
      
      // Nếu có category của phim hiện tại, thêm filter (chỉ cần 1 danh mục chung)
      if (currentMovieCategories && currentMovieCategories.length > 0) {
        const firstCategorySlug = currentMovieCategories[0].category.slug;
        url += `&category=${encodeURIComponent(firstCategorySlug)}`;
      }
      
      const moviesRes = await fetch(url);
      const moviesResponse = await moviesRes.json();

      // Xử lý response mới có pagination
      const moviesData = moviesResponse.movies || moviesResponse;
      let movies: Movie[] = (moviesData as Movie[]).map((m) => ({
        id: m.id,
        title: m.title,
        posterUrl: m.posterUrl,
        releaseYear: m.releaseYear,
        rating: m.rating ?? "N/A",
        slug: m.slug,
        views: m.views ?? 0,
        isHidden: m.isHidden ?? false,
      }));

      // Loại trừ phim hiện tại khỏi danh sách suggest
      if (currentMovieId) {
        movies = movies.filter(movie => movie.id !== currentMovieId);
      }

      setSuggestedMovies(movies);

      // Lưu thông tin pagination
      if (moviesResponse.pagination) {
        setPagination(moviesResponse.pagination);
      }
    } catch (err) {
      console.error("Không thể lấy dữ liệu gợi ý", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentPage, currentMovieId, currentMovieCategories]);

  // Khi click vào phim: tăng view + navigate
  const handleClick = async (slug: string, movieId: number) => {
    try {
      // Tăng view cho phim
      await fetch(`http://localhost:3000/api/movies/${movieId}/view`, { method: 'POST' });
      
      // Cập nhật view trong state để hiển thị ngay
      setSuggestedMovies(prev =>
        prev.map(m => m.id === movieId ? { ...m, views: (m.views || 0) + 1 } : m)
      );
      
      // Chuyển sang trang detail
      navigate(`/movie/${slug}`);
    } catch (err) {
      console.error('Lỗi tăng view:', err);
      // Vẫn navigate dù có lỗi
      navigate(`/movie/${slug}`);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <section className="py-12 bg-gradient-to-b from-gray-900 to-black">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-8">
          <ThumbsUp className="h-6 w-6 text-blue-500" />
          <h2 className="text-3xl font-bold text-white">
            Video gợi ý cho bạn
          </h2>
        </div>

        {/* Grid movies */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
          {suggestedMovies.map((movie) => (
            <div
              key={movie.id}
              className="group cursor-pointer flex flex-col"
              onClick={() => handleClick(movie.slug, movie.id)}
            >
              {/* Poster */}
              <div className="relative overflow-hidden rounded-lg aspect-[2/3] shadow-lg hover:scale-105 transition-transform duration-200">
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-end justify-center transition-opacity duration-200">
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-b-lg font-medium flex items-center justify-center space-x-2">
                    <Play className="h-4 w-4 fill-current" />
                    <span>Xem</span>
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="mt-2 flex flex-col justify-between flex-1">
                <h3 className="text-white font-semibold text-sm line-clamp-2 group-hover:text-blue-400 transition-colors">
                  {movie.title}
                </h3>

                <div className="flex items-center justify-between text-gray-400 text-xs mt-1">
                  <span>{movie.releaseYear}</span>
                  <div className="flex items-center space-x-1">
                    <Star className="h-3 w-3 text-yellow-400 fill-current" />
                    <span>{movie.rating}</span>
                  </div>
                </div>

                <div className="text-gray-400 text-xs mt-1">
                  Lượt xem: {(movie.views ?? 0).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center space-x-2 mt-8">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!pagination.hasPrevPage}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-600 rounded-lg hover:bg-gray-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} className="mr-1" />
              Trước
            </button>

            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const page = Math.max(1, Math.min(pagination.totalPages - 4, currentPage - 2)) + i;
                if (page > pagination.totalPages) return null;
                
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      page === currentPage
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 bg-gray-800 border border-gray-600 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!pagination.hasNextPage}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-600 rounded-lg hover:bg-gray-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Sau
              <ChevronRight size={16} className="ml-1" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default SuggestedVideos;
