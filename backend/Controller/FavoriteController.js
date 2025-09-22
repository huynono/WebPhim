const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ===== ADD TO FAVORITES =====
exports.addToFavorites = async (req, res) => {
  try {
    const { movieId } = req.params;
    const userId = req.userId; // Từ middleware auth

    if (!userId) {
      return res.status(401).json({ message: "Vui lòng đăng nhập để thêm vào yêu thích" });
    }

    const movieIdNum = Number(movieId);
    if (!movieIdNum) {
      return res.status(400).json({ message: "ID phim không hợp lệ" });
    }

    // Kiểm tra phim có tồn tại không
    const movie = await prisma.movie.findUnique({
      where: { id: movieIdNum },
      include: {
        categories: { include: { category: true } },
        genres: { include: { genre: true } },
        actors: { include: { actor: true } },
        episodes: true,
      }
    });

    if (!movie) {
      return res.status(404).json({ message: "Không tìm thấy phim" });
    }

    // Kiểm tra đã có trong favorites chưa
    const existingFavorite = await prisma.userFavorite.findUnique({
      where: {
        userId_movieId: {
          userId: userId,
          movieId: movieIdNum
        }
      }
    });

    if (existingFavorite) {
      return res.status(400).json({ message: "Phim đã có trong danh sách yêu thích" });
    }

    // Thêm vào favorites và tăng likes
    const favorite = await prisma.$transaction(async (tx) => {
      // Tạo favorite record
      const newFavorite = await tx.userFavorite.create({
        data: {
          userId: userId,
          movieId: movieIdNum
        }
      });

      // Tăng likes count
      await tx.movie.update({
        where: { id: movieIdNum },
        data: { likes: { increment: 1 } }
      });

      return newFavorite;
    });

    res.status(201).json({ 
      message: "Đã thêm vào danh sách yêu thích", 
      favorite: favorite 
    });

  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ===== REMOVE FROM FAVORITES =====
exports.removeFromFavorites = async (req, res) => {
  try {
    const { movieId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Vui lòng đăng nhập" });
    }

    const movieIdNum = Number(movieId);
    if (!movieIdNum) {
      return res.status(400).json({ message: "ID phim không hợp lệ" });
    }

    // Xóa khỏi favorites và giảm likes
    const result = await prisma.$transaction(async (tx) => {
      // Xóa favorite record
      const deleted = await tx.userFavorite.deleteMany({
        where: {
          userId: userId,
          movieId: movieIdNum
        }
      });

      if (deleted.count === 0) {
        throw new Error("Phim không có trong danh sách yêu thích");
      }

      // Giảm likes count
      await tx.movie.update({
        where: { id: movieIdNum },
        data: { likes: { decrement: 1 } }
      });

      return deleted;
    });

    res.status(200).json({ message: "Đã xóa khỏi danh sách yêu thích" });

  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ===== GET USER FAVORITES =====
exports.getUserFavorites = async (req, res) => {
  try {
    const userId = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;

    if (!userId) {
      return res.status(401).json({ message: "Vui lòng đăng nhập" });
    }

    const skip = (page - 1) * limit;

    // Lấy favorites với pagination
    const favorites = await prisma.userFavorite.findMany({
      where: { userId: userId },
      skip: skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        movie: {
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            posterUrl: true,
            backgroundUrl: true,
            releaseYear: true,
            country: true,
            status: true,
            type: true,
            views: true,
            likes: true,
            averageRating: true,
            totalRatings: true,
            createdAt: true,
            updatedAt: true,
            categories: { include: { category: true } },
            genres: { include: { genre: true } },
            actors: { include: { actor: true } },
            episodes: true,
          }
        }
      }
    });

    // Đếm tổng số favorites
    const totalFavorites = await prisma.userFavorite.count({
      where: { userId: userId }
    });

    const totalPages = Math.ceil(totalFavorites / limit);

    res.status(200).json({
      favorites: favorites.map(fav => fav.movie),
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalFavorites: totalFavorites,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit: limit
      }
    });

  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ===== CHECK IF MOVIE IS FAVORITE =====
exports.checkFavorite = async (req, res) => {
  try {
    const { movieId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(200).json({ isFavorite: false });
    }

    const movieIdNum = Number(movieId);
    if (!movieIdNum) {
      return res.status(400).json({ message: "ID phim không hợp lệ" });
    }

    const favorite = await prisma.userFavorite.findUnique({
      where: {
        userId_movieId: {
          userId: userId,
          movieId: movieIdNum
        }
      }
    });

    res.status(200).json({ isFavorite: !!favorite });

  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ===== GET FAVORITE COUNT FOR MOVIE =====
exports.getFavoriteCount = async (req, res) => {
  try {
    const { movieId } = req.params;
    const movieIdNum = Number(movieId);
    
    if (!movieIdNum) {
      return res.status(400).json({ message: "ID phim không hợp lệ" });
    }

    // Lấy thông tin phim bao gồm trường likes
    const movie = await prisma.movie.findUnique({
      where: { id: movieIdNum },
      select: { id: true, title: true, likes: true }
    });

    if (!movie) {
      return res.status(404).json({ message: "Không tìm thấy phim" });
    }

    res.status(200).json({ count: movie.likes });

  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};
