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
      { folder, resource_type: isVideo ? "video" : "image" }, // quan trọng: video phải có resource_type
      (err, result) => {
        fs.unlink(filePath, () => { }); // Xóa tạm file
        if (err) return reject(err);
        resolve(result);
      }
    );
  });

const deleteFromCloudinary = async (url) => {
  if (!url) return;
  try {
    const publicId = url.split("/upload/")[1].split(".")[0];
    await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
  } catch (err) {
  }
};

// ===== CREATE MOVIE =====
// ===== Hàm parse chuỗi thành mảng số =====
exports.createMovie = async (req, res) => {
  try {
    ensureUploadDir();

    let {
      title,
      slug,
      description,
      categoryIds,
      type = "single", // single | series
      releaseYear,
      country,
      episodeTitle,
      genreIds,
      actorIds,
    } = req.body;

    if (!title || !country) {
      return res
        .status(400)
        .json({ message: "Tên phim và quốc gia là bắt buộc" });
    }

    // ===== Helper parse IDs =====
    const parseIds = (ids) => {
      if (!ids) return [];
      if (Array.isArray(ids)) return ids.map((id) => Number(id));
      if (typeof ids === "string") {
        try {
          const parsed = JSON.parse(ids);
          if (Array.isArray(parsed)) return parsed.map((id) => Number(id));
          return [Number(parsed)]; // client gửi "5"
        } catch {
          return ids.split(",").map((id) => Number(id.trim())); // client gửi "1,2,3"
        }
      }
      return [];
    };

    const parsedCategoryIds = parseIds(categoryIds) || [];
    const parsedGenreIds = parseIds(genreIds) || [];
    const parsedActorIds = parseIds(actorIds) || [];


    // Slug
    let finalSlug = slug?.trim() || title.toLowerCase().replace(/\s+/g, "-");
    const exists = await prisma.movie.findFirst({ where: { slug: finalSlug } });
    if (exists) finalSlug = finalSlug + "-" + Date.now();

    // Poster
    let posterUrl = null;
    if (req.files?.poster?.length) {
      const filePath = req.files.poster[0].path;
      const result = await uploadToCloudinary(filePath, "movies/posters");
      posterUrl = result.secure_url;
    }

    // Background
    let backgroundUrl = null;
    if (req.files?.background?.length) {
      const filePath = req.files.background[0].path;
      const result = await uploadToCloudinary(filePath, "movies/backgrounds");
      backgroundUrl = result.secure_url;
    }

    // ===== Status tự set =====
    const status = type === "single" ? "completed" : "ongoing";

    // Tạo Movie
    const movie = await prisma.movie.create({
      data: {
        title,
        slug: finalSlug,
        description,
        type,
        status, // auto set
        releaseYear: releaseYear ? Number(releaseYear) : null,
        country,
        posterUrl,
        backgroundUrl,
      },
    });

    // Categories
    if (parsedCategoryIds.length) {
      await prisma.categoryOnMovie.createMany({
        data: parsedCategoryIds.map((cid) => ({
          movieId: movie.id,
          categoryId: cid,
        })),
        skipDuplicates: true,
      });
    }

    // Genres
    if (parsedGenreIds.length) {
      await prisma.genreOnMovie.createMany({
        data: parsedGenreIds.map((gid) => ({
          movieId: movie.id,
          genreId: gid,
        })),
        skipDuplicates: true,
      });
    }

    // Actors
    if (parsedActorIds.length) {
      await prisma.actorOnMovie.createMany({
        data: parsedActorIds.map((aid) => ({
          movieId: movie.id,
          actorId: aid,
        })),
        skipDuplicates: true,
      });
    }

    // Upload video nếu phim lẻ
    if (req.files?.video?.length && type === "single") {
      const filePath = req.files.video[0].path;
      const videoResult = await uploadToCloudinary(
        filePath,
        "movies/videos",
        true // isVideo = true
      );
      await prisma.episode.create({
        data: {
          title: episodeTitle?.trim() || title,
          videoUrl: videoResult.secure_url,
          movieId: movie.id,
        },
      });
    }

    // Lấy movie đầy đủ thông tin
    const fullMovie = await prisma.movie.findUnique({
      where: { id: movie.id },
      include: {
        categories: { include: { category: true } },
        genres: { include: { genre: true } },
        actors: { include: { actor: true } },
        episodes: true,
      },
    });

    res.status(201).json({ message: "Tạo phim thành công", movie: fullMovie });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};




// ===== UPDATE MOVIE =====
exports.updateMovie = async (req, res) => {
  try {
    ensureUploadDir();

    const { id } = req.params;
    let {
      title,
      slug,
      description,
      categoryIds,
      type,
      releaseYear,
      country,
      genreIds, // Thêm
      actorIds, // Thêm
    } = req.body;
    const movieId = Number(id);

    const movie = await prisma.movie.findUnique({ where: { id: movieId } });
    if (!movie) return res.status(404).json({ message: "Không tìm thấy phim" });

    const updateData = {};
    if (title) updateData.title = title;
    if (slug) updateData.slug = slug;
    if (description) updateData.description = description;
    if (type) updateData.type = type;
    if (releaseYear) updateData.releaseYear = Number(releaseYear);
    if (country) updateData.country = country;

    // Poster
    if (req.files?.poster?.length) {
      if (movie.posterUrl) await deleteFromCloudinary(movie.posterUrl);
      const filePath = req.files.poster[0].path;
      const result = await uploadToCloudinary(filePath, "movies/posters");
      updateData.posterUrl = result.secure_url;
    }

    // Background
    if (req.files?.background?.length) {
      if (movie.backgroundUrl) await deleteFromCloudinary(movie.backgroundUrl);
      const filePath = req.files.background[0].path;
      const result = await uploadToCloudinary(filePath, "movies/backgrounds");
      updateData.backgroundUrl = result.secure_url;
    }

    // Video
    if (req.files?.video?.length && type === "single") {
      const oldEpisode = await prisma.episode.findFirst({ where: { movieId }, orderBy: { id: "desc" } });
      if (oldEpisode?.videoUrl) await deleteFromCloudinary(oldEpisode.videoUrl);

      const filePath = req.files.video[0].path;
      const videoResult = await uploadToCloudinary(filePath, "movies/videos", true);
      await prisma.episode.update({
        where: { id: oldEpisode.id },
        data: { videoUrl: videoResult.secure_url },
      });
    }

    // ===== Cập nhật Genres và Actors =====
    const parseIds = (ids) => {
      if (!ids) return [];
      if (Array.isArray(ids)) return ids.map(id => Number(id));
      if (typeof ids === 'string') {
        try {
          const parsed = JSON.parse(ids);
          return Array.isArray(parsed) ? parsed.map(id => Number(id)) : [Number(parsed)];
        } catch {
          return ids.split(',').map(id => Number(id.trim()));
        }
      }
      return [];
    };

    const parsedCategoryIds = parseIds(categoryIds) || [];
    const parsedGenreIds = parseIds(genreIds) || [];
    const parsedActorIds = parseIds(actorIds) || [];


    // Tất cả operations trong một transaction duy nhất
    const updatedMovie = await prisma.$transaction(async (tx) => {
      // 1. Update movie data trước
      const updatedMovie = await tx.movie.update({
        where: { id: movieId },
        data: updateData,
      });

      // 2. Xóa tất cả relationships cũ
      await tx.categoryOnMovie.deleteMany({ where: { movieId } });
      await tx.genreOnMovie.deleteMany({ where: { movieId } });
      await tx.actorOnMovie.deleteMany({ where: { movieId } });

      // 3. Thêm relationships mới nếu có
      if (parsedCategoryIds.length > 0) {
        await tx.categoryOnMovie.createMany({
          data: parsedCategoryIds.map(cid => ({ movieId, categoryId: cid })),
          skipDuplicates: true,
        });
      }

      if (parsedGenreIds.length > 0) {
        await tx.genreOnMovie.createMany({
          data: parsedGenreIds.map(gid => ({ movieId, genreId: gid })),
          skipDuplicates: true,
        });
      }

      if (parsedActorIds.length > 0) {
        await tx.actorOnMovie.createMany({
          data: parsedActorIds.map(aid => ({ movieId, actorId: aid })),
          skipDuplicates: true,
        });
      }

      // 4. Lấy movie với đầy đủ relationships
      return await tx.movie.findUnique({
        where: { id: movieId },
        include: {
          categories: { include: { category: true } },
          genres: { include: { genre: true } },
          actors: { include: { actor: true } },
          episodes: true,
        },
      });
    });

    res.status(200).json({ message: "Cập nhật phim thành công", movie: updatedMovie });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};


// ===== GET ALL MOVIES =====
exports.getAllMovies = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const hideFromPublic = req.query.hideFromPublic === 'true'; // Query param để ẩn phim khỏi giao diện public
    const isAdmin = req.query.isAdmin === 'true'; // Query param để phân biệt admin panel
    const customLimit = parseInt(req.query.limit); // Query param để custom limit từ frontend
    const categorySlug = req.query.category; // Query param để lọc theo category
    const searchQuery = req.query.search; // Query param để tìm kiếm
    const country = req.query.country; // Query param để lọc theo quốc gia
    const sortBy = req.query.sortBy; // Query param để sắp xếp
    const minRating = parseFloat(req.query.minRating); // Query param để lọc theo đánh giá tối thiểu
    
    // Điều chỉnh limit dựa trên giao diện
    let limit;
    if (customLimit) {
      limit = customLimit; // Ưu tiên limit từ frontend
    } else if (isAdmin) {
      limit = 4; // Admin panel: 4 phim trên 1 trang
    } else if (hideFromPublic) {
      limit = 6; // Giao diện public (trending): 6 phim trên 1 trang
    } else {
      limit = 7; // Mặc định: 7 phim trên 1 trang
    }
    
    const skip = (page - 1) * limit;

    // Build where clause
    let whereClause = {};
    
    // Nếu hideFromPublic = true (giao diện public), chỉ lấy phim không ẩn
    if (hideFromPublic) {
      whereClause.isHidden = false;
    }

    // Add search filter
    if (searchQuery && searchQuery.trim()) {
      whereClause.title = {
        contains: searchQuery.trim()
      };
    }

    // Add category filter
    if (categorySlug && categorySlug !== 'all') {
      whereClause.categories = {
        some: {
          category: {
            slug: categorySlug
          }
        }
      };
    }

    // Add country filter
    if (country && country !== 'all') {
      whereClause.country = country;
    }

    // Add rating filter
    if (minRating && minRating > 0) {
      whereClause.averageRating = {
        gte: minRating
      };
    }

    const totalMovies = await prisma.movie.count({ where: whereClause });
    const totalPages = Math.ceil(totalMovies / limit);

    // Build orderBy clause
    let orderBy = { createdAt: 'desc' }; // Default sorting
    
    if (sortBy) {
      switch (sortBy) {
        case 'newest':
          orderBy = { createdAt: 'desc' };
          break;
        case 'oldest':
          orderBy = { createdAt: 'asc' };
          break;
        case 'most_viewed':
          orderBy = { views: 'desc' };
          break;
        case 'most_liked':
          orderBy = { likes: 'desc' };
          break;
        case 'highest_rated':
          orderBy = { averageRating: 'desc' };
          break;
        case 'lowest_rated':
          orderBy = { averageRating: 'asc' };
          break;
        default:
          orderBy = { createdAt: 'desc' };
      }
    }

    const movies = await prisma.movie.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        title: true,
        slug: true,
        posterUrl: true,
        backgroundUrl: true,
        releaseYear: true,
        country: true,
        status: true,
        type: true,
        views: true,
        likes: true,
        isHidden: true,
        averageRating: true,
        totalRatings: true,
        createdAt: true,
        categories: {
          include: {
            category: true,
          },
        },
        genres: {
          include: {
            genre: true,
          },
        },
        actors: {
          include: {
            actor: true,
          },
        },
        episodes: true,
        ads: true,
      },
    });

    res.status(200).json({
      movies,
      pagination: {
        currentPage: page,
        totalPages,
        totalMovies,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit
      }
    });
  } catch (err) {
    res.status(500).json({
      message: "Lỗi server",
      error: err.message,
    });
  }
};


