const { PrismaClient } = require("@prisma/client");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");
const prisma = new PrismaClient();

// ===== Cloudinary config =====
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ===== Helper =====
const ensureUploadDir = () => {
  const uploadDir = path.join(__dirname, "../uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
};

// Upload file to Cloudinary
const uploadToCloudinary = (filePath, folder, isVideo = false) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      filePath,
      { folder, resource_type: isVideo ? "video" : "image" },
      (err, result) => {
        fs.unlink(filePath, () => { }); // Xóa tạm file
        if (err) return reject(err);
        resolve(result);
      }
    );
  });

// ===== SUBMIT RATING =====
exports.submitRating = async (req, res) => {
  try {
    ensureUploadDir();
    
    const { movieId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.userId; // Từ middleware auth

    if (!userId) {
      return res.status(401).json({ message: "Vui lòng đăng nhập để đánh giá" });
    }

    const movieIdNum = Number(movieId);
    if (!movieIdNum || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "ID phim hoặc đánh giá không hợp lệ" });
    }

    // Kiểm tra phim có tồn tại không
    const movie = await prisma.movie.findUnique({
      where: { id: movieIdNum }
    });

    if (!movie) {
      return res.status(404).json({ message: "Không tìm thấy phim" });
    }

    // Kiểm tra user đã đánh giá chưa
    const existingRating = await prisma.movieRating.findUnique({
      where: {
        userId_movieId: {
          userId: userId,
          movieId: movieIdNum
        }
      }
    });

    let result;
    if (existingRating) {
      // Cập nhật đánh giá cũ
      result = await prisma.$transaction(async (tx) => {
        // Cập nhật rating
        const updatedRating = await tx.movieRating.update({
          where: {
            userId_movieId: {
              userId: userId,
              movieId: movieIdNum
            }
          },
          data: { rating: rating }
        });

        // Tính lại average rating
        await calculateAverageRating(tx, movieIdNum);

        return updatedRating;
      });
    } else {
      // Tạo đánh giá mới
      result = await prisma.$transaction(async (tx) => {
        // Tạo rating mới
        const newRating = await tx.movieRating.create({
          data: {
            userId: userId,
            movieId: movieIdNum,
            rating: rating
          }
        });

        // Tính lại average rating
        await calculateAverageRating(tx, movieIdNum);

        return newRating;
      });
    }

    // Xử lý upload media nếu có
    let mediaUrls = [];
    if (req.files && req.files.length > 0) {
      try {
        // Upload từng file lên Cloudinary
        for (const file of req.files) {
          const isVideo = file.mimetype.startsWith('video/');
          const folder = `ratings/${movieIdNum}`;
          
          const cloudinaryResult = await uploadToCloudinary(file.path, folder, isVideo);
          mediaUrls.push({
            url: cloudinaryResult.secure_url,
            type: isVideo ? 'video' : 'image',
            publicId: cloudinaryResult.public_id
          });
        }

        // Lưu media URLs vào database (nếu cần)
        // Có thể tạo bảng RatingMedia riêng hoặc lưu JSON vào rating
        if (mediaUrls.length > 0) {
          await prisma.movieRating.update({
            where: { id: result.id },
            data: { 
              // Có thể thêm trường mediaUrls vào schema nếu cần
              // mediaUrls: JSON.stringify(mediaUrls)
            }
          });
        }
      } catch (uploadError) {
        console.error("Error uploading media:", uploadError);
        // Không fail toàn bộ request nếu upload media lỗi
      }
    }

    // Tạo comment nếu có
    let commentResult = null;
    if (comment && comment.trim()) {
      try {
        commentResult = await prisma.comment.create({
          data: {
            userId: userId,
            movieId: movieIdNum,
            content: comment.trim()
          }
        });

        // Upload media cho comment nếu có
        if (mediaUrls.length > 0) {
          for (const media of mediaUrls) {
            await prisma.commentMedia.create({
              data: {
                commentId: commentResult.id,
                mediaUrl: media.url,
                mediaType: media.type
              }
            });
          }
        }
      } catch (commentError) {
        console.error("Error creating comment:", commentError);
      }
    }

    res.status(200).json({ 
      message: existingRating ? "Đã cập nhật đánh giá" : "Đã gửi đánh giá thành công",
      rating: result,
      comment: commentResult,
      media: mediaUrls
    });

  } catch (err) {
    console.error("Error submitting rating:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ===== GET MOVIE RATINGS =====
exports.getMovieRatings = async (req, res) => {
  try {
    const { movieId } = req.params;
    const userId = req.userId; // Có thể null nếu chưa đăng nhập

    const movieIdNum = Number(movieId);
    if (!movieIdNum) {
      return res.status(400).json({ message: "ID phim không hợp lệ" });
    }

    // Kiểm tra phim có tồn tại không
    const movie = await prisma.movie.findUnique({
      where: { id: movieIdNum },
      select: { 
        id: true, 
        title: true, 
        averageRating: true, 
        totalRatings: true 
      }
    });

    if (!movie) {
      return res.status(404).json({ message: "Không tìm thấy phim" });
    }

    // Lấy đánh giá của user hiện tại (nếu đã đăng nhập)
    let userRating = null;
    if (userId) {
      const userRatingData = await prisma.movieRating.findUnique({
        where: {
          userId_movieId: {
            userId: userId,
            movieId: movieIdNum
          }
        },
        select: { rating: true }
      });
      userRating = userRatingData?.rating || 0;
    }
    
    console.log('getMovieRatings - userId:', userId, 'userRating:', userRating); // Debug log

    // Lấy phân bố rating (1-5 sao)
    const ratingDistribution = await prisma.movieRating.groupBy({
      by: ['rating'],
      where: { movieId: movieIdNum },
      _count: { rating: true }
    });

    // Chuyển đổi thành object dễ sử dụng
    const distribution = {};
    for (let i = 1; i <= 5; i++) {
      distribution[i] = 0;
    }
    ratingDistribution.forEach(item => {
      distribution[item.rating] = item._count.rating;
    });

    res.status(200).json({
      averageRating: movie.averageRating || 0,
      totalRatings: movie.totalRatings || 0,
      userRating: userRating,
      distribution: distribution,
      movie: {
        id: movie.id,
        title: movie.title
      }
    });

  } catch (err) {
    console.error("Error getting movie ratings:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ===== GET USER RATINGS =====
exports.getUserRatings = async (req, res) => {
  try {
    const userId = req.userId; // Từ middleware auth

    if (!userId) {
      return res.status(401).json({ message: "Vui lòng đăng nhập" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const ratings = await prisma.movieRating.findMany({
      where: { userId: userId },
      skip: skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        movie: {
          select: {
            id: true,
            title: true,
            posterUrl: true,
            slug: true,
            releaseYear: true
          }
        }
      }
    });

    const totalRatings = await prisma.movieRating.count({
      where: { userId: userId }
    });

    const totalPages = Math.ceil(totalRatings / limit);

    res.status(200).json({
      ratings: ratings,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalRatings: totalRatings,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit: limit
      }
    });

  } catch (err) {
    console.error("Error getting user ratings:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ===== DELETE RATING =====
exports.deleteRating = async (req, res) => {
  try {
    const { movieId } = req.params;
    const userId = req.userId; // Từ middleware auth

    if (!userId) {
      return res.status(401).json({ message: "Vui lòng đăng nhập" });
    }

    const movieIdNum = Number(movieId);
    if (!movieIdNum) {
      return res.status(400).json({ message: "ID phim không hợp lệ" });
    }

    // Kiểm tra rating có tồn tại không
    const existingRating = await prisma.movieRating.findUnique({
      where: {
        userId_movieId: {
          userId: userId,
          movieId: movieIdNum
        }
      }
    });

    if (!existingRating) {
      return res.status(404).json({ message: "Không tìm thấy đánh giá" });
    }

    // Xóa rating và tính lại average
    await prisma.$transaction(async (tx) => {
      // Xóa rating
      await tx.movieRating.delete({
        where: {
          userId_movieId: {
            userId: userId,
            movieId: movieIdNum
          }
        }
      });

      // Tính lại average rating
      await calculateAverageRating(tx, movieIdNum);
    });

    res.status(200).json({ message: "Đã xóa đánh giá thành công" });

  } catch (err) {
    console.error("Error deleting rating:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ===== HELPER FUNCTION: CALCULATE AVERAGE RATING =====
const calculateAverageRating = async (tx, movieId) => {
  try {
    // Lấy tất cả ratings của phim
    const ratings = await tx.movieRating.findMany({
      where: { movieId: movieId },
      select: { rating: true }
    });

    if (ratings.length === 0) {
      // Nếu không có rating nào, set về 0
      await tx.movie.update({
        where: { id: movieId },
        data: {
          averageRating: 0,
          totalRatings: 0
        }
      });
    } else {
      // Tính average rating
      const totalRating = ratings.reduce((sum, rating) => sum + rating.rating, 0);
      const averageRating = totalRating / ratings.length;

      // Cập nhật movie
      await tx.movie.update({
        where: { id: movieId },
        data: {
          averageRating: Math.round(averageRating * 10) / 10, // Làm tròn 1 chữ số thập phân
          totalRatings: ratings.length
        }
      });
    }
  } catch (err) {
    console.error("Error calculating average rating:", err);
    throw err;
  }
};

// ===== GET TOP RATED MOVIES =====
exports.getTopRatedMovies = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const minRatings = parseInt(req.query.minRatings) || 5; // Tối thiểu 5 đánh giá

    const movies = await prisma.movie.findMany({
      where: {
        totalRatings: {
          gte: minRatings
        },
        isHidden: false // Chỉ lấy phim không ẩn
      },
      orderBy: [
        { averageRating: 'desc' },
        { totalRatings: 'desc' }
      ],
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        posterUrl: true,
        releaseYear: true,
        averageRating: true,
        totalRatings: true,
        views: true,
        likes: true
      }
    });

    res.status(200).json({
      movies: movies,
      total: movies.length
    });

  } catch (err) {
    console.error("Error getting top rated movies:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ===== UPLOAD RATING MEDIA =====
exports.uploadRatingMedia = async (req, res) => {
  try {
    ensureUploadDir();
    
    const { movieId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Vui lòng đăng nhập" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "Không có file nào được upload" });
    }

    const movieIdNum = Number(movieId);
    if (!movieIdNum) {
      return res.status(400).json({ message: "ID phim không hợp lệ" });
    }

    // Kiểm tra phim có tồn tại không
    const movie = await prisma.movie.findUnique({
      where: { id: movieIdNum }
    });

    if (!movie) {
      return res.status(404).json({ message: "Không tìm thấy phim" });
    }

    const mediaUrls = [];
    
    try {
      // Upload từng file lên Cloudinary
      for (const file of req.files) {
        const isVideo = file.mimetype.startsWith('video/');
        const folder = `ratings/${movieIdNum}/${userId}`;
        
        const cloudinaryResult = await uploadToCloudinary(file.path, folder, isVideo);
        mediaUrls.push({
          url: cloudinaryResult.secure_url,
          type: isVideo ? 'video' : 'image',
          publicId: cloudinaryResult.public_id,
          originalName: file.originalname,
          size: file.size
        });
      }

      res.status(200).json({
        message: "Upload media thành công",
        media: mediaUrls
      });

    } catch (uploadError) {
      console.error("Error uploading media:", uploadError);
      res.status(500).json({ message: "Lỗi upload media", error: uploadError.message });
    }

  } catch (err) {
    console.error("Error in uploadRatingMedia:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};
