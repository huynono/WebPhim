import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, Film, X, Star, MessageCircle, ThumbsUp, ThumbsDown, Send, Image, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import AuthModal from '../components/AuthModal';
import SuggestedVideos from '../components/Suggestedvideos';
import MovieBanner from '../components/MovieBanner';

interface MovieDetails {
  id: number;
  title: string;
  posterUrl: string;
  backdropUrl: string;
  releaseYear: number;
  rating: string;
  duration: string;
  genres?: { genre: { name: string } }[];
  categories?: { category: { name: string; slug: string } }[];
  description: string;
  director: string;
  cast?: string[];
  videoUrl?: string;
  episodes?: { videoUrl: string }[];
  views?: number;
  likes?: number;
  slug: string;
}

interface Ad {
  id: number;
  type: 'PRE_ROLL' | 'MID_ROLL' | 'OVERLAY';
  videoUrl: string;
  linkUrl?: string;
  startTime?: number;
  isSkippable?: boolean;
  skipAfter?: number;
  movieId?: number;
}

interface User {
  id: number;
  name: string;
  avatar?: string;
}

interface Comment {
  id: number;
  content: string;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  user: User;
  likes: number;
  dislikes: number;
  userLikeStatus?: 'like' | 'dislike' | null;
  replies: CommentReply[];
  media?: CommentMedia[];
}

interface CommentReply {
  id: number;
  content: string;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  user: User;
  likes: number;
  dislikes: number;
  userLikeStatus?: 'like' | 'dislike' | null;
  media?: CommentMedia[];
}

interface CommentMedia {
  id: number;
  mediaUrl: string;
  mediaType: 'image' | 'video';
}

const MovieDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, openAuthModal, isAuthModalOpen, closeAuthModal } = useAuth();
  const [movie, setMovie] = useState<MovieDetails | null>(null);
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const adPlayedIds = useRef<number[]>([]);
  const previousTimeRef = useRef<number>(0);
  const hasProcessedUrlParam = useRef<boolean>(false);
  const isPlayOperationInProgress = useRef<boolean>(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);

  // Quảng cáo state
  const [adPlaying, setAdPlaying] = useState<Ad | null>(null);
  const [adTimeLeft, setAdTimeLeft] = useState(0);
  const [isResumingAfterAd, setIsResumingAfterAd] = useState(false);
  const [savedTime, setSavedTime] = useState(0);
  const [visibleOverlayAdId, setVisibleOverlayAdId] = useState<number | null>(null);
  const [closeAdClickedOnce, setCloseAdClickedOnce] = useState(false);
  const [overlayAdClosedByUser, setOverlayAdClosedByUser] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showContinuePrompt, setShowContinuePrompt] = useState(false);
  const [seekTime, setSeekTime] = useState<number | null>(null);
  const [isContinuing, setIsContinuing] = useState(false);
  const [isManualContinue, setIsManualContinue] = useState(false);

  // Rating và Comment states
  const [userRating, setUserRating] = useState<number>(0);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [, setTotalRatings] = useState<number>(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState<string>('');
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentMedia, setCommentMedia] = useState<File[]>([]);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState<string>('');
  const [ratingNotification, setRatingNotification] = useState<string>('');
  const [isLoadingUserRating, setIsLoadingUserRating] = useState<boolean>(false);

  // Comment menu states
  const [openCommentMenu, setOpenCommentMenu] = useState<number | null>(null);
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editCommentContent, setEditCommentContent] = useState<string>('');
  const [editCommentMedia, setEditCommentMedia] = useState<File[]>([]);
  const [editCommentOldMedia, setEditCommentOldMedia] = useState<CommentMedia[]>([]);
  const [editCommentMediaToDelete, setEditCommentMediaToDelete] = useState<number[]>([]);

  // Reply menu states
  const [openReplyMenu, setOpenReplyMenu] = useState<number | null>(null);
  const [editingReply, setEditingReply] = useState<number | null>(null);
  const [editReplyContent, setEditReplyContent] = useState<string>('');
  const [editReplyMedia, setEditReplyMedia] = useState<File[]>([]);
  const [editReplyOldMedia, setEditReplyOldMedia] = useState<CommentMedia[]>([]);
  const [editReplyMediaToDelete, setEditReplyMediaToDelete] = useState<number[]>([]);

  // Image zoom modal states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState<boolean>(false);

  // Lazy loading states
  const [showComments, setShowComments] = useState<boolean>(false);
  const [commentsLoaded, setCommentsLoaded] = useState<boolean>(false);
  const [isLoadingComments, setIsLoadingComments] = useState<boolean>(false);
  const [commentsPage, setCommentsPage] = useState<number>(1);
  const [hasMoreComments, setHasMoreComments] = useState<boolean>(true);
  const commentsSectionRef = useRef<HTMLDivElement>(null);

  // Memoized fetch function
  const fetchMovieDetails = useCallback(async () => {
    if (!slug) return;
    setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:3000/api/movies/slug/${slug}`);
      if (!res.ok) throw new Error('Không lấy được dữ liệu');
      const data: MovieDetails = await res.json();
      const videoUrl = data.episodes?.[0]?.videoUrl ?? data.videoUrl;
      setMovie({ ...data, videoUrl, cast: data.cast ?? [] });
    } catch (error) {
      console.error('Error fetching movie details:', error);
      setMovie(null);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  // -------------------- FETCH MOVIE --------------------
  useEffect(() => {
    fetchMovieDetails();
  }, [fetchMovieDetails]);

  // -------------------- CHECK FAVORITE STATUS --------------------
  useEffect(() => {
    if (!movie || !user) return;

    const checkFavoriteStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:3000/api/favorites/check/${movie.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setIsLiked(data.isFavorite);
        }
      } catch (error) {
        console.error('Error checking favorite status:', error);
      }
    };

    checkFavoriteStatus();
  }, [movie, user]);

  // -------------------- SET FAVORITE COUNT FROM MOVIE DATA --------------------
  useEffect(() => {
    if (movie && movie.likes !== undefined) {
      setLikeCount(movie.likes);
    }
  }, [movie]);

  // -------------------- FETCH RATINGS AND COMMENTS --------------------
  useEffect(() => {
    if (movie) {
      fetchMovieRatings();
    }
  }, [movie]);

  // -------------------- INTERSECTION OBSERVER FOR LAZY LOADING COMMENTS --------------------
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          console.log('Intersection Observer triggered:', entry.isIntersecting);
          if (entry.isIntersecting) {
            // Debounce to avoid multiple rapid triggers
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
              console.log('Setting showComments to true');
              setShowComments(true);
            }, 100);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '200px' // Load comments 200px before they come into view
      }
    );

    if (commentsSectionRef.current) {
      console.log('Starting to observe comments section');
      observer.observe(commentsSectionRef.current);
    } else {
      console.log('Comments section ref not found');
    }

    return () => {
      clearTimeout(timeoutId);
      if (commentsSectionRef.current) {
        observer.unobserve(commentsSectionRef.current);
      }
    };
  }, []);

  // -------------------- FETCH USER RATING WHEN USER CHANGES --------------------
  useEffect(() => {
    if (movie && user) {
      fetchUserRating();
    }
  }, [movie, user]);

  // -------------------- CLOSE COMMENT/REPLY MENU ON CLICK OUTSIDE --------------------
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.comment-menu')) {
        setOpenCommentMenu(null);
      }
      if (!target.closest('.reply-menu')) {
        setOpenReplyMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // -------------------- FETCH ADS --------------------
  useEffect(() => {
    if (!movie) return;
    const fetchAds = async () => {
      try {
        const res = await fetch(`http://localhost:3000/api/ads/movie/${movie.id}`);
        if (!res.ok) throw new Error("Không lấy được quảng cáo");
        const data: Ad[] = await res.json();
        setAds(data);
      } catch (error) {
        console.error('Error fetching ads:', error);
      }
    };
    fetchAds();
  }, [movie]);

  useEffect(() => {
    const firstOverlay = ads.find(ad => ad.type === 'OVERLAY');
    // Set the ad to be visible, but only if an overlay isn't already showing and the user hasn't closed it.
    if (firstOverlay && !visibleOverlayAdId && !overlayAdClosedByUser) {
      setVisibleOverlayAdId(firstOverlay.id);
      setCloseAdClickedOnce(false); // Reset on new ad
    }
  }, [ads, visibleOverlayAdId, overlayAdClosedByUser]);

  // -------------------- PRE-ROLL --------------------
  useEffect(() => {
    if (!ads.length || !movie) return;

    const preRoll = ads.find(ad => ad.type === "PRE_ROLL");
    if (!preRoll) return;

    // Chỉ set adPlaying nếu chưa chơi
    if (!adPlayedIds.current.includes(preRoll.id)) {
      setSavedTime(0);
      setAdPlaying(preRoll);
      setAdTimeLeft(preRoll.isSkippable && preRoll.skipAfter ? preRoll.skipAfter : 0);
      adPlayedIds.current.push(preRoll.id); // đánh dấu luôn để tránh chạy lại
    }
  }, [ads, movie]);

  const adViewedRef = useRef<{ [key: number]: boolean }>({});
  // -------------------- HANDLE AD PLAY --------------------
  useEffect(() => {
    if (!adPlaying) return;

    if (adViewedRef.current[adPlaying.id]) return; // đã tăng view → bỏ qua

    const incrementAdView = async () => {
      try {
        await fetch(`http://localhost:3000/api/ads/${adPlaying.id}/view`, { method: "POST" });
        adPlayedIds.current.push(adPlaying.id); // đánh dấu đã chơi
        adViewedRef.current[adPlaying.id] = true; // đánh dấu đã tăng view
      } catch (error) {
        console.error('Error incrementing ad view:', error);
      }
    };

    incrementAdView();
  }, [adPlaying]);

  // -------------------- AD COUNTDOWN --------------------
  useEffect(() => {
    if (!adPlaying || adTimeLeft <= 0) return;
    const timer = setInterval(() => setAdTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [adPlaying, adTimeLeft]);

  // -------------------- VIDEO EVENTS --------------------
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration || 0);

      // Xử lý tham số t từ URL để seek đến thời điểm đã xem
      const timeParam = searchParams.get('t');
      if (timeParam && !hasProcessedUrlParam.current) { // Chỉ xử lý một lần
        const seekTime = parseFloat(timeParam);
        if (!isNaN(seekTime) && seekTime > 0) {
          hasProcessedUrlParam.current = true; // Mark as processed
          video.currentTime = seekTime;
          setCurrentTime(seekTime);
          setSeekTime(seekTime);

          // Chỉ thử auto play nếu không có manual continue
          if (!isManualContinue) {
            // Thử tự động phát video (mute trước để tương thích với browser)
            video.muted = true;

            safePlay(video).then(() => {
              setIsPlaying(true);
              setShowContinuePrompt(false);
              // Restore original mute state - but keep it unmuted for better UX
              video.muted = false;
              setIsMuted(false);
              // Clear seekTime to prevent future resets
              setSeekTime(null);
              // Remove URL parameter to prevent future conflicts
              removeTimeParameter();
            }).catch(() => {
              // Restore original mute state - but keep it unmuted for better UX
              video.muted = false;
              setIsMuted(false);
              // Hiển thị prompt để user click để tiếp tục
              setShowContinuePrompt(true);
              // Clear seekTime to prevent future resets
              setSeekTime(null);
              // Remove URL parameter to prevent future conflicts
              removeTimeParameter();
            });
          } else {
            // Clear seekTime to prevent future resets
            setSeekTime(null);
            // Remove URL parameter to prevent future conflicts
            removeTimeParameter();
          }
        }
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    if (video.readyState >= 1) handleLoadedMetadata();

    let animationFrameId: number;
    const updateProgress = () => {
      // Update currentTime smoothly without interfering with seeking
      if (!isSeeking && video.currentTime !== undefined) {
        setCurrentTime(video.currentTime);
      }
      animationFrameId = requestAnimationFrame(updateProgress);
    };
    if (isPlaying && !adPlaying) animationFrameId = requestAnimationFrame(updateProgress);
    else cancelAnimationFrame(animationFrameId!);

    // -------------------- MID-ROLL --------------------
    const midRollAds = ads.filter(ad => ad.type === "MID_ROLL");
    const checkMidRoll = () => {
      const currentTime = video.currentTime;
      midRollAds.forEach(ad => {
        if (
          ad.startTime &&
          previousTimeRef.current < ad.startTime &&
          currentTime >= ad.startTime &&
          !adPlayedIds.current.includes(ad.id)
        ) {
          setSavedTime(currentTime);
          setAdPlaying(ad); // useEffect adPlaying sẽ handle tăng view
          video.pause();
          setAdTimeLeft(ad.isSkippable && ad.skipAfter ? ad.skipAfter : 0);
          adPlayedIds.current.push(ad.id); // Đánh dấu ngay lập tức để tránh chạy lại
        }
      });
      previousTimeRef.current = currentTime;
    };

    video.addEventListener("timeupdate", checkMidRoll);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener("timeupdate", checkMidRoll);
      cancelAnimationFrame(animationFrameId);
    };
  }, [movie?.videoUrl, ads, isSeeking, isPlaying, adPlaying, searchParams, isManualContinue]);

  // -------------------- RESET KHI VIDEO CHÍNH THAY ĐỔI --------------------
  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    adPlayedIds.current = [];
    previousTimeRef.current = 0;
    hasProcessedUrlParam.current = false; // Reset URL param processing
    setOverlayAdClosedByUser(false);
    setIsContinuing(false); // Reset continuing state
    setIsManualContinue(false); // Reset manual continue state
    setShowContinuePrompt(false); // Reset continue prompt
    setIsSeeking(false); // Reset seeking state
  }, [slug]);

  // -------------------- SAVE WATCH PROGRESS --------------------
  useEffect(() => {
    if (!user || !movie || adPlaying) return;

    const saveProgress = async (progress: number) => {
      try {
        const token = localStorage.getItem('token');

        // Chỉ lưu nếu đã xem ít nhất 10 giây
        if (progress >= 10) {
          const response = await fetch('http://localhost:3000/api/watch-history', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              movieId: movie.id,
              progress: progress
            })
          });

          if (response.ok) {
            await response.json();
          } else {
            console.error('Error saving watch progress');
          }
        }
      } catch (error) {
        console.error('Error saving progress:', error);
      }
    };

    // Lưu tiến độ mỗi 30 giây khi đang phát
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        saveProgress(Math.floor(currentTime));
      }, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user, movie, isPlaying, currentTime, adPlaying]);

  // -------------------- SAVE PROGRESS ON PAGE UNLOAD --------------------
  useEffect(() => {
    if (!user || !movie) return;

    const saveFinalProgress = async () => {
      const progress = Math.floor(currentTime);
      if (progress >= 10) {
        try {
          const token = localStorage.getItem('token');

          // Sử dụng fetch với keepalive để đảm bảo request được gửi
          await fetch('http://localhost:3000/api/watch-history', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              movieId: movie.id,
              progress: progress
            }),
            keepalive: true
          });
        } catch (error) {
          console.error('Error saving final progress:', error);
        }
      }
    };

    const handleBeforeUnload = () => {
      saveFinalProgress();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user, movie, currentTime]);

  // -------------------- VIDEO CONTROLS --------------------
  const removeTimeParameter = () => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('t')) {
      url.searchParams.delete('t');
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Safe play function to prevent AbortError
  const safePlay = (video: HTMLVideoElement): Promise<void> => {
    return new Promise((resolve, reject) => {
      // If there's already a play operation in progress, wait for it to complete
      if (isPlayOperationInProgress.current) {
        setTimeout(() => {
          safePlay(video).then(resolve).catch(reject);
        }, 100);
        return;
      }

      isPlayOperationInProgress.current = true;

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            isPlayOperationInProgress.current = false;
            resolve();
          })
          .catch((error) => {
            isPlayOperationInProgress.current = false;
            // Don't reject AbortError - just resolve silently
            if (error.name === 'AbortError') {
              resolve();
            } else {
              reject(error);
            }
          });
      } else {
        isPlayOperationInProgress.current = false;
        resolve();
      }
    });
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (adPlaying) return;

    const video = videoRef.current;
    if (video.paused) {
      safePlay(video).catch(() => {
        // Handle play error silently
      });
    } else {
      video.pause();
    }
  };

  const handleContinueWatching = () => {
    if (!videoRef.current || !seekTime || isContinuing) {
      return;
    }

    setIsContinuing(true);
    setIsManualContinue(true); // Mark as manual continue to prevent conflicts

    const video = videoRef.current;

    // Check if video is ready to play
    if (video.readyState < 3) {
      // Set timeout to prevent infinite waiting
      const timeoutId = setTimeout(() => {
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleError);
        attemptPlay();
      }, 3000); // 3 second timeout

      const handleCanPlay = () => {
        clearTimeout(timeoutId);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleError);
        attemptPlay();
      };

      const handleError = () => {
        clearTimeout(timeoutId);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleError);
        setIsContinuing(false);
      };

      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('error', handleError);
      return;
    }

    attemptPlay();

    function attemptPlay() {
      // Double-check video still exists
      if (!videoRef.current) {
        setIsContinuing(false);
        return;
      }

      // Don't call video.load() as it causes conflicts with other play attempts

      // Try to trigger video loading by setting currentTime
      if (video.readyState < 2) {
        // Force load the video
        video.load();

        // Wait for video to be ready
        const waitForReady = () => {
          if (video.readyState >= 2) {
            video.currentTime = seekTime!;
            setCurrentTime(seekTime!);
            attemptPlayAfterLoad();
          } else {
            setTimeout(waitForReady, 200);
          }
        };

        setTimeout(waitForReady, 100);
        return;
      }

      // Seek đến thời điểm đã xem và phát
      video.currentTime = seekTime!;
      setCurrentTime(seekTime!);

      attemptPlayAfterLoad();
    }

    function attemptPlayAfterLoad() {
      if (!videoRef.current) {
        setIsContinuing(false);
        setIsManualContinue(false);
        return;
      }

      const video = videoRef.current;

      // Mute video temporarily for autoplay compatibility
      const wasMuted = video.muted;
      video.muted = true;

      // Try multiple approaches to play the video
      const tryPlay = () => {
        // Create a timeout for the play promise
        const playTimeout = setTimeout(() => {
          setIsPlaying(true);
          setShowContinuePrompt(false);
          setIsContinuing(false);
          setIsManualContinue(false);
          if (videoRef.current) {
            videoRef.current.muted = wasMuted;
            setIsMuted(wasMuted);
          }
          // Clear seekTime to prevent future resets
          setSeekTime(null);
          // Remove URL parameter to prevent future conflicts
          removeTimeParameter();
        }, 3000); // 3 second timeout

        safePlay(video).then(() => {
          clearTimeout(playTimeout);
          setIsPlaying(true);
          setShowContinuePrompt(false);
          setIsContinuing(false);
          setIsManualContinue(false);
          // Restore original mute state after successful play - but keep it unmuted for better UX
          if (videoRef.current) {
            videoRef.current.muted = false;
            setIsMuted(false);
          }
          // Clear seekTime to prevent future resets
          setSeekTime(null);
          // Remove URL parameter to prevent future conflicts
          removeTimeParameter();
        }).catch(() => {
          clearTimeout(playTimeout);

          // If play failed and readyState is still low, try again
          if (video.readyState < 2) {
            setTimeout(tryPlay, 500);
          } else {
            setIsContinuing(false);
            setIsManualContinue(false);
            // Restore original mute state even if play failed
            if (videoRef.current) {
              videoRef.current.muted = wasMuted;
              setIsMuted(wasMuted);
            }
          }
        });
      };

      tryPlay();
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) videoRef.current.volume = newVolume;
    if (newVolume > 0 && isMuted) setIsMuted(false);
  }, [isMuted]);

  const handleSeekMouseDown = () => {
    if (adPlaying) return;
    setIsSeeking(true);
  };

  const handleSeekMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    if (adPlaying) return;
    if (videoRef.current) {
      const newTime = Number(e.currentTarget.value);
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);

      // Reset seeking state - video will continue playing naturally
      setIsSeeking(false);
    } else {
      setIsSeeking(false);
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (adPlaying) return;
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
  };

  const skip = (seconds: number) => {
    if (adPlaying) return;
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(videoRef.current.currentTime + seconds, duration));
    setCurrentTime(newTime);
    videoRef.current.currentTime = newTime;
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else videoRef.current.requestFullscreen();
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00';
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // -------------------- HANDLE SKIP AD --------------------
  const handleSkipAd = () => {
    setAdPlaying(null);
    setIsResumingAfterAd(true);

    // Đảm bảo video chính được play lại
    if (videoRef.current) {
      videoRef.current.currentTime = savedTime;
      safePlay(videoRef.current).catch(() => {
        // Handle play error silently
      });
    }
  };

  const incrementOverlayView = async (adId: number) => {
    try {
      await fetch(`http://localhost:3000/api/ads/${adId}/view`, { method: "POST" });
    } catch (error) {
      console.error('Error incrementing overlay ad view:', error);
    }
  };

  // -------------------- HANDLE LIKE --------------------
  const handleLike = async () => {
    if (!user || !movie) {
      // Nếu chưa đăng nhập, mở popup đăng nhập
      openAuthModal();
      return;
    }

    try {
      const token = localStorage.getItem('token');

      if (isLiked) {
        // Bỏ yêu thích
        const response = await fetch(`http://localhost:3000/api/favorites/${movie.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          setIsLiked(false);
          setLikeCount(prev => Math.max(0, prev - 1));
          // Cập nhật movie data để sync với backend
          if (movie) {
            setMovie(prev => prev ? { ...prev, likes: Math.max(0, (prev.likes || 0) - 1) } : null);
          }
        }
      } else {
        // Thêm yêu thích
        const response = await fetch(`http://localhost:3000/api/favorites/${movie.id}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          setIsLiked(true);
          setLikeCount(prev => prev + 1);
          // Cập nhật movie data để sync với backend
          if (movie) {
            setMovie(prev => prev ? { ...prev, likes: (prev.likes || 0) + 1 } : null);
          }
        }
      }
    } catch (error) {
      console.error('Error handling like:', error);
    }
  };

  // -------------------- HANDLE RATING --------------------
  const handleRating = async (rating: number) => {
    if (!user || !movie) {
      openAuthModal();
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/movies/${movie.id}/rating`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating })
      });

      if (response.ok) {
        // Cập nhật userRating ngay lập tức
        setUserRating(rating);
        // Hiển thị thông báo
        setRatingNotification(`Đã đánh giá ${rating} sao!`);
        setTimeout(() => setRatingNotification(''), 3000);
        // Fetch updated rating data (averageRating, totalRatings) nhưng không fetch userRating
        fetchMovieRatings();
      }
    } catch (error) {
      console.error('Error rating movie:', error);
    }
  };

  // -------------------- FETCH MOVIE RATINGS --------------------
  const fetchMovieRatings = async () => {
    if (!movie) return;

    try {
      const response = await fetch(`http://localhost:3000/api/movies/${movie.id}/ratings`);
      if (response.ok) {
        const data = await response.json();
        setAverageRating(data.averageRating || 0);
        setTotalRatings(data.totalRatings || 0);
      }
    } catch (error) {
      console.error('Error fetching ratings:', error);
    }
  };

  // -------------------- FETCH USER RATING --------------------
  const fetchUserRating = async () => {
    if (!movie || !user) return;

    try {
      setIsLoadingUserRating(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`http://localhost:3000/api/movies/${movie.id}/ratings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUserRating(data.userRating || 0);
      }
    } catch (error) {
      console.error('Error fetching user rating:', error);
    } finally {
      setIsLoadingUserRating(false);
    }
  };

  // -------------------- FETCH COMMENTS --------------------
  const fetchComments = useCallback(async (forceRefresh = false, loadMore = false) => {
    console.log('fetchComments called:', { movie: !!movie, commentsLoaded, forceRefresh, loadMore });

    if (!movie || (commentsLoaded && !forceRefresh && !loadMore)) {
      console.log('fetchComments early return:', { movie: !!movie, commentsLoaded, forceRefresh, loadMore });
      return;
    }

    console.log('Starting to fetch comments...');
    setIsLoadingComments(true);
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const page = loadMore ? commentsPage + 1 : 1;
      const url = `http://localhost:3000/api/movies/${movie.id}/comments?page=${page}&limit=10`;
      console.log('Fetching comments from:', url);

      const response = await fetch(url, { headers });
      console.log('Comments response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Comments data received:', data);

        if (loadMore) {
          setComments(prev => [...prev, ...(data.comments || [])]);
          setCommentsPage(page);
        } else {
          setComments(data.comments || []);
          setCommentsPage(1);
        }

        setHasMoreComments(data.hasMore || false);
        setCommentsLoaded(true);
        console.log('Comments loaded successfully');
      } else {
        console.error('Failed to fetch comments:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoadingComments(false);
    }
  }, [movie, commentsLoaded, commentsPage]);

  // -------------------- FETCH COMMENTS WHEN SHOW COMMENTS CHANGES --------------------
  useEffect(() => {
    console.log('useEffect showComments changed:', { showComments, commentsLoaded });
    if (showComments && !commentsLoaded) {
      console.log('Triggering fetchComments from useEffect');
      fetchComments();
    }
  }, [showComments, commentsLoaded, fetchComments]);

  // -------------------- FALLBACK: LOAD COMMENTS AFTER MOVIE LOADS --------------------
  useEffect(() => {
    if (movie && !commentsLoaded) {
      // Fallback: Load comments after 2 seconds if intersection observer doesn't trigger
      const fallbackTimer = setTimeout(() => {
        if (!showComments) {
          console.log('Fallback: Loading comments after timeout');
          setShowComments(true);
        }
      }, 2000);

      return () => clearTimeout(fallbackTimer);
    }
  }, [movie, commentsLoaded, showComments]);

  // -------------------- SUBMIT COMMENT --------------------
  const handleSubmitComment = async () => {
    if (!user || !movie || !newComment.trim()) {
      if (!user) openAuthModal();
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('content', newComment);

      // Add media files if any
      commentMedia.forEach((file) => {
        formData.append('media', file);
      });

      const response = await fetch(`http://localhost:3000/api/movies/${movie.id}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        setNewComment('');
        setCommentMedia([]);
        setShowCommentForm(false);
        fetchComments(true);
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    }
  };

  // -------------------- HANDLE COMMENT LIKE --------------------
  const handleCommentLike = async (commentId: number, isLike: boolean) => {
    if (!user) {
      openAuthModal();
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/comments/${commentId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isLike })
      });

      if (response.ok) {
        fetchComments(true);
      }
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  // -------------------- HANDLE REPLY LIKE --------------------
  const handleReplyLike = async (replyId: number, isLike: boolean) => {
    if (!user) {
      openAuthModal();
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/replies/${replyId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isLike })
      });

      if (response.ok) {
        fetchComments(true);
      }
    } catch (error) {
      console.error('Error liking reply:', error);
    }
  };

  // -------------------- RENDER CONTENT WITH @TAGS --------------------
  const renderContentWithTags = (content: string, commentId?: number) => {
    // Lấy danh sách tất cả user names để match chính xác
    const allUsers = getUserSuggestions();
    const userNames = allUsers.map(user => user.name);

    // Tạo regex pattern để match chính xác tên user
    const mentionPattern = new RegExp(
      `@(${userNames.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
      'g'
    );

    // Tách nội dung thành các phần
    const parts = content.split(mentionPattern);

    return parts.map((part, index) => {
      // Kiểm tra xem part có phải là tên user không
      if (userNames.includes(part)) {
        return (
          <span
            key={index}
            className="text-blue-400 font-semibold cursor-pointer hover:text-blue-300 transition-colors"
            onClick={() => {
              if (commentId) {
                setReplyingTo(commentId);
                setReplyContent(`@${part} `);
              }
            }}
          >
            @{part}
          </span>
        );
      }
      return part;
    });
  };

  // -------------------- GET USER SUGGESTIONS --------------------
  const getUserSuggestions = () => {
    const users: User[] = [];

    // Lấy user từ comments
    comments.forEach(comment => {
      if (comment.user && !users.find(u => u.id === comment.user.id)) {
        users.push(comment.user);
      }

      // Lấy user từ replies
      comment.replies.forEach(reply => {
        if (reply.user && !users.find(u => u.id === reply.user.id)) {
          users.push(reply.user);
        }
      });
    });

    return users;
  };

  // -------------------- HANDLE REPLY CONTENT CHANGE --------------------
  const handleReplyContentChange = (value: string) => {
    setReplyContent(value);
  };

  // -------------------- SUBMIT REPLY --------------------
  const handleSubmitReply = async (commentId: number) => {
    if (!user || !replyContent.trim()) {
      if (!user) openAuthModal();
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('content', replyContent);

      // Add media files if any
      commentMedia.forEach((file) => {
        formData.append('media', file);
      });

      const response = await fetch(`http://localhost:3000/api/comments/${commentId}/replies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        setReplyContent('');
        setCommentMedia([]);
        setReplyingTo(null);
        fetchComments(true);
      }
    } catch (error) {
      console.error('Error submitting reply:', error);
    }
  };

  // -------------------- EDIT COMMENT --------------------
  const handleEditComment = async (commentId: number) => {
    if (!user || !editCommentContent.trim()) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('content', editCommentContent);

      // Add media files if any
      editCommentMedia.forEach((file) => {
        formData.append('media', file);
      });

      // Add media IDs to delete
      editCommentMediaToDelete.forEach((mediaId) => {
        formData.append('mediaToDelete', mediaId.toString());
      });

      const response = await fetch(`http://localhost:3000/api/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        setEditingComment(null);
        setEditCommentContent('');
        setEditCommentMedia([]);
        setEditCommentOldMedia([]);
        setEditCommentMediaToDelete([]);
        setOpenCommentMenu(null);
        fetchComments(true);
      }
    } catch (error) {
      console.error('Error editing comment:', error);
    }
  };

  // -------------------- DELETE COMMENT --------------------
  const handleDeleteComment = async (commentId: number) => {
    if (!user) return;

    if (window.confirm('Bạn có chắc chắn muốn xóa bình luận này?')) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:3000/api/comments/${commentId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          setOpenCommentMenu(null);
          fetchComments(true);
        }
      } catch (error) {
        console.error('Error deleting comment:', error);
      }
    }
  };

  // -------------------- START EDIT COMMENT --------------------
  const startEditComment = (comment: Comment) => {
    setEditingComment(comment.id);
    setEditCommentContent(comment.content);
    setEditCommentMedia([]);
    setEditCommentOldMedia(comment.media || []);
    setEditCommentMediaToDelete([]);
    setOpenCommentMenu(null);
  };

  // -------------------- EDIT REPLY --------------------
  const handleEditReply = async (replyId: number) => {
    if (!user || !editReplyContent.trim()) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('content', editReplyContent);

      // Add media files if any
      editReplyMedia.forEach((file) => {
        formData.append('media', file);
      });

      // Add media IDs to delete
      editReplyMediaToDelete.forEach((mediaId) => {
        formData.append('mediaToDelete', mediaId.toString());
      });

      const response = await fetch(`http://localhost:3000/api/replies/${replyId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        setEditingReply(null);
        setEditReplyContent('');
        setEditReplyMedia([]);
        setEditReplyOldMedia([]);
        setEditReplyMediaToDelete([]);
        setOpenReplyMenu(null);
        fetchComments(true);
      }
    } catch (error) {
      console.error('Error editing reply:', error);
    }
  };

  // -------------------- DELETE REPLY --------------------
  const handleDeleteReply = async (replyId: number) => {
    if (!user) return;

    if (window.confirm('Bạn có chắc chắn muốn xóa trả lời này?')) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:3000/api/replies/${replyId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          setOpenReplyMenu(null);
          fetchComments(true);
        }
      } catch (error) {
        console.error('Error deleting reply:', error);
      }
    }
  };

  // -------------------- START EDIT REPLY --------------------
  const startEditReply = (reply: CommentReply) => {
    setEditingReply(reply.id);
    setEditReplyContent(reply.content);
    setEditReplyMedia([]);
    setEditReplyOldMedia(reply.media || []);
    setEditReplyMediaToDelete([]);
    setOpenReplyMenu(null);
  };

  // -------------------- DELETE OLD MEDIA --------------------
  const handleDeleteOldCommentMedia = (mediaId: number) => {
    setEditCommentMediaToDelete(prev => [...prev, mediaId]);
    setEditCommentOldMedia(prev => prev.filter(media => media.id !== mediaId));
  };

  const handleDeleteOldReplyMedia = (mediaId: number) => {
    setEditReplyMediaToDelete(prev => [...prev, mediaId]);
    setEditReplyOldMedia(prev => prev.filter(media => media.id !== mediaId));
  };

  // -------------------- IMAGE ZOOM MODAL --------------------
  const openImageModal = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setIsImageModalOpen(true);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
    setIsImageModalOpen(false);
  };

  if (isLoading) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
        <div className="text-white text-xl">Đang tải...</div>
      </div>
    </div>
  );

  if (!movie) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <Film className="h-16 w-16 text-gray-500 mx-auto mb-4" />
        <div className="text-white text-xl">Không tìm thấy phim</div>
      </div>
    </div>
  );

  const safeCurrentTime = isNaN(currentTime) ? 0 : currentTime;
  const safeDuration = isNaN(duration) || duration === 0 ? 0 : duration;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 pb-20">
      {/* Main Header */}
      <Header />

      {/* Movie Title Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 py-4">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex items-center gap-4">
            {/* Back button */}
            <button
              onClick={async () => {
                // Lưu tiến độ trước khi navigate
                if (user && movie && currentTime >= 10) {
                  try {
                    const token = localStorage.getItem('token');
                    await fetch('http://localhost:3000/api/watch-history', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({
                        movieId: movie.id,
                        progress: Math.floor(currentTime)
                      })
                    });
                  } catch (error) {
                    console.error('Error saving progress on navigation:', error);
                  }
                }
                navigate(-1);
              }}
              className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white p-2 rounded-full transition-all duration-300 hover:scale-110 border border-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            {/* Movie Title */}
            <h1 className="text-2xl md:text-4xl font-bold text-white bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              {movie.title}
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 md:px-8 py-4">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Video Player */}
          <div className="xl:col-span-3">
            {movie.videoUrl && (
              <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
                <div
                  className="relative bg-black"
                  onMouseEnter={() => setShowControls(true)}
                  onMouseLeave={() => { if (!isSeeking) setShowControls(false); }}
                >
                  <video
                    ref={videoRef}
                    poster={movie.backdropUrl}
                    className="w-full aspect-video object-cover"
                    onClick={adPlaying ? undefined : togglePlay}
                    onPlay={() => {
                      setIsPlaying(true);
                      setShowContinuePrompt(false); // Hide continue prompt when video plays
                    }}
                    onPause={() => setIsPlaying(false)}
                    onSeeking={adPlaying ? (e) => {
                      e.preventDefault();
                      if (videoRef.current) {
                        videoRef.current.currentTime = 0;
                      }
                    } : () => {
                      // Video is seeking - let it continue naturally without interference
                    }}
                    onSeeked={() => {
                      // Video finished seeking - no need to manually resume
                    }}
                    src={adPlaying ? adPlaying.videoUrl : movie.videoUrl}
                    autoPlay={!!adPlaying || isResumingAfterAd}
                    muted={isMuted}
                    controls={!adPlaying}
                    controlsList={adPlaying ? "nodownload nofullscreen noremoteplayback" : undefined}
                    disablePictureInPicture={!!adPlaying}
                    onEnded={() => {
                      if (adPlaying) {
                        handleSkipAd();
                      } else {
                        setIsPlaying(false);
                      }
                    }}
                    onCanPlay={() => {
                      if (isResumingAfterAd && videoRef.current) {
                        videoRef.current.currentTime = savedTime;
                        setIsResumingAfterAd(false);
                        // Đảm bảo video được play
                        safePlay(videoRef.current).catch(() => {
                          // Handle play error silently
                        });
                      }
                    }}
                    onContextMenu={adPlaying ? (e) => e.preventDefault() : undefined}
                  >
                    <source src={adPlaying ? adPlaying.videoUrl : movie.videoUrl} type="video/mp4" />
                    Trình duyệt của bạn không hỗ trợ video HTML5.
                  </video>

                  {/* Skip Button - Bottom Right like YouTube */}
                  {adPlaying && (
                    <div
                      className="absolute bottom-20 right-4 z-[9999]"
                      style={{
                        // Ensure it's always visible, even in fullscreen
                        position: 'absolute',
                        zIndex: 999999,
                        pointerEvents: 'auto'
                      }}
                    >
                      {adTimeLeft > 0 ? (
                        <div className="bg-black/95 text-white px-4 py-3 rounded-xl flex items-center gap-3 backdrop-blur-md border border-white/30 shadow-2xl">
                          <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                          <span className="text-sm font-semibold">Skip in {adTimeLeft}s</span>
                        </div>
                      ) : (
                        <button
                          onClick={handleSkipAd}
                          className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-xl flex items-center gap-3 transition-all duration-200 hover:scale-105 shadow-2xl backdrop-blur-md border border-red-500/50 font-bold text-base"
                          style={{ pointerEvents: 'auto' }}
                        >
                          <span className="text-sm font-bold">Skip Ad</span>
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Continue Watching Prompt */}
                  {showContinuePrompt && seekTime && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-30">
                      <div className="bg-gray-800 rounded-xl p-6 text-center max-w-md mx-4">
                        <div className="text-white text-lg font-semibold mb-2">
                          Tiếp tục xem
                        </div>
                        <div className="text-gray-300 text-sm mb-4">
                          Video đã được đặt tại thời điểm {Math.floor(seekTime / 60)}:{Math.floor(seekTime % 60).toString().padStart(2, '0')}
                        </div>
                        <button
                          onClick={handleContinueWatching}
                          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
                        >
                          <Play className="h-4 w-4 fill-current" />
                          Tiếp tục xem
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Overlay Ads */}
                  {ads.find(ad => ad.type === "OVERLAY" && ad.id === visibleOverlayAdId) && (() => {
                    const ad = ads.find(ad => ad.type === "OVERLAY" && ad.id === visibleOverlayAdId)!;

                    const handleVideoClick = () => {
                      if (!ad) return;
                      incrementOverlayView(ad.id);
                      if (ad.linkUrl) {
                        window.open(ad.linkUrl, '_blank');
                      } else {
                        navigate('/');
                      }
                      setVisibleOverlayAdId(null);
                    };

                    const handleCloseClick = (e: React.MouseEvent) => {
                      e.stopPropagation();
                      if (!ad) return;

                      if (!closeAdClickedOnce) {
                        incrementOverlayView(ad.id);
                        if (ad.linkUrl) {
                          window.open(ad.linkUrl, '_blank');
                        } else {
                          navigate('/');
                        }
                        setCloseAdClickedOnce(true);
                      } else {
                        setVisibleOverlayAdId(null);
                        setOverlayAdClosedByUser(true);
                      }
                    };

                    return (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                        <div
                          className="relative bg-gray-800 p-2 rounded-lg shadow-lg max-w-[50%] max-h-[50%] cursor-pointer"
                          onClick={handleVideoClick}
                        >
                          <button
                            onClick={handleCloseClick}
                            className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full p-1.5 z-30 hover:bg-red-700 transition-transform hover:scale-110"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <video
                            src={ad.videoUrl}
                            className="max-w-full max-h-full object-contain rounded"
                            autoPlay
                            loop
                            muted
                            playsInline
                            onError={(e) => {
                              console.error('Error playing overlay ad video:', e);
                              // Fallback to image if video fails
                              const videoElement = e.target as HTMLVideoElement;
                              const img = document.createElement('img');
                              img.src = ad.videoUrl;
                              img.className = 'max-w-full max-h-full object-contain rounded';
                              img.alt = 'Quảng cáo';
                              videoElement.parentNode?.replaceChild(img, videoElement);
                            }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Controls */}
                  {!adPlaying && (
                    <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6 transition-all duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`} style={{ pointerEvents: 'auto' }}>
                      <>
                        <input
                          type="range"
                          min={0}
                          max={safeDuration}
                          value={safeCurrentTime}
                          onMouseDown={handleSeekMouseDown}
                          onMouseUp={handleSeekMouseUp}
                          onChange={handleSeekChange}
                          onInput={(e) => {
                            if (adPlaying) return;
                            const newTime = Number((e.target as HTMLInputElement).value);

                            setCurrentTime(newTime);
                            if (videoRef.current) {
                              videoRef.current.currentTime = newTime;
                            }
                          }}
                          className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider pointer-events-auto z-50 mb-2"
                          style={{
                            background: `linear-gradient(to right, #dc2626 0%, #dc2626 ${safeDuration ? (safeCurrentTime / safeDuration) * 100 : 0}%, #4b5563 ${safeDuration ? (safeCurrentTime / safeDuration) * 100 : 0}%, #4b5563 100%)`,
                          }}
                        />
                        <div className="flex justify-between text-white text-sm mb-4 font-medium">
                          <span className="bg-black/50 px-2 py-1 rounded">{formatTime(safeCurrentTime)}</span>
                          <span className="bg-black/50 px-2 py-1 rounded">{formatTime(safeDuration)}</span>
                        </div>
                      </>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <button onClick={() => skip(-10)} className="text-white hover:text-red-400 transition-colors p-2 hover:bg-white/10 rounded-full">
                            <SkipBack className="h-5 w-5" />
                          </button>
                          <button onClick={togglePlay} className="bg-red-600 hover:bg-red-700 text-white rounded-full p-3 transition-all duration-200 hover:scale-110 shadow-lg">
                            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
                          </button>
                          <button onClick={() => skip(10)} className="text-white hover:text-red-400 transition-colors p-2 hover:bg-white/10 rounded-full">
                            <SkipForward className="h-5 w-5" />
                          </button>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-3">
                            <button onClick={toggleMute} className="text-white hover:text-red-400 transition-colors p-2 hover:bg-white/10 rounded-full">
                              {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                            </button>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.1}
                              value={isMuted ? 0 : volume}
                              onChange={handleVolumeChange}
                              className="w-24 h-2 bg-gray-600 rounded-lg cursor-pointer"
                            />
                          </div>
                          <button onClick={toggleFullscreen} className="text-white hover:text-red-400 transition-colors p-2 hover:bg-white/10 rounded-full">
                            <Maximize className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Banner Quảng Cáo 1 - Giữa video và nội dung phim */}
            <div className="mt-8 mb-8">
              <MovieBanner
                type="MOVIE_BANNER_1"
                className="w-full h-32 rounded-xl shadow-2xl"
              />
            </div>

            {/* Description */}
            <div className="mt-8 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-white/10">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                <Film className="h-6 w-6 text-red-500 mr-3" />
                Nội dung phim
              </h3>
              <p className="text-gray-200 leading-relaxed text-lg bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                {movie.description}
              </p>
            </div>

            {/* Banner Quảng Cáo - Mobile Only */}
            <div className="mt-8 xl:hidden">
              {(() => {
                const bannerAd = ads.find(ad => ad.type === "OVERLAY");
                if (bannerAd) {
                  return (
                    <div
                      className="w-full h-48 rounded-xl shadow-2xl border-2 border-white/20 overflow-hidden relative group cursor-pointer"
                      onClick={() => {
                        // Tăng view cho banner ad
                        incrementOverlayView(bannerAd.id);

                        if (bannerAd.linkUrl) {
                          window.open(bannerAd.linkUrl, '_blank');
                        }
                      }}
                    >
                      <video
                        src={bannerAd.videoUrl}
                        className="w-full h-full object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                        onError={(e) => {
                          // Fallback to image if video fails
                          const videoElement = e.target as HTMLVideoElement;
                          const img = document.createElement('img');
                          img.src = bannerAd.videoUrl;
                          img.className = 'w-full h-full object-cover';
                          img.alt = 'Banner quảng cáo';
                          videoElement.parentNode?.replaceChild(img, videoElement);
                        }}
                      />
                    </div>
                  );
                }

                // Fallback banner nếu không có quảng cáo

              })()}
            </div>

            {/* Thông tin phim - Mobile Only */}
            <div className="mt-8 xl:hidden bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-white/10 space-y-6">
              <div>
                <h4 className="text-white font-bold mb-4 flex items-center text-lg">
                  <Film className="h-5 w-5 text-red-500 mr-2" />Thông tin phim
                </h4>
                <div className="space-y-4">
                  {/* Năm phát hành */}
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">Năm phát hành</span>
                      <span className="text-white font-semibold">{movie.releaseYear}</span>
                    </div>
                  </div>

                  {/* Lượt xem */}
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">Lượt xem</span>
                      <span className="text-white font-semibold">{(movie.views || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Đánh giá sao */}
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">Đánh giá</span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => {
                            const ratingInStars = averageRating; // Use averageRating directly as 5-star scale
                            const isFilled = star <= ratingInStars;
                            const isHalfFilled = star - 0.5 <= ratingInStars && star > ratingInStars;

                            return (
                              <div key={star} className="relative">
                                <Star
                                  className={`h-4 w-4 ${isFilled
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
                        <span className="text-white font-semibold">
                          {averageRating > 0 ? averageRating.toFixed(1) : 'Chưa có đánh giá'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Lượt thích */}
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">Lượt thích</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">❤️</span>
                        <span className="text-white font-semibold">
                          {likeCount >= 1000 ? `${(likeCount / 1000).toFixed(1)}K` : likeCount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Nút yêu thích */}
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                    {isLiked ? (
                      // Đã yêu thích - hiển thị nút bỏ yêu thích
                      <button
                        onClick={handleLike}
                        className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 rounded-xl py-3 px-4 transition-all duration-200 hover:scale-105 relative group"
                        title="Bỏ yêu thích"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-xl">❤️</span>
                          <span className="text-sm font-medium">Đã yêu thích</span>
                        </div>
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                          Nhấn để bỏ yêu thích
                        </div>
                      </button>
                    ) : (
                      // Chưa yêu thích - hiển thị nút thêm vào danh sách yêu thích
                      <button
                        onClick={handleLike}
                        className={`w-full rounded-xl py-3 px-4 transition-all duration-200 hover:scale-105 relative group ${!user
                          ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 hover:text-yellow-300 border border-yellow-500/30 hover:border-yellow-500/50 animate-pulse'
                          : 'bg-gray-500/20 hover:bg-red-500/20 text-gray-300 hover:text-red-400 border border-gray-500/30 hover:border-red-500/30'
                          }`}
                        title={!user ? 'Đăng nhập để yêu thích' : 'Thêm vào danh sách yêu thích'}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-xl">
                            {!user ? '⭐' : '❤️'}
                          </span>
                          <span className="text-sm font-medium">
                            {!user ? 'Đăng nhập để thêm vào danh sách yêu thích' : 'Thêm vào danh sách yêu thích'}
                          </span>
                        </div>
                      </button>
                    )}
                  </div>

                  {/* Danh mục phim */}
                  {movie.genres && movie.genres.length > 0 && (
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                      <h4 className="text-white font-bold mb-3 flex items-center text-sm">
                        <span className="text-red-500 mr-2"></span>Tag
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {movie.genres.map((genreItem, index) => (
                          <span
                            key={index}
                            className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs font-medium border border-red-500/30"
                          >
                            {genreItem.genre.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Banner Quảng Cáo Mobile - Dưới Thông Tin Phim */}
            <div className="mt-8 xl:hidden">
              <MovieBanner
                type="MOVIE_BANNER_3"
                className="w-full h-48 rounded-xl shadow-2xl"
              />
            </div>

            {/* Rating Section - Chỉ có đánh giá sao */}
            <div className="mt-8 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-white/10">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                <Star className="h-6 w-6 text-yellow-500 mr-3" />
                Đánh giá phim
              </h3>

              {/* Rating Notification */}
              {ratingNotification && (
                <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-sm text-center">
                  {ratingNotification}
                </div>
              )}

              {/* User Rating */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                <h4 className="text-white font-semibold mb-4 text-center">
                  {userRating > 0 ? 'Đánh giá của bạn' : 'Đánh giá phim này'}
                </h4>
                {isLoadingUserRating ? (
                  <div className="flex justify-center items-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-center space-x-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => handleRating(star)}
                          className={`transition-all duration-200 hover:scale-110 ${star <= userRating
                              ? 'text-yellow-400'
                              : 'text-gray-400 hover:text-yellow-300'
                            }`}
                          disabled={!user}
                        >
                          <Star
                            className={`h-8 w-8 ${star <= userRating ? 'fill-current' : ''
                              }`}
                          />
                        </button>
                      ))}
                    </div>
                    {userRating > 0 && (
                      <p className="text-center text-yellow-400 mt-2 font-semibold">
                        Bạn đã đánh giá {userRating} sao
                      </p>
                    )}
                    {!user && (
                      <p className="text-gray-400 text-sm text-center mt-2">
                        Đăng nhập để đánh giá
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Comments Section */}
            <div className="mt-8 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl p-4 md:p-6 shadow-2xl border border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                <h3 className="text-xl md:text-2xl font-bold text-white flex items-center">
                  <MessageCircle className="h-5 w-5 md:h-6 md:w-6 text-blue-500 mr-2 md:mr-3" />
                  Bình luận ({comments.length})
                </h3>
                <button
                  onClick={() => setShowCommentForm(!showCommentForm)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 md:px-4 rounded-lg transition-colors flex items-center gap-2 text-sm md:text-base"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Viết bình luận</span>
                  <span className="sm:hidden">Thêm bình luận</span>
                </button>
              </div>

              {/* Comment Form */}
              {showCommentForm && (
                <div className="mb-6 md:mb-8 bg-white/5 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-white/10">
                  <div className="flex items-start space-x-3 md:space-x-4">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
                      {user?.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm md:text-base">
                          {user?.name?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Viết bình luận của bạn..."
                        className="w-full bg-white/10 border border-white/20 rounded-lg p-3 md:p-4 text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                        rows={3}
                      />
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-3 md:mt-4 gap-3">
                        <div className="flex items-center space-x-2">
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/*,video/*"
                              multiple
                              onChange={(e) => setCommentMedia(Array.from(e.target.files || []))}
                              className="hidden"
                            />
                            <div className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors">
                              <Image className="h-4 w-4" />
                              <span className="text-xs md:text-sm">Ảnh/Video</span>
                            </div>
                          </label>
                          {commentMedia.length > 0 && (
                            <div className="text-xs text-gray-500">
                              {commentMedia.length} file(s) đã chọn
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setShowCommentForm(false);
                              setNewComment('');
                              setCommentMedia([]);
                            }}
                            className="px-3 md:px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm md:text-base"
                          >
                            Hủy
                          </button>
                          <button
                            onClick={handleSubmitComment}
                            disabled={!newComment.trim()}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 md:px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm md:text-base"
                          >
                            <Send className="h-4 w-4" />
                            Gửi
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Comments List */}
              <div ref={commentsSectionRef} className="space-y-4 md:space-y-6">
                {!showComments ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                    <p className="text-gray-400 mt-2">Đang tải bình luận...</p>
                    <button
                      onClick={() => {
                        console.log('Manual load comments button clicked');
                        setShowComments(true);
                      }}
                      className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                    >
                      Tải bình luận thủ công
                    </button>
                  </div>
                ) : isLoadingComments ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                    <p className="text-gray-400 mt-2">Đang tải bình luận...</p>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400">Chưa có bình luận nào</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="bg-white/5 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-white/10">
                      <div className="flex items-start space-x-3 md:space-x-4">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
                          {comment.user.avatar ? (
                            <img
                              src={comment.user.avatar}
                              alt={comment.user.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm md:text-base">
                              {comment.user.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-white font-semibold">{comment.user.name}</span>
                              <span className="text-gray-400 text-sm">
                                {new Date(comment.createdAt).toLocaleDateString('vi-VN')}
                              </span>
                              {comment.isEdited && (
                                <span className="text-gray-500 text-xs">(đã chỉnh sửa)</span>
                              )}
                            </div>

                            {/* Comment Menu - chỉ hiện cho user sở hữu comment */}
                            {user && Number(user.id) === Number(comment.user.id) && (
                              <div className="relative comment-menu">
                                <button
                                  onClick={() => setOpenCommentMenu(openCommentMenu === comment.id ? null : comment.id)}
                                  className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>

                                {/* Dropdown Menu */}
                                {openCommentMenu === comment.id && (
                                  <div className="absolute right-0 top-8 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-10 min-w-[120px]">
                                    <button
                                      onClick={() => startEditComment(comment)}
                                      className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors flex items-center space-x-2"
                                    >
                                      <Edit className="h-3 w-3" />
                                      <span>Sửa</span>
                                    </button>
                                    <button
                                      onClick={() => handleDeleteComment(comment.id)}
                                      className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors flex items-center space-x-2"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      <span>Xóa</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Comment Content - Edit Mode or Display Mode */}
                          {editingComment === comment.id ? (
                            <div className="mb-4">
                              <textarea
                                value={editCommentContent}
                                onChange={(e) => setEditCommentContent(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={3}
                              />

                              {/* Old Media with Delete Button */}
                              {editCommentOldMedia.length > 0 && (
                                <div className="mt-2">
                                  <div className="text-xs text-gray-400 mb-2">Ảnh/Video hiện tại:</div>
                                  <div className="grid grid-cols-2 gap-2">
                                    {editCommentOldMedia.map((media) => (
                                      <div key={media.id} className="relative group">
                                        {media.mediaType === 'image' ? (
                                          <img
                                            src={media.mediaUrl}
                                            alt="Media"
                                            className="w-full h-20 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => openImageModal(media.mediaUrl)}
                                          />
                                        ) : (
                                          <video
                                            src={media.mediaUrl}
                                            className="w-full h-20 object-cover rounded-lg"
                                            controls={false}
                                          />
                                        )}
                                        <button
                                          onClick={() => handleDeleteOldCommentMedia(media.id)}
                                          className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Edit Media Upload */}
                              <div className="flex items-center space-x-2 mt-2">
                                <label className="cursor-pointer">
                                  <input
                                    type="file"
                                    accept="image/*,video/*"
                                    multiple
                                    onChange={(e) => setEditCommentMedia(Array.from(e.target.files || []))}
                                    className="hidden"
                                  />
                                  <div className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors">
                                    <Image className="h-4 w-4" />
                                    <span className="text-sm">Thêm ảnh/Video mới</span>
                                  </div>
                                </label>
                                {editCommentMedia.length > 0 && (
                                  <div className="text-xs text-gray-500">
                                    {editCommentMedia.length} file(s) đã chọn
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center justify-end space-x-2 mt-2">
                                <button
                                  onClick={() => {
                                    setEditingComment(null);
                                    setEditCommentContent('');
                                    setEditCommentMedia([]);
                                    setEditCommentOldMedia([]);
                                    setEditCommentMediaToDelete([]);
                                  }}
                                  className="px-3 py-1 text-gray-400 hover:text-white transition-colors text-sm"
                                >
                                  Hủy
                                </button>
                                <button
                                  onClick={() => handleEditComment(comment.id)}
                                  disabled={!editCommentContent.trim()}
                                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1 rounded-lg transition-colors text-sm"
                                >
                                  Lưu
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-gray-200 mb-4">{renderContentWithTags(comment.content, comment.id)}</p>
                          )}

                          {/* Comment Media */}
                          {comment.media && comment.media.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 mb-4">
                              {comment.media.map((media) => (
                                <div key={media.id} className="rounded-lg overflow-hidden">
                                  {media.mediaType === 'image' ? (
                                    <img
                                      src={media.mediaUrl}
                                      alt="Comment media"
                                      className="w-full h-32 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                      onClick={() => openImageModal(media.mediaUrl)}
                                    />
                                  ) : (
                                    <video
                                      src={media.mediaUrl}
                                      className="w-full h-32 object-cover"
                                      controls
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Comment Actions */}
                          <div className="flex items-center space-x-4">
                            <button
                              onClick={() => {
                                handleCommentLike(comment.id, true);
                              }}
                              className={`flex items-center space-x-1 transition-colors rounded-lg px-2 py-1 ${comment.userLikeStatus === 'like'
                                  ? 'text-blue-500 bg-blue-500/20'
                                  : 'text-gray-400 hover:text-blue-500 hover:bg-blue-500/10'
                                }`}
                            >
                              <ThumbsUp className="h-4 w-4" />
                              <span className="text-sm">{comment.likes}</span>
                            </button>
                            <button
                              onClick={() => handleCommentLike(comment.id, false)}
                              className={`flex items-center space-x-1 transition-colors rounded-lg px-2 py-1 ${comment.userLikeStatus === 'dislike'
                                  ? 'text-red-500 bg-red-500/20'
                                  : 'text-gray-400 hover:text-red-500 hover:bg-red-500/10'
                                }`}
                            >
                              <ThumbsDown className="h-4 w-4" />
                              <span className="text-sm">{comment.dislikes}</span>
                            </button>
                            <button
                              onClick={() => {
                                if (replyingTo === comment.id) {
                                  setReplyingTo(null);
                                  setReplyContent('');
                                } else {
                                  setReplyingTo(comment.id);
                                  setReplyContent(`@${comment.user.name} `);
                                }
                              }}
                              className="text-gray-400 hover:text-white transition-colors flex items-center space-x-1"
                            >
                              <MessageCircle className="h-4 w-4" />
                              <span className="text-sm">Trả lời</span>
                            </button>
                          </div>

                          {/* Reply Form */}
                          {replyingTo === comment.id && (
                            <div className="mt-4 bg-white/5 rounded-lg p-4">
                              <div className="flex items-start space-x-3">
                                <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center">
                                  {user?.avatar ? (
                                    <img
                                      src={user.avatar}
                                      alt={user.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-sm">
                                      {user?.name?.charAt(0) || 'U'}
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="relative">
                                    <textarea
                                      value={replyContent}
                                      onChange={(e) => handleReplyContentChange(e.target.value)}
                                      placeholder="Viết trả lời..."
                                      className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      rows={2}
                                    />
                                  </div>
                                  {/* Reply Media Upload */}
                                  <div className="flex items-center space-x-2 mt-2">
                                    <label className="cursor-pointer">
                                      <input
                                        type="file"
                                        accept="image/*,video/*"
                                        multiple
                                        onChange={(e) => setCommentMedia(Array.from(e.target.files || []))}
                                        className="hidden"
                                      />
                                      <div className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors">
                                        <Image className="h-4 w-4" />
                                        <span className="text-sm">Ảnh/Video</span>
                                      </div>
                                    </label>
                                    {commentMedia.length > 0 && (
                                      <div className="text-xs text-gray-500">
                                        {commentMedia.length} file(s) đã chọn
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-end space-x-2 mt-2">
                                    <button
                                      onClick={() => {
                                        setReplyingTo(null);
                                        setReplyContent('');
                                        setCommentMedia([]);
                                      }}
                                      className="px-3 py-1 text-gray-400 hover:text-white transition-colors text-sm"
                                    >
                                      Hủy
                                    </button>
                                    <button
                                      onClick={() => handleSubmitReply(comment.id)}
                                      disabled={!replyContent.trim()}
                                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1 rounded-lg transition-colors text-sm"
                                    >
                                      Trả lời
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Replies */}
                          {comment.replies && comment.replies.length > 0 && (
                            <div className="mt-4 space-y-3">
                              {comment.replies.map((reply) => (
                                <div key={reply.id} className="bg-white/5 rounded-lg p-4 ml-4">
                                  <div className="flex items-start space-x-3">
                                    <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center">
                                      {reply.user.avatar ? (
                                        <img
                                          src={reply.user.avatar}
                                          alt={reply.user.name}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold text-sm">
                                          {reply.user.name.charAt(0)}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center space-x-2">
                                          <span className="text-white font-semibold text-sm">{reply.user.name}</span>
                                          <span className="text-gray-400 text-xs">
                                            {new Date(reply.createdAt).toLocaleDateString('vi-VN')}
                                          </span>
                                          {reply.isEdited && (
                                            <span className="text-gray-500 text-xs">(đã chỉnh sửa)</span>
                                          )}
                                        </div>

                                        {/* Reply Menu - chỉ hiện cho user sở hữu reply */}
                                        {user && Number(user.id) === Number(reply.user.id) && (
                                          <div className="relative reply-menu">
                                            <button
                                              onClick={() => setOpenReplyMenu(openReplyMenu === reply.id ? null : reply.id)}
                                              className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                                            >
                                              <MoreVertical className="h-3 w-3" />
                                            </button>

                                            {/* Dropdown Menu */}
                                            {openReplyMenu === reply.id && (
                                              <div className="absolute right-0 top-6 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-10 min-w-[100px]">
                                                <button
                                                  onClick={() => startEditReply(reply)}
                                                  className="w-full px-3 py-2 text-left text-xs text-gray-300 hover:bg-gray-700 hover:text-white transition-colors flex items-center space-x-2"
                                                >
                                                  <Edit className="h-3 w-3" />
                                                  <span>Sửa</span>
                                                </button>
                                                <button
                                                  onClick={() => handleDeleteReply(reply.id)}
                                                  className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors flex items-center space-x-2"
                                                >
                                                  <Trash2 className="h-3 w-3" />
                                                  <span>Xóa</span>
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>

                                      {/* Reply Content - Edit Mode or Display Mode */}
                                      {editingReply === reply.id ? (
                                        <div className="mb-2">
                                          <textarea
                                            value={editReplyContent}
                                            onChange={(e) => setEditReplyContent(e.target.value)}
                                            className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                            rows={2}
                                          />

                                          {/* Old Reply Media with Delete Button */}
                                          {editReplyOldMedia.length > 0 && (
                                            <div className="mt-1">
                                              <div className="text-xs text-gray-400 mb-1">Ảnh/Video hiện tại:</div>
                                              <div className="grid grid-cols-2 gap-1">
                                                {editReplyOldMedia.map((media) => (
                                                  <div key={media.id} className="relative group">
                                                    {media.mediaType === 'image' ? (
                                                      <img
                                                        src={media.mediaUrl}
                                                        alt="Media"
                                                        className="w-full h-16 object-cover rounded cursor-pointer hover:opacity-90 transition-opacity"
                                                        onClick={() => openImageModal(media.mediaUrl)}
                                                      />
                                                    ) : (
                                                      <video
                                                        src={media.mediaUrl}
                                                        className="w-full h-16 object-cover rounded"
                                                        controls={false}
                                                      />
                                                    )}
                                                    <button
                                                      onClick={() => handleDeleteOldReplyMedia(media.id)}
                                                      className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                      <X className="h-2 w-2" />
                                                    </button>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {/* Edit Reply Media Upload */}
                                          <div className="flex items-center space-x-2 mt-1">
                                            <label className="cursor-pointer">
                                              <input
                                                type="file"
                                                accept="image/*,video/*"
                                                multiple
                                                onChange={(e) => setEditReplyMedia(Array.from(e.target.files || []))}
                                                className="hidden"
                                              />
                                              <div className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors">
                                                <Image className="h-3 w-3" />
                                                <span className="text-xs">Thêm ảnh/Video mới</span>
                                              </div>
                                            </label>
                                            {editReplyMedia.length > 0 && (
                                              <div className="text-xs text-gray-500">
                                                {editReplyMedia.length} file(s) đã chọn
                                              </div>
                                            )}
                                          </div>

                                          <div className="flex items-center justify-end space-x-2 mt-1">
                                            <button
                                              onClick={() => {
                                                setEditingReply(null);
                                                setEditReplyContent('');
                                                setEditReplyMedia([]);
                                                setEditReplyOldMedia([]);
                                                setEditReplyMediaToDelete([]);
                                              }}
                                              className="px-2 py-1 text-gray-400 hover:text-white transition-colors text-xs"
                                            >
                                              Hủy
                                            </button>
                                            <button
                                              onClick={() => handleEditReply(reply.id)}
                                              disabled={!editReplyContent.trim()}
                                              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-2 py-1 rounded-lg transition-colors text-xs"
                                            >
                                              Lưu
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-gray-200 text-sm mb-2">{renderContentWithTags(reply.content, comment.id)}</p>
                                      )}

                                      {/* Reply Media */}
                                      {reply.media && reply.media.length > 0 && (
                                        <div className="grid grid-cols-2 gap-2 mb-2">
                                          {reply.media.map((media) => (
                                            <div key={media.id} className="rounded-lg overflow-hidden">
                                              {media.mediaType === 'image' ? (
                                                <img
                                                  src={media.mediaUrl}
                                                  alt="Reply media"
                                                  className="w-full h-24 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                                  onClick={() => openImageModal(media.mediaUrl)}
                                                />
                                              ) : (
                                                <video
                                                  src={media.mediaUrl}
                                                  className="w-full h-24 object-cover"
                                                  controls
                                                />
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      <div className="flex items-center space-x-3">
                                        <button
                                          onClick={() => handleReplyLike(reply.id, true)}
                                          className={`flex items-center space-x-1 transition-colors rounded-lg px-2 py-1 ${reply.userLikeStatus === 'like'
                                              ? 'text-blue-500 bg-blue-500/20'
                                              : 'text-gray-400 hover:text-blue-500 hover:bg-blue-500/10'
                                            }`}
                                        >
                                          <ThumbsUp className="h-3 w-3" />
                                          <span className="text-xs">{reply.likes}</span>
                                        </button>
                                        <button
                                          onClick={() => handleReplyLike(reply.id, false)}
                                          className={`flex items-center space-x-1 transition-colors rounded-lg px-2 py-1 ${reply.userLikeStatus === 'dislike'
                                              ? 'text-red-500 bg-red-500/20'
                                              : 'text-gray-400 hover:text-red-500 hover:bg-red-500/10'
                                            }`}
                                        >
                                          <ThumbsDown className="h-3 w-3" />
                                          <span className="text-xs">{reply.dislikes}</span>
                                        </button>
                                        <button
                                          onClick={() => {
                                            setReplyingTo(reply.id);
                                            setReplyContent(`@${reply.user.name} `);
                                          }}
                                          className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors"
                                        >
                                          <MessageCircle className="h-3 w-3" />
                                          <span className="text-xs">Trả lời</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {showComments && comments.length === 0 && !isLoadingComments && (
                  <div className="text-center py-8">
                    <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">Chưa có bình luận nào. Hãy là người đầu tiên bình luận!</p>
                  </div>
                )}

                {/* Load More Button */}
                {showComments && hasMoreComments && !isLoadingComments && comments.length > 0 && (
                  <div className="text-center py-4">
                    <button
                      onClick={() => fetchComments(false, true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors duration-200"
                    >
                      Tải thêm bình luận
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Banner Quảng Cáo 2 - Sau Bình Luận */}
            <div className="mt-8 mb-8">
              <MovieBanner
                type="MOVIE_BANNER_2"
                className="w-full h-32 rounded-xl shadow-2xl"
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="hidden xl:block xl:col-span-1">
            {/* Banner Quảng Cáo */}
            <div className="mb-6">
              {(() => {
                // Tìm banner quảng cáo overlay cho phim này
                const bannerAd = ads.find(ad => ad.type === 'OVERLAY' && ad.movieId === movie.id);

                if (bannerAd) {
                  return (
                    <div
                      className="w-full h-48 rounded-xl shadow-2xl border-2 border-white/20 overflow-hidden relative group cursor-pointer"
                      onClick={() => {
                        // Tăng view cho banner ad
                        incrementOverlayView(bannerAd.id);

                        if (bannerAd.linkUrl) {
                          window.open(bannerAd.linkUrl, '_blank');
                        }
                      }}
                    >
                      <video
                        src={bannerAd.videoUrl}
                        className="w-full h-full object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                        onError={(e) => {
                          // Fallback to image if video fails
                          const videoElement = e.target as HTMLVideoElement;
                          const img = document.createElement('img');
                          img.src = bannerAd.videoUrl;
                          img.className = 'w-full h-full object-cover';
                          img.alt = 'Banner quảng cáo';
                          videoElement.parentNode?.replaceChild(img, videoElement);
                        }}
                      />
                    </div>
                  );
                }

                // Fallback banner nếu không có quảng cáo
                return (
                  <div
                    className="w-full h-48 bg-gradient-to-br from-red-500/20 to-pink-600/20 rounded-xl shadow-2xl border-2 border-white/20 overflow-hidden relative group cursor-pointer"
                    onClick={() => {
                      // Có thể thêm logic tăng view cho banner mặc định nếu cần
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500 via-pink-500 to-purple-600 opacity-80"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center text-white">
                        <div className="text-4xl mb-2">🎬</div>
                        <div className="text-lg font-bold">Đã có quảng cáo</div>
                        <div className="text-sm opacity-80">có quảng cáo</div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-white/10 space-y-6">
              <div>
                <h4 className="text-white font-bold mb-4 flex items-center text-lg">
                  <Film className="h-5 w-5 text-red-500 mr-2" />Thông tin phim
                </h4>
                <div className="space-y-4">
                  {/* Năm phát hành */}
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">Năm phát hành</span>
                      <span className="text-white font-semibold">{movie.releaseYear}</span>
                    </div>
                  </div>

                  {/* Lượt xem */}
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">Lượt xem</span>
                      <span className="text-white font-semibold">{(movie.views || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Đánh giá sao */}
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">Đánh giá</span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => {
                            const ratingInStars = averageRating; // Use averageRating directly as 5-star scale
                            const isFilled = star <= ratingInStars;
                            const isHalfFilled = star - 0.5 <= ratingInStars && star > ratingInStars;

                            return (
                              <div key={star} className="relative">
                                <Star
                                  className={`h-4 w-4 ${isFilled
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
                        <span className="text-white font-semibold">
                          {averageRating > 0 ? averageRating.toFixed(1) : 'Chưa có đánh giá'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Lượt thích */}
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">Lượt thích</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">❤️</span>
                        <span className="text-white font-semibold">
                          {likeCount >= 1000 ? `${(likeCount / 1000).toFixed(1)}K` : likeCount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Nút yêu thích */}
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                    {isLiked ? (
                      // Đã yêu thích - hiển thị nút bỏ yêu thích
                      <button
                        onClick={handleLike}
                        className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 rounded-xl py-3 px-4 transition-all duration-200 hover:scale-105 relative group"
                        title="Bỏ yêu thích"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-xl">❤️</span>
                          <span className="text-sm font-medium">Đã yêu thích</span>
                        </div>
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                          Nhấn để bỏ yêu thích
                        </div>
                      </button>
                    ) : (
                      // Chưa yêu thích - hiển thị nút thêm vào danh sách yêu thích
                      <button
                        onClick={handleLike}
                        className={`w-full rounded-xl py-3 px-4 transition-all duration-200 hover:scale-105 relative group ${!user
                          ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 hover:text-yellow-300 border border-yellow-500/30 hover:border-yellow-500/50 animate-pulse'
                          : 'bg-gray-500/20 hover:bg-red-500/20 text-gray-300 hover:text-red-400 border border-gray-500/30 hover:border-red-500/30'
                          }`}
                        title={!user ? 'Đăng nhập để yêu thích' : 'Thêm vào danh sách yêu thích'}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-xl">
                            {!user ? '⭐' : '❤️'}
                          </span>
                          <span className="text-sm font-medium">
                            {!user ? 'Đăng nhập để thêm vào danh sách yêu thích' : 'Thêm vào danh sách yêu thích'}
                          </span>
                        </div>
                      </button>
                    )}
                  </div>

                  {/* Danh mục phim */}
                  {movie.genres && movie.genres.length > 0 && (
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                      <h4 className="text-white font-bold mb-3 flex items-center text-sm">
                        <span className="text-red-500 mr-2"></span>Tag
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {movie.genres.map((genreItem, index) => (
                          <span
                            key={index}
                            className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs font-medium border border-red-500/30"
                          >
                            {genreItem.genre.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Banner Quảng Cáo 3 - Dưới Thông Tin Phim */}
                  <MovieBanner
                    type="MOVIE_BANNER_3"
                    className="w-full h-48 rounded-xl shadow-2xl"
                  />


                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Suggested Videos */}
      <SuggestedVideos
        currentMovieId={movie?.id}
        currentMovieCategories={movie?.categories}
      />

      {/* Banner Quảng Cáo 4 - Cố Định */}
      <div className="fixed bottom-4 left-8 right-8 z-50">
        <MovieBanner
          type="MOVIE_BANNER_4"
          className="w-full h-24 rounded-xl shadow-2xl"
        />
      </div>

      {/* Image Zoom Modal */}
      {isImageModalOpen && selectedImage && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={closeImageModal}
              className="absolute -top-4 -right-4 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 z-10"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={selectedImage}
              alt="Zoomed image"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={closeImageModal}
            />
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
      />
    </div>
  );
};

export default MovieDetail;