exports.deleteMovie = async (req, res) => {
  try {
    const { id } = req.params;
    const movieId = Number(id);

    // Xoá liên kết categories
    await prisma.categoryOnMovie.deleteMany({
      where: { movieId }
    });

    // Xoá liên kết genres
    await prisma.genreOnMovie.deleteMany({
      where: { movieId }
    });

    // Xoá liên kết actors
    await prisma.actorOnMovie.deleteMany({
      where: { movieId }
    });

    // Xoá episodes
    await prisma.episode.deleteMany({
      where: { movieId }
    });

    // Xoá ads
    await prisma.adBanner.deleteMany({
      where: { movieId }
    });

    // Cuối cùng xoá movie
    await prisma.movie.delete({
      where: { id: movieId }
    });

    res.status(200).json({ message: "Xoá phim thành công" });
  } catch (err) {
    res.status(500).json({
      message: "Lỗi server",
      error: err.message,
    });
  }
};





exports.incrementView = async (req, res) => {
  try {
    const movieId = Number(req.params.id);
    const movie = await prisma.movie.update({
      where: { id: movieId },
      data: { views: { increment: 1 } } // tăng 1 lượt view
    });
    res.status(200).json({ views: movie.views });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};


// ===== GET MOVIE BY SLUG =====
exports.getMovieBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug) return res.status(400).json({ message: "Slug là bắt buộc" });

    const movie = await prisma.movie.findUnique({
      where: { slug },
      include: {
        categories: { include: { category: true } },
        genres: { include: { genre: true } },
        actors: { include: { actor: true } },
        episodes: true,
        ads: true,
      },
    });

    if (!movie) return res.status(404).json({ message: "Không tìm thấy phim với slug này" });

    res.status(200).json(movie);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ===== TOGGLE HIDDEN STATUS =====
