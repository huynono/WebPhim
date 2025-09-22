import { useEffect, useState, useCallback, useRef } from "react";
import { Play, Star, ChevronLeft, ChevronRight, Heart, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Movie {
  id: number;
  title: string;
  posterUrl: string;
  releaseYear: number;
  rating?: string;
  slug: string;
  views?: number;
  likes?: number;
  isHidden?: boolean;
  averageRating?: number;
  totalRatings?: number;
  categories?: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}


const TrendingMovies = () => {
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedSortBy, setSelectedSortBy] = useState<string>('newest');
  const [minRating, setMinRating] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [movieSuggestions, setMovieSuggestions] = useState<Movie[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalMovies: 0,
    hasNextPage: false,
    hasPrevPage: false,
    limit: 24
  });
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Highlight search term in movie title
  const highlightSearchTerm = (title: string, searchTerm: string) => {
    if (!searchTerm) return title;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return title.replace(regex, '<mark class="bg-yellow-300 text-black px-1 rounded">$1</mark>');
  };

  // Load search history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('movieSearchHistory');
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Fetch movie suggestions from API
  const fetchMovieSuggestions = async (query: string) => {
    if (!query.trim() || query.trim().length < 1) {
      setMovieSuggestions([]);
      return;
    }

    try {
      const params = new URLSearchParams({
        search: query.trim(),
        limit: '20', // Tăng lên 20 để có nhiều phim hơn để lọc
        hideFromPublic: 'true',
        sortBy: 'newest'
      });

      const response = await fetch(`http://localhost:3000/api/movies?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        const movies = data.movies || data;
        console.log('API Response for query:', query, 'Movies:', movies);
        
        if (Array.isArray(movies)) {
          const queryLower = query.toLowerCase().trim();
          
          // Lọc phim theo tên và thể loại
          const filteredMovies = movies
            .filter(movie => {
              // Kiểm tra tên phim
              const titleMatch = movie.title.toLowerCase().includes(queryLower) ||
                                movie.title.toLowerCase().startsWith(queryLower);
              
              // Kiểm tra thể loại
              let categoryMatch = false;
              if (movie.categories && Array.isArray(movie.categories)) {
                categoryMatch = movie.categories.some((category: any) => 
                  category.name && category.name.toLowerCase().includes(queryLower)
                );
              }
              
              // Kiểm tra slug thể loại
              let categorySlugMatch = false;
              if (movie.categories && Array.isArray(movie.categories)) {
                categorySlugMatch = movie.categories.some((category: any) => 
                  category.slug && category.slug.toLowerCase().includes(queryLower)
                );
              }
              
              return titleMatch || categoryMatch || categorySlugMatch;
            })
            .sort((a, b) => {
              // Ưu tiên phim có tên bắt đầu bằng từ khóa
              const aTitleStartsWith = a.title.toLowerCase().startsWith(queryLower);
              const bTitleStartsWith = b.title.toLowerCase().startsWith(queryLower);
              
              if (aTitleStartsWith && !bTitleStartsWith) return -1;
              if (!aTitleStartsWith && bTitleStartsWith) return 1;
              
              // Sau đó ưu tiên phim có thể loại khớp
              const aCategoryMatch = a.categories && a.categories.some((cat: any) => 
                cat.name && cat.name.toLowerCase().includes(queryLower)
              );
              const bCategoryMatch = b.categories && b.categories.some((cat: any) => 
                cat.name && cat.name.toLowerCase().includes(queryLower)
              );
              
              if (aCategoryMatch && !bCategoryMatch) return -1;
              if (!aCategoryMatch && bCategoryMatch) return 1;
              
              // Cuối cùng sắp xếp theo độ dài tên
              return a.title.length - b.title.length;
            })
            .slice(0, 8); // Lấy 8 phim phù hợp nhất
          
          console.log('Filtered movies for query:', query, 'Count:', filteredMovies.length);
          setMovieSuggestions(filteredMovies);
        }
      } else {
        console.error('API Error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching movie suggestions:', error);
      setMovieSuggestions([]);
    }
  };

  // Debounced search function
  const debouncedGenerateSuggestions = useCallback((query: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      generateSuggestions(query);
      if (query.trim().length > 0) {
        fetchMovieSuggestions(query);
      }
    }, 300); // 300ms delay
  }, []);

  // Logic gợi ý tìm kiếm đơn giản
  const generateSuggestions = (query: string) => {
    if (!query.trim()) {
      // Show popular searches and history when empty
      const emptySuggestions: any[] = [];
      
      // Add recent searches
      if (searchHistory.length > 0) {
        emptySuggestions.push({
          type: 'header',
          label: 'Tìm kiếm gần đây',
          icon: '🕒'
        });
        searchHistory.slice(0, 3).forEach(term => {
          emptySuggestions.push({
            type: 'history',
            value: term,
            label: term,
            icon: '🕒'
          });
        });
      }
      
      
      setSuggestions(emptySuggestions);
      return;
    }

    const queryLower = query.toLowerCase().trim();
    const newSuggestions: any[] = [];

    // Thêm gợi ý phim thực tế nếu có
    if (movieSuggestions.length > 0) {
      newSuggestions.push({
        type: 'header',
        label: `Phim tìm thấy (${movieSuggestions.length})`,
        icon: '🎬'
      });
      
      movieSuggestions.forEach(movie => {
        // Highlight từ khóa trong tên phim
        const highlightedTitle = highlightSearchTerm(movie.title, queryLower);
        
        // Thêm thông tin thể loại vào label
        let categoryInfo = '';
        if (movie.categories && movie.categories.length > 0) {
          const matchingCategories = movie.categories.filter((cat: any) => 
            cat.name && cat.name.toLowerCase().includes(queryLower)
          );
          if (matchingCategories.length > 0) {
            categoryInfo = ` (${matchingCategories.map((cat: any) => cat.name).join(', ')})`;
          }
        }
        
        newSuggestions.push({
          type: 'movie',
          value: movie.slug,
          label: movie.title + categoryInfo,
          highlightedLabel: highlightedTitle + categoryInfo,
          icon: '🎬',
          movie: movie
        });
      });
    }
    
    // Thêm gợi ý thể loại nếu tìm thấy
    const cleanQuery = queryLower.replace(/^phim\s+/, '').trim();
    
    // Hàm tính độ tương đồng cho suggestions
    const calculateSimilarityForSuggestions = (str1: string, str2: string): number => {
      const longer = str1.length > str2.length ? str1 : str2;
      const shorter = str1.length > str2.length ? str2 : str1;
      if (longer.length === 0) return 1.0;
      let distance = 0;
      for (let i = 0; i < shorter.length; i++) {
        if (longer[i] !== shorter[i]) distance++;
      }
      return (longer.length - distance) / longer.length;
    };
    
    const matchingCategories = categories.filter(category => {
      const categoryName = category.name.toLowerCase();
      const categorySlug = category.slug.toLowerCase();
      
      // Kiểm tra tên thể loại
      if (categoryName.includes(cleanQuery) || cleanQuery.includes(categoryName)) {
        return true;
      }
      
      // Kiểm tra slug thể loại
      if (categorySlug.includes(cleanQuery) || cleanQuery.includes(categorySlug)) {
        return true;
      }
      
      // Kiểm tra với query gốc (bao gồm "phim")
      if (categoryName.includes(queryLower) || queryLower.includes(categoryName)) {
        return true;
      }
      
      if (categorySlug.includes(queryLower) || queryLower.includes(categorySlug)) {
        return true;
      }
      
      // Fuzzy search cho suggestions (ngưỡng thấp hơn)
      if (cleanQuery.length > 2) {
        const nameSimilarity = calculateSimilarityForSuggestions(cleanQuery, categoryName);
        const slugSimilarity = calculateSimilarityForSuggestions(cleanQuery, categorySlug);
        
        if (nameSimilarity > 0.6 || slugSimilarity > 0.6) {
          return true;
        }
      }
      
      return false;
    });
    
    if (matchingCategories.length > 0) {
      newSuggestions.push({
        type: 'header',
        label: 'Thể loại phù hợp:',
        icon: '🎭'
      });
      
      matchingCategories.forEach(category => {
        newSuggestions.push({
          type: 'category',
          value: category.slug,
          label: `Thể loại: ${category.name}`,
          icon: '🎭'
        });
      });
    }
    
    // Luôn thêm gợi ý sắp xếp
    newSuggestions.push({
      type: 'header',
      label: 'Xem phim theo:',
      icon: '📋'
    });
    
    newSuggestions.push({
      type: 'sort',
      value: 'newest',
      label: 'Phim mới nhất',
      icon: '🆕'
    });
    newSuggestions.push({
      type: 'sort',
      value: 'most_viewed',
      label: 'Phim xem nhiều',
      icon: '🔥'
    });
    newSuggestions.push({
      type: 'sort',
      value: 'highest_rated',
      label: 'Phim đánh giá cao',
      icon: '⭐'
    });
    newSuggestions.push({
      type: 'sort',
      value: 'most_liked',
      label: 'Phim yêu thích',
      icon: '❤️'
    });

    setSuggestions(newSuggestions);
  };

  // Function để thực hiện tìm kiếm
  const performSearch = (query: string) => {
    const queryLower = query.toLowerCase().trim();
    
    // Tìm kiếm thể loại dựa trên dữ liệu thực tế
    let matchingCategory = null;
    
    // Loại bỏ từ "phim" khỏi query để tìm kiếm chính xác hơn
    const cleanQuery = queryLower.replace(/^phim\s+/, '').trim();
    
    // Hàm tính độ tương đồng giữa 2 chuỗi (Levenshtein distance)
    const calculateSimilarity = (str1: string, str2: string): number => {
      const longer = str1.length > str2.length ? str1 : str2;
      const shorter = str1.length > str2.length ? str2 : str1;
      if (longer.length === 0) return 1.0;
      const distance = levenshteinDistance(longer, shorter);
      return (longer.length - distance) / longer.length;
    };
    
    // Hàm tính khoảng cách Levenshtein
    const levenshteinDistance = (str1: string, str2: string): number => {
      const matrix = [];
      for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
      }
      for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
      }
      for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
          if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
          }
        }
      }
      return matrix[str2.length][str1.length];
    };
    
    // Tìm kiếm thể loại theo nhiều cách
    matchingCategory = categories.find(category => {
      const categoryName = category.name.toLowerCase();
      const categorySlug = category.slug.toLowerCase();
      
      // Kiểm tra tên thể loại
      if (categoryName.includes(cleanQuery) || cleanQuery.includes(categoryName)) {
        return true;
      }
      
      // Kiểm tra slug thể loại
      if (categorySlug.includes(cleanQuery) || cleanQuery.includes(categorySlug)) {
        return true;
      }
      
      // Kiểm tra với query gốc (bao gồm "phim")
      if (categoryName.includes(queryLower) || queryLower.includes(categoryName)) {
        return true;
      }
      
      if (categorySlug.includes(queryLower) || queryLower.includes(categorySlug)) {
        return true;
      }
      
      return false;
    });
    
    // Nếu không tìm thấy chính xác, tìm kiếm gần đúng (fuzzy search)
    if (!matchingCategory && cleanQuery.length > 2) {
      let bestMatch = null;
      let bestSimilarity = 0;
      
      categories.forEach(category => {
        const categoryName = category.name.toLowerCase();
        const categorySlug = category.slug.toLowerCase();
        
        // Tính độ tương đồng với tên thể loại
        const nameSimilarity = calculateSimilarity(cleanQuery, categoryName);
        const slugSimilarity = calculateSimilarity(cleanQuery, categorySlug);
        
        const maxSimilarity = Math.max(nameSimilarity, slugSimilarity);
        
        // Nếu độ tương đồng > 70% và tốt hơn kết quả hiện tại
        if (maxSimilarity > 0.7 && maxSimilarity > bestSimilarity) {
          bestMatch = category;
          bestSimilarity = maxSimilarity;
        }
      });
      
      if (bestMatch) {
        matchingCategory = bestMatch;
      }
    }
    
    if (matchingCategory) {
      // Nếu tìm thấy thể loại khớp, hiển thị phim theo thể loại đó
      setSelectedCategory(matchingCategory.slug);
      setSelectedCountry('all'); // Reset quốc gia
      setSelectedSortBy('newest'); // Reset sắp xếp
      setMinRating(0); // Reset rating
      setSearchQuery(''); // Xóa thanh tìm kiếm
      setCurrentPage(1);
      setShowSuggestions(false);
    } else {
      // Nếu không tìm thấy thể loại, hiển thị phim mới nhất
      setSelectedCategory('all'); // Reset thể loại
      setSelectedCountry('all'); // Reset quốc gia
      setSelectedSortBy('newest');
      setMinRating(0); // Reset rating
      setSearchQuery(''); // Xóa thanh tìm kiếm
      setCurrentPage(1);
      setShowSuggestions(false);
    }
  };

  // Xử lý khi click vào gợi ý
  const handleSuggestionClick = (suggestion: any) => {
    if (suggestion.type === 'header') return;
    
    // Add to search history
    if (suggestion.type === 'history') {
      const newHistory = [suggestion.value, ...searchHistory.filter(h => h !== suggestion.value)].slice(0, 10);
      setSearchHistory(newHistory);
      localStorage.setItem('movieSearchHistory', JSON.stringify(newHistory));
      setSearchQuery(suggestion.value);
      setShowSuggestions(false);
      
      // Thực hiện tìm kiếm ngay lập tức
      performSearch(suggestion.value);
      return;
    }
    
    // Xử lý click vào phim cụ thể
    if (suggestion.type === 'movie') {
      const movie = suggestion.movie;
      handleClick(movie.slug, movie.id);
      setShowSuggestions(false);
      setSearchQuery('');
      setSelectedSuggestionIndex(-1);
      return;
    }
    
    switch (suggestion.type) {
      case 'sort':
        setSelectedSortBy(suggestion.value);
        setSearchQuery(''); // Reset search query khi chọn sắp xếp
        setCurrentPage(1); // Reset về trang 1
        break;
      case 'category':
        setSelectedCategory(suggestion.value);
        setSearchQuery(''); // Reset search query khi chọn thể loại
        setCurrentPage(1); // Reset về trang 1
        break;
      case 'country':
        setSelectedCountry(suggestion.value);
        setSearchQuery(''); // Reset search query khi chọn quốc gia
        setCurrentPage(1); // Reset về trang 1
        break;
      case 'rating':
        setMinRating(suggestion.value);
        setSearchQuery(''); // Reset search query khi chọn rating
        setCurrentPage(1); // Reset về trang 1
        break;
    }
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchQuery.trim()) {
        // Thêm vào lịch sử tìm kiếm
        const newHistory = [searchQuery.trim(), ...searchHistory.filter(h => h !== searchQuery.trim())].slice(0, 10);
        setSearchHistory(newHistory);
        localStorage.setItem('movieSearchHistory', JSON.stringify(newHistory));
        
        // Thực hiện tìm kiếm
        performSearch(searchQuery.trim());
      }
      return;
    }

    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.filter(s => s.type !== 'header').length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        searchInputRef.current?.blur();
        break;
    }
  };

  const fetchData = async (page = currentPage) => {
    setIsLoading(true);
    try {
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        hideFromPublic: 'true',
        limit: '24'
      });

      // Không thêm search query vào API call chính
      // Chỉ sử dụng search query cho suggestions

      // Add category filter if not 'all'
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }

      // Add country filter if not 'all'
      if (selectedCountry !== 'all') {
        params.append('country', selectedCountry);
      }

      // Add sort by filter
      if (selectedSortBy) {
        params.append('sortBy', selectedSortBy);
      }

      // Add rating filter
      if (minRating > 0) {
        params.append('minRating', minRating.toString());
      }

      const moviesRes = await fetch(`http://localhost:3000/api/movies?${params.toString()}`);
      
      if (!moviesRes.ok) {
        throw new Error(`HTTP error! status: ${moviesRes.status}`);
      }
      
      const moviesResponse = await moviesRes.json();

      // Kiểm tra nếu response có cấu trúc đúng
      if (!moviesResponse || typeof moviesResponse !== 'object') {
        throw new Error('Invalid response format');
      }

      const moviesData = moviesResponse.movies || moviesResponse;
      
      // Kiểm tra nếu moviesData là array
      if (!Array.isArray(moviesData)) {
        console.error('moviesData is not an array:', moviesData);
        setTrendingMovies([]);
        return;
      }

      const movies: Movie[] = moviesData.map((m) => ({
        id: m.id,
        title: m.title,
        posterUrl: m.posterUrl,
        releaseYear: m.releaseYear,
        rating: m.rating ?? "N/A",
        slug: m.slug,
        views: m.views ?? 0,
        likes: m.likes ?? 0,
        isHidden: m.isHidden ?? false,
        averageRating: m.averageRating ?? 0,
        totalRatings: m.totalRatings ?? 0,
      }));

      setTrendingMovies(movies);

      if (moviesResponse.pagination) {
        setPagination(moviesResponse.pagination);
      }

      // Fetch categories and countries only on first load
      if (page === 1 && categories.length === 0) {
        const categoriesRes = await fetch("http://localhost:3000/api/categories");
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData || []);
      }

      if (page === 1 && countries.length === 0) {
        const countriesRes = await fetch("http://localhost:3000/api/movies?limit=1000");
        const countriesData = await countriesRes.json();
        if (countriesData.movies) {
          const uniqueCountries = [...new Set(countriesData.movies.map((movie: any) => movie.country).filter(Boolean))] as string[];
          setCountries(uniqueCountries);
        }
      }
    } catch (err) {
      console.error("Không thể lấy dữ liệu", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentPage, selectedCategory, selectedCountry, selectedSortBy, minRating]);

  const handleClick = async (slug: string, movieId: number) => {
    try {
      await fetch(`http://localhost:3000/api/movies/${movieId}/view`, { method: 'POST' });
      
      setTrendingMovies(prev =>
        prev.map(m => m.id === movieId ? { ...m, views: (m.views || 0) + 1 } : m)
      );

      navigate(`/movie/${slug}`);
    } catch (err) {
      console.error('Lỗi tăng view:', err);
      navigate(`/movie/${slug}`);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };


  const clearFilters = () => {
    setSelectedCategory('all');
    setSelectedCountry('all');
    setSelectedSortBy('newest');
    setMinRating(0);
    setSearchQuery('');
    setShowSuggestions(false);
    setSuggestions([]);
    setMovieSuggestions([]);
    setSelectedSuggestionIndex(-1);
    setIsSearching(false);
    setCurrentPage(1);
  };



  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-16">
        {/* Header Section */}
       

        {/* Search and Filter Section */}
        <div className="mb-12 space-y-6">
          {/* Search Bar */}
          <div className="flex justify-center">
            <div className="relative w-full max-w-2xl">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Tìm kiếm phim (nhấn Enter để tìm)"
                value={searchQuery}
                ref={searchInputRef}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedSuggestionIndex(-1);
                  setIsSearching(true);
                  debouncedGenerateSuggestions(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => {
                  setShowSuggestions(true);
                  if (searchQuery.trim().length === 0) {
                    generateSuggestions('');
                  }
                }}
                onBlur={() => {
                  // Delay để cho phép click vào suggestion
                  setTimeout(() => {
                    setShowSuggestions(false);
                    setSelectedSuggestionIndex(-1);
                    setIsSearching(false);
                  }, 200);
                }}
                onKeyDown={handleKeyDown}
                className="w-full pl-12 pr-16 py-4 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300"
              />
              
              {/* Search button */}
              <button
                onClick={() => {
                  if (searchQuery.trim()) {
                    handleKeyDown({ key: 'Enter', preventDefault: () => {} } as any);
                  }
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                title="Tìm kiếm (Enter)"
              >
                <Search className="h-4 w-4" />
              </button>
              
              {/* Loading indicator */}
              {isSearching && searchQuery.trim().length > 0 && (
                <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                </div>
              )}

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
                  <div className="p-2">
                    {searchQuery.trim().length > 0 && (
                      <div className="text-xs text-gray-400 mb-2 px-2 flex items-center">
                        <span className="mr-2">💡</span>
                        Gợi ý tìm kiếm:
                      </div>
                    )}
                    {suggestions.map((suggestion, index) => {
                      const isSelected = selectedSuggestionIndex === suggestions.filter(s => s.type !== 'header').indexOf(suggestion);
                      
                      if (suggestion.type === 'header') {
                        return (
                          <div key={index} className="px-3 py-2 text-xs font-semibold text-gray-300 flex items-center">
                            <span className="mr-2">{suggestion.icon}</span>
                            {suggestion.label}
                          </div>
                        );
                      }
                      
                      return (
                        <button
                          key={index}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200 flex items-center space-x-3 group ${
                            isSelected 
                              ? 'bg-red-600 text-white' 
                              : 'hover:bg-gray-700'
                          }`}
                        >
                          <span className={`text-lg transition-transform duration-200 ${
                            isSelected ? 'scale-110' : 'group-hover:scale-110'
                          }`}>
                            {suggestion.icon}
                          </span>
                          <span className={`text-sm transition-colors duration-200 ${
                            isSelected 
                              ? 'text-white' 
                              : 'text-white group-hover:text-red-400'
                          }`}>
                            {suggestion.type === 'movie' && suggestion.highlightedLabel ? (
                              <span dangerouslySetInnerHTML={{ __html: suggestion.highlightedLabel }} />
                            ) : (
                              suggestion.label
                            )}
                          </span>
                          <span className={`ml-auto text-xs transition-colors duration-200 ${
                            isSelected 
                              ? 'text-gray-200' 
                              : 'text-gray-500 group-hover:text-gray-300'
                          }`}>
                            {suggestion.type === 'sort' ? 'Sắp xếp' :
                             suggestion.type === 'category' ? 'Thể loại' :
                             suggestion.type === 'country' ? 'Quốc gia' :
                             suggestion.type === 'rating' ? 'Đánh giá' :
                             suggestion.type === 'history' ? 'Gần đây' :
                             suggestion.type === 'movie' ? `${suggestion.movie?.releaseYear || ''}` : ''}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Active Filters Display */}
          {(selectedCategory !== 'all' || selectedCountry !== 'all' || selectedSortBy !== 'newest' || minRating > 0 || searchQuery.trim()) && (
            <div className="flex justify-center mb-4">
              <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 w-full max-w-4xl">
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {searchQuery.trim() && (
                      <span className="inline-flex items-center px-2 py-1 bg-red-600 text-white text-xs rounded-full">
                        Tìm: "{searchQuery}"
                        <button
                          onClick={() => setSearchQuery('')}
                          className="ml-1 hover:bg-red-700 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    {selectedCategory !== 'all' && (
                      <span className="inline-flex items-center px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                        {categories.find(c => c.slug === selectedCategory)?.name || selectedCategory}
                        <button
                          onClick={() => setSelectedCategory('all')}
                          className="ml-1 hover:bg-blue-700 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    {selectedCountry !== 'all' && (
                      <span className="inline-flex items-center px-2 py-1 bg-green-600 text-white text-xs rounded-full">
                        {selectedCountry}
                        <button
                          onClick={() => setSelectedCountry('all')}
                          className="ml-1 hover:bg-green-700 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    {selectedSortBy !== 'newest' && (
                      <span className="inline-flex items-center px-2 py-1 bg-purple-600 text-white text-xs rounded-full">
                        {selectedSortBy === 'most_viewed' ? 'Xem nhiều' :
                         selectedSortBy === 'most_liked' ? 'Yêu thích' :
                         selectedSortBy === 'highest_rated' ? 'Đánh giá cao' :
                         selectedSortBy === 'lowest_rated' ? 'Đánh giá thấp' :
                         selectedSortBy === 'oldest' ? 'Cũ nhất' : selectedSortBy}
                        <button
                          onClick={() => setSelectedSortBy('newest')}
                          className="ml-1 hover:bg-purple-700 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    {minRating > 0 && (
                      <span className="inline-flex items-center px-2 py-1 bg-yellow-600 text-white text-xs rounded-full">
                        {minRating}⭐ trở lên
                        <button
                          onClick={() => setMinRating(0)}
                          className="ml-1 hover:bg-yellow-700 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                  </div>
                  <button
                    onClick={clearFilters}
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    Xóa tất cả
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Filters */}
          <div className="flex justify-center">
            <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 w-full max-w-4xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Bộ lọc nâng cao</h3>
              </div>

                {/* Compact Filter Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Categories Filter */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-300 mb-1">Thể loại</h4>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-2 py-1.5 bg-gray-700 text-white text-xs rounded border border-gray-600 focus:outline-none focus:ring-1 focus:ring-red-500"
                    >
                      <option value="all">Tất cả</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.slug}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Countries Filter */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-300 mb-1">Quốc gia</h4>
                    <select
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                      className="w-full px-2 py-1.5 bg-gray-700 text-white text-xs rounded border border-gray-600 focus:outline-none focus:ring-1 focus:ring-red-500"
                    >
                      <option value="all">Tất cả</option>
                      {countries.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sort By Filter */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-300 mb-1">Sắp xếp</h4>
                    <select
                      value={selectedSortBy}
                      onChange={(e) => setSelectedSortBy(e.target.value)}
                      className="w-full px-2 py-1.5 bg-gray-700 text-white text-xs rounded border border-gray-600 focus:outline-none focus:ring-1 focus:ring-red-500"
                    >
                      <option value="newest">Mới nhất</option>
                      <option value="oldest">Cũ nhất</option>
                      <option value="most_viewed">Xem nhiều</option>
                      <option value="most_liked">Yêu thích</option>
                      <option value="highest_rated">Đánh giá cao</option>
                      <option value="lowest_rated">Đánh giá thấp</option>
                    </select>
                  </div>

                  {/* Rating Filter */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-300 mb-1">Đánh giá</h4>
                    <select
                      value={minRating}
                      onChange={(e) => setMinRating(parseFloat(e.target.value))}
                      className="w-full px-2 py-1.5 bg-gray-700 text-white text-xs rounded border border-gray-600 focus:outline-none focus:ring-1 focus:ring-red-500"
                    >
                      <option value={0}>Tất cả</option>
                      <option value={3}>3⭐ trở lên</option>
                      <option value={4}>4⭐ trở lên</option>
                      <option value={4.5}>4.5⭐ trở lên</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
        </div>

        {/* Movies Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {isLoading ? (
            Array.from({ length: 12 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="aspect-[2/3] bg-gradient-to-br from-gray-800 to-gray-700 rounded-2xl shadow-xl"></div>
                <div className="mt-4 space-y-3">
                  <div className="h-4 bg-gray-700 rounded-lg w-3/4"></div>
                  <div className="flex justify-between">
                    <div className="h-3 bg-gray-700 rounded-lg w-12"></div>
                    <div className="h-3 bg-gray-700 rounded-lg w-16"></div>
                  </div>
                </div>
              </div>
            ))
          ) : trendingMovies.length === 0 ? (
            <div className="col-span-full text-center py-20">
              <div className="text-6xl text-gray-500 mb-4">🎬</div>
              <h3 className="text-2xl font-bold text-white mb-2">Không tìm thấy phim</h3>
              <p className="text-gray-400">Thử tìm kiếm với từ khóa khác</p>
            </div>
          ) : (
            trendingMovies.map((movie) => (
              <div
                key={movie.id}
                className="group cursor-pointer"
                onClick={() => handleClick(movie.slug, movie.id)}
              >
                <div className="relative overflow-hidden rounded-lg aspect-[2/3] shadow-lg transform hover:scale-105 transition-all duration-300">
                  <img
                    src={movie.posterUrl}
                    alt={movie.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                    <div className="bg-white/20 rounded-full p-4">
                      <Play className="h-8 w-8 text-white fill-current" />
                    </div>
                  </div>
                  
                  {/* Rating Badge */}
                  {movie.averageRating && movie.averageRating > 0 && (
                    <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-orange-400 text-black px-3 py-1 rounded-full text-sm font-bold flex items-center space-x-1 shadow-lg">
                      <Star className="h-4 w-4 fill-current" />
                      <span>{movie.averageRating.toFixed(1)}</span>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="absolute bottom-0 left-0 right-0 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <div className="bg-red-600 text-white py-3 text-center font-semibold">
                      <div className="flex items-center justify-center space-x-2">
                        <Play className="h-4 w-4 fill-current" />
                        <span>Xem Ngay</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Movie Info */}
                <div className="mt-4 space-y-3">
                  <h3 className="text-white font-bold text-sm line-clamp-2 group-hover:text-red-400 transition-colors duration-300 leading-tight">
                    {movie.title}
                  </h3>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 bg-gray-800 px-3 py-1 rounded-full">
                      {movie.releaseYear}
                    </span>
                    <div className="flex items-center space-x-2 text-xs">
                      <div className="flex items-center space-x-1 text-red-400">
                        <Heart className="h-3 w-3 fill-current" />
                        <span>{(movie.likes ?? 0).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-blue-400">
                        <span>👁️</span>
                        <span>{(movie.views ?? 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center space-x-2 mt-16">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!pagination.hasPrevPage}
              className="flex items-center px-6 py-3 text-sm font-medium text-white bg-gray-800 border border-gray-600 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            >
              <ChevronLeft size={18} className="mr-2" />
              Trước
            </button>

            <div className="flex space-x-2">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const page = Math.max(1, Math.min(pagination.totalPages - 4, currentPage - 2)) + i;
                if (page > pagination.totalPages) return null;
                
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                      page === currentPage
                        ? 'bg-red-600 text-white'
                        : 'text-white bg-gray-800 border border-gray-600 hover:bg-gray-700'
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
              className="flex items-center px-6 py-3 text-sm font-medium text-white bg-gray-800 border border-gray-600 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            >
              Sau
              <ChevronRight size={18} className="ml-2" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrendingMovies;