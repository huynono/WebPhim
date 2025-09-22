import { useEffect, useState, useRef } from "react";
import { Star, Calendar, Clock, Play, Volume2, VolumeX } from "lucide-react";

interface Movie {
  title: string;
  description: string;
  releaseYear?: number;
  rating?: string;
  averageRating?: number;
  totalRatings?: number;
  duration: string;
  videoUrl: string;
  createdAt: string;
  episodes?: { videoUrl: string }[];
}

// Hỗ trợ các prefix của fullscreen
interface FullscreenHTMLElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
}

interface FullscreenDocument extends Document {
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
}

const Hero = () => {
  const [featuredMovie, setFeaturedMovie] = useState<Movie | null>(null);
  const [muted, setMuted] = useState(true);
  const [duration, setDuration] = useState<string>("0:00");
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fetch movies mới nhất
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/movies?page=1");
        const response = await res.json();
        
        // Xử lý response mới có pagination
        const data = response.movies || response;
        if (!data || data.length === 0) return;

        // API đã sắp xếp theo createdAt desc, lấy phim đầu tiên
        const movie = data[0];
        const videoUrl = movie.episodes?.[0]?.videoUrl ?? "";
        if (!videoUrl) return;

        setFeaturedMovie({
          title: movie.title,
          description: movie.description,
          releaseYear: movie.releaseYear,
          rating: movie.rating || "N/A",
          averageRating: movie.averageRating || 0,
          totalRatings: movie.totalRatings || 0,
          duration: "0:00",
          videoUrl,
          createdAt: movie.createdAt,
          episodes: movie.episodes,
        });
      } catch (err) {
        console.warn("Backend not available", err);
        setFeaturedMovie(null);
      }
    };

    fetchMovies();
  }, []);

  // Cập nhật duration khi video load
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const handleLoadedMetadata = () => {
      const totalSeconds = Math.floor(videoEl.duration);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      setDuration(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    };

    videoEl.addEventListener("loadedmetadata", handleLoadedMetadata);
    return () => videoEl.removeEventListener("loadedmetadata", handleLoadedMetadata);
  }, [featuredMovie]);

  // Theo dõi fullscreen change để re-render
// Xóa dòng này
// const [fullscreenTrigger, setFullscreenTrigger] = useState(false);

// Cập nhật useEffect theo dõi fullscreen
useEffect(() => {
  const handleFullscreenChange = () => {
    // Không cần set state, chỉ force render không cần
  };

  document.addEventListener("fullscreenchange", handleFullscreenChange);
  document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
  document.addEventListener("mozfullscreenchange", handleFullscreenChange);
  document.addEventListener("MSFullscreenChange", handleFullscreenChange);

  return () => {
    document.removeEventListener("fullscreenchange", handleFullscreenChange);
    document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
    document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
  };
}, []);


  if (!featuredMovie || !featuredMovie.videoUrl) return null;

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setMuted(videoRef.current.muted);
  };

  const handleWatchNow = () => {
    if (!videoRef.current) return;
    const videoEl = videoRef.current as FullscreenHTMLElement;

    if (videoEl.requestFullscreen) videoEl.requestFullscreen();
    else if (videoEl.webkitRequestFullscreen) videoEl.webkitRequestFullscreen();
    else if (videoEl.mozRequestFullScreen) videoEl.mozRequestFullScreen();
    else if (videoEl.msRequestFullscreen) videoEl.msRequestFullscreen();

    videoRef.current.play();
    videoRef.current.muted = false;
    setMuted(false);
  };

  const isVideoFullscreen = (): boolean => {
    const doc = document as FullscreenDocument;
    return (
      doc.fullscreenElement === videoRef.current ||
      doc.webkitFullscreenElement === videoRef.current ||
      doc.mozFullScreenElement === videoRef.current ||
      doc.msFullscreenElement === videoRef.current
    );
  };

  return (
    <div className="relative h-[70vh] w-full overflow-hidden">
      <video
        ref={videoRef}
        className="absolute top-0 left-0 w-full h-full object-cover"
        src={featuredMovie.videoUrl}
        autoPlay
        muted={muted}
        loop
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

      {/* Nội dung */}
      <div className="relative container mx-auto px-4 h-full flex items-center">
        <div className="max-w-2xl text-white">
          {isVideoFullscreen() ? (
            // Chỉ hiển thị title khi full màn hình
            <h1 className="text-5xl md:text-6xl font-bold mb-4 leading-tight">
              {featuredMovie.title}
            </h1>
          ) : (
            <>
              <h1 className="text-5xl md:text-6xl font-bold mb-4 leading-tight">
                {featuredMovie.title}
              </h1>
              <p className="text-lg md:text-xl text-gray-200 mb-6 leading-relaxed">
                {featuredMovie.description}
              </p>

              <div className="flex items-center space-x-6 mb-8">
                {/* Rating Stars */}
                {featuredMovie.averageRating && featuredMovie.averageRating > 0 ? (
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const ratingInStars = featuredMovie.averageRating!;
                        const isFilled = star <= ratingInStars;
                        const isHalfFilled = star - 0.5 <= ratingInStars && star > ratingInStars;
                        
                        return (
                          <div key={star} className="relative">
                            <Star
                              className={`h-4 w-4 ${
                                isFilled 
                                  ? 'text-yellow-400 fill-current' 
                                  : 'text-gray-400'
                              }`}
                            />
                            {isHalfFilled && (
                              <div className="absolute inset-0 overflow-hidden">
                                <Star
                                  className="h-4 w-4 text-yellow-400 fill-current"
                                  style={{ clipPath: 'inset(0 50% 0 0)' }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <span className="text-lg font-semibold text-yellow-400">
                      {featuredMovie.averageRating.toFixed(1)}
                    </span>
                   
                  </div>
                ) : (
                  <div className="flex items-center space-x-1">
                    <Star className="h-5 w-5 text-gray-400" />
                    <span className="text-lg font-semibold text-gray-400">Chưa có đánh giá</span>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-300" />
                  <span>{featuredMovie.releaseYear || featuredMovie.createdAt?.slice(0, 4) || "N/A"}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-300" />
                  <span>{duration}</span>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={handleWatchNow}
                  className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-semibold flex items-center space-x-2 transition-all hover:scale-105"
                >
                  <Play className="h-5 w-5 fill-current" />
                  <span>Xem ngay</span>
                </button>

                <button
                  onClick={toggleMute}
                  className="bg-gray-800/80 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-semibold flex items-center space-x-2 transition-all border border-gray-600"
                >
                  {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  <span>{muted ? "Tắt âm" : "Bật âm"}</span>
                </button>

               
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Hero;