exports.toggleHidden = async (req, res) => {
  try {
    const { id } = req.params;
    const movieId = Number(id);

    const movie = await prisma.movie.findUnique({ where: { id: movieId } });
    if (!movie) return res.status(404).json({ message: "Không tìm thấy phim" });

    const updatedMovie = await prisma.movie.update({
      where: { id: movieId },
      data: { isHidden: !movie.isHidden },
      include: {
        categories: { include: { category: true } },
        genres: { include: { genre: true } },
        actors: { include: { actor: true } },
        episodes: true,
        ads: true,
      },
    });

    res.status(200).json({ 
      message: `Phim đã được ${updatedMovie.isHidden ? 'ẩn' : 'hiện'}`, 
      movie: updatedMovie 
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ===== COPY MOVIE =====
exports.copyMovie = async (req, res) => {
  try {
    const { id } = req.params;
    const movieId = Number(id);

    // Lấy phim gốc
    const originalMovie = await prisma.movie.findUnique({
      where: { id: movieId },
      include: {
        categories: { include: { category: true } },
        genres: { include: { genre: true } },
        actors: { include: { actor: true } },
        episodes: true,
        // Không include ads - không copy quảng cáo
      },
    });

    if (!originalMovie) return res.status(404).json({ message: "Không tìm thấy phim" });

    // Tạo slug mới
    const newSlug = `${originalMovie.slug}-copy-${Date.now()}`;

    // Tạo phim mới
    const newMovie = await prisma.movie.create({
      data: {
        title: `${originalMovie.title} (Copy)`,
        slug: newSlug,
        description: originalMovie.description,
        posterUrl: originalMovie.posterUrl,
        backgroundUrl: originalMovie.backgroundUrl,
        releaseYear: originalMovie.releaseYear,
        country: originalMovie.country,
        status: originalMovie.status,
        type: originalMovie.type,
        isHidden: true, // Phim copy sẽ được ẩn mặc định
        views: 0, // Reset views
      },
    });

    // Copy categories
    if (originalMovie.categories.length > 0) {
      await prisma.categoryOnMovie.createMany({
        data: originalMovie.categories.map(c => ({
          movieId: newMovie.id,
          categoryId: c.category.id,
        })),
        skipDuplicates: true,
      });
    }

    // Copy genres
    if (originalMovie.genres.length > 0) {
      await prisma.genreOnMovie.createMany({
        data: originalMovie.genres.map(g => ({
          movieId: newMovie.id,
          genreId: g.genre.id,
        })),
        skipDuplicates: true,
      });
    }

    // Copy actors
    if (originalMovie.actors.length > 0) {
      await prisma.actorOnMovie.createMany({
        data: originalMovie.actors.map(a => ({
          movieId: newMovie.id,
          actorId: a.actor.id,
        })),
        skipDuplicates: true,
      });
    }

    // Copy episodes (copy cả video URL)
    if (originalMovie.episodes.length > 0) {
      await prisma.episode.createMany({
        data: originalMovie.episodes.map(episode => ({
          title: episode.title,
          videoUrl: episode.videoUrl, // Copy cả video URL
          movieId: newMovie.id,
        })),
      });
    }

    // Không copy ads (quảng cáo) - bỏ qua

    // Lấy phim mới với đầy đủ thông tin
    const fullNewMovie = await prisma.movie.findUnique({
      where: { id: newMovie.id },
      include: {
        categories: { include: { category: true } },
        genres: { include: { genre: true } },
        actors: { include: { actor: true } },
        episodes: true,
        ads: true,
      },
    });

    res.status(201).json({ 
      message: "Copy phim thành công! Đã copy đầy đủ thông tin và video (không copy quảng cáo).", 
      movie: fullNewMovie 
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};
