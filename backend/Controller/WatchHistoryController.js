const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ===== SAVE WATCH PROGRESS =====
exports.saveWatchProgress = async (req, res) => {
  try {
    const { movieId, progress } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Vui lòng đăng nhập để lưu tiến độ xem" });
    }

    const movieIdNum = Number(movieId);
    const progressNum = Number(progress) || 0;

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

    // Tìm xem đã có watch history chưa (cho phim lẻ, episodeId = null)
    const existingHistory = await prisma.watchHistory.findFirst({
      where: {
        userId: userId,
        movieId: movieIdNum,
        episodeId: null
      }
    });

    let watchHistory;
    if (existingHistory) {
      // Cập nhật nếu đã có
      watchHistory = await prisma.watchHistory.update({
        where: { id: existingHistory.id },
        data: {
          progress: progressNum,
          updatedAt: new Date()
        },
        include: {
          movie: {
            include: {
              categories: { include: { category: true } },
              genres: { include: { genre: true } },
              actors: { include: { actor: true } },
              episodes: true,
            }
          },
          episode: true
        }
      });
    } else {
      // Tạo mới nếu chưa có
      watchHistory = await prisma.watchHistory.create({
        data: {
          userId: userId,
          movieId: movieIdNum,
          episodeId: null,
          progress: progressNum
        },
        include: {
          movie: {
            include: {
              categories: { include: { category: true } },
              genres: { include: { genre: true } },
              actors: { include: { actor: true } },
              episodes: true,
            }
          },
          episode: true
        }
      });
    }

    res.status(200).json({ 
      message: "Đã lưu tiến độ xem", 
      watchHistory: watchHistory 
    });

  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ===== GET WATCH HISTORY =====
exports.getWatchHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;

    if (!userId) {
      return res.status(401).json({ message: "Vui lòng đăng nhập" });
    }

    const skip = (page - 1) * limit;

    // Lấy watch history với pagination
    const watchHistory = await prisma.watchHistory.findMany({
      where: { userId: userId },
      skip: skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        movie: {
          include: {
            categories: { include: { category: true } },
            genres: { include: { genre: true } },
            actors: { include: { actor: true } },
            episodes: true,
          }
        },
        episode: true
      }
    });

    // Đếm tổng số watch history
    const totalHistory = await prisma.watchHistory.count({
      where: { userId: userId }
    });

    const totalPages = Math.ceil(totalHistory / limit);

    res.status(200).json({
      watchHistory: watchHistory,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalHistory: totalHistory,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit: limit
      }
    });

  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ===== GET CONTINUE WATCHING =====
exports.getContinueWatching = async (req, res) => {
  try {
    const userId = req.userId;
    const limit = parseInt(req.query.limit) || 6;

    if (!userId) {
      return res.status(401).json({ message: "Vui lòng đăng nhập" });
    }

    // Lấy các phim đã xem nhưng chưa xem hết (progress > 0 và < 90%)
    const continueWatching = await prisma.watchHistory.findMany({
      where: { 
        userId: userId,
        progress: {
          gt: 0,
          lt: 90 // Chưa xem hết 90%
        }
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        movie: {
          include: {
            categories: { include: { category: true } },
            genres: { include: { genre: true } },
            actors: { include: { actor: true } },
            episodes: true,
          }
        },
        episode: true
      }
    });

    res.status(200).json({
      continueWatching: continueWatching
    });

  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ===== GET WATCH PROGRESS FOR MOVIE =====
exports.getWatchProgress = async (req, res) => {
  try {
    const { movieId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(200).json({ progress: 0 });
    }

    const movieIdNum = Number(movieId);

    if (!movieIdNum) {
      return res.status(400).json({ message: "ID phim không hợp lệ" });
    }

    const watchHistory = await prisma.watchHistory.findFirst({
      where: {
        userId: userId,
        movieId: movieIdNum,
        episodeId: null
      }
    });

    res.status(200).json({ 
      progress: watchHistory?.progress || 0,
      lastWatched: watchHistory?.updatedAt || null
    });

  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ===== DELETE WATCH HISTORY =====
exports.deleteWatchHistory = async (req, res) => {
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

    const deleted = await prisma.watchHistory.deleteMany({
      where: {
        userId: userId,
        movieId: movieIdNum,
        episodeId: null
      }
    });

    if (deleted.count === 0) {
      return res.status(404).json({ message: "Không tìm thấy lịch sử xem" });
    }

    res.status(200).json({ message: "Đã xóa lịch sử xem" });

  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};
