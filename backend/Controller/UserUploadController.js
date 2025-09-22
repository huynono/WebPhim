const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const prisma = new PrismaClient();

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cấu hình multer cho video upload
const videoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'user-uploads/videos',
    resource_type: 'video',
    allowed_formats: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'],
  },
});

const posterStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'user-uploads/posters',
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  },
});

const uploadVideo = multer({ storage: videoStorage });
const uploadPoster = multer({ storage: posterStorage });

// ===== UPLOAD VIDEO =====
exports.uploadVideo = [
  uploadVideo.single('video'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Vui lòng chọn video để upload' });
      }

      const { title, description, senderName } = req.body;

      if (!title) {
        return res.status(400).json({ message: 'Vui lòng nhập tiêu đề phim' });
      }

      if (!senderName) {
        return res.status(400).json({ message: 'Vui lòng nhập tên người gửi' });
      }

      const userUpload = await prisma.userUpload.create({
        data: {
          title,
          description: description || null,
          videoUrl: req.file.path,
          senderName,
          status: 'PENDING',
        },
      });

      res.status(201).json({
        message: 'Upload video thành công! Video đang chờ admin duyệt.',
        upload: userUpload,
      });
    } catch (err) {
      res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
  },
];

// ===== UPLOAD POSTER =====
exports.uploadPoster = [
  uploadPoster.single('poster'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Vui lòng chọn poster để upload' });
      }

      const { uploadId } = req.body;

      // Kiểm tra upload có tồn tại và đang pending không
      const userUpload = await prisma.userUpload.findFirst({
        where: {
          id: parseInt(uploadId),
          status: 'PENDING',
        },
      });

      if (!userUpload) {
        return res.status(404).json({ message: 'Không tìm thấy video upload hoặc đã được xử lý' });
      }

      // Cập nhật poster
      const updatedUpload = await prisma.userUpload.update({
        where: { id: parseInt(uploadId) },
        data: { posterUrl: req.file.path },
      });

      res.status(200).json({
        message: 'Upload poster thành công!',
        upload: updatedUpload,
      });
    } catch (err) {
      res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
  },
];

// ===== GET UPLOADS BY SENDER NAME =====
exports.getUploadsBySender = async (req, res) => {
  try {
    const { senderName } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if (!senderName) {
      return res.status(400).json({ message: 'Vui lòng nhập tên người gửi' });
    }

    const uploads = await prisma.userUpload.findMany({
      where: { senderName },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    const totalUploads = await prisma.userUpload.count({
      where: { senderName },
    });

    const totalPages = Math.ceil(totalUploads / limit);

    res.status(200).json({
      uploads,
      pagination: {
        currentPage: page,
        totalPages,
        totalUploads,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// ===== GET ALL UPLOADS (ADMIN) =====
exports.getAllUploads = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status; // PENDING, APPROVED, REJECTED
    const skip = (page - 1) * limit;

    const whereClause = status ? { status } : {};

    const uploads = await prisma.userUpload.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    const totalUploads = await prisma.userUpload.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(totalUploads / limit);

    res.status(200).json({
      uploads,
      pagination: {
        currentPage: page,
        totalPages,
        totalUploads,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// ===== APPROVE UPLOAD =====
exports.approveUpload = async (req, res) => {
  try {
    console.log('=== APPROVE UPLOAD START ===');
    console.log('Request params:', req.params);
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);

    const { id } = req.params;
    const { categoryIds, genreIds, title, description } = req.body;

    // Validation cơ bản
    if (!categoryIds) {
      console.log('Error: Missing categoryIds');
      return res.status(400).json({ message: 'Vui lòng chọn ít nhất một danh mục cho phim' });
    }

    if (!title || !title.trim()) {
      console.log('Error: Missing title');
      return res.status(400).json({ message: 'Vui lòng nhập tiêu đề phim' });
    }

    const uploadId = parseInt(id);
    if (isNaN(uploadId)) {
      console.log('Error: Invalid upload ID');
      return res.status(400).json({ message: 'ID upload không hợp lệ' });
    }

    // Parse categoryIds
    let parsedCategoryIds = [];
    try {
      if (typeof categoryIds === 'string') {
        parsedCategoryIds = JSON.parse(categoryIds);
      } else if (Array.isArray(categoryIds)) {
        parsedCategoryIds = categoryIds;
      } else {
        parsedCategoryIds = [categoryIds];
      }
    } catch (error) {
      console.log('Error parsing categoryIds:', error);
      return res.status(400).json({ message: 'Danh sách danh mục không hợp lệ' });
    }

    // Validate category IDs
    const validCategoryIds = parsedCategoryIds
      .map(id => parseInt(id))
      .filter(id => !isNaN(id) && id > 0);

    if (validCategoryIds.length === 0) {
      console.log('Error: No valid category IDs');
      return res.status(400).json({ message: 'Vui lòng chọn ít nhất một danh mục hợp lệ' });
    }

    // Kiểm tra categories có tồn tại không
    console.log('Checking categories existence...');
    const existingCategories = await prisma.category.findMany({
      where: { id: { in: validCategoryIds } }
    });

    if (existingCategories.length !== validCategoryIds.length) {
      console.log('Error: Some categories not found');
      return res.status(400).json({ message: 'Một số danh mục không tồn tại' });
    }

    // Kiểm tra userUpload
    console.log('Checking user upload...');
    const userUpload = await prisma.userUpload.findUnique({
      where: { id: uploadId },
    });

    if (!userUpload) {
      console.log('Error: User upload not found');
      return res.status(404).json({ message: 'Không tìm thấy video upload' });
    }

    if (userUpload.status !== 'PENDING') {
      console.log('Error: Upload already processed');
      return res.status(400).json({ message: 'Video này đã được xử lý rồi' });
    }

    // Xử lý poster nếu có upload mới
    let finalPosterUrl = userUpload.posterUrl;
    if (req.file) {
      finalPosterUrl = req.file.path;
      console.log('New poster uploaded:', finalPosterUrl);
    }

    // Tạo slug từ title với kiểm tra trùng lặp
    const finalTitle = title.trim();
    let baseSlug = finalTitle
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Đảm bảo slug không trống
    if (!baseSlug) {
      baseSlug = 'movie-' + Date.now();
    }

    // Kiểm tra slug trùng lặp và tạo slug duy nhất
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const existingMovie = await prisma.movie.findUnique({
        where: { slug }
      });
      if (!existingMovie) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    console.log('Final slug:', slug);

    // Tạo Movie từ UserUpload
    console.log('Creating movie...');
    const newMovie = await prisma.movie.create({
      data: {
        title: finalTitle,
        description: description ? description.trim() : null,
        slug,
        posterUrl: finalPosterUrl,
        backgroundUrl: finalPosterUrl,
        releaseYear: new Date().getFullYear(),
        country: 'Không xác định',
        status: 'completed',
        type: 'single',
        views: 0,
        isHidden: false,
      },
    });

    // Tạo relations với categories
    console.log('Creating category relations...');
    await prisma.categoryOnMovie.createMany({
      data: validCategoryIds.map(categoryId => ({
        movieId: newMovie.id,
        categoryId: categoryId
      })),
      skipDuplicates: true
    });

    console.log('Movie created with ID:', newMovie.id);

    // Tạo Episode từ video
    console.log('Creating episode...');
    await prisma.episode.create({
      data: {
        title: 'Tập 1',
        videoUrl: userUpload.videoUrl,
        movieId: newMovie.id,
      },
    });

    // Xử lý genres một cách an toàn
    console.log('Processing genres...');
    if (genreIds) {
      let parsedGenreIds = [];
      
      try {
        // Xử lý genreIds
        if (typeof genreIds === 'string') {
          if (genreIds.trim() === '' || genreIds === 'undefined' || genreIds === 'null') {
            parsedGenreIds = [];
          } else {
            parsedGenreIds = JSON.parse(genreIds);
          }
        } else if (Array.isArray(genreIds)) {
          parsedGenreIds = genreIds;
        }
        
        // Đảm bảo parsedGenreIds là array và chứa số
        if (!Array.isArray(parsedGenreIds)) {
          parsedGenreIds = [];
        }
        
        // Lọc và chuyển đổi thành số
        parsedGenreIds = parsedGenreIds
          .map(id => parseInt(id))
          .filter(id => !isNaN(id) && id > 0);
        
        console.log('Parsed genre IDs:', parsedGenreIds);
        
        // Kiểm tra genres có tồn tại không
        if (parsedGenreIds.length > 0) {
          const existingGenres = await prisma.genre.findMany({
            where: { id: { in: parsedGenreIds } }
          });
          
          const validGenreIds = existingGenres.map(g => g.id);
          console.log('Valid genre IDs:', validGenreIds);
          
          if (validGenreIds.length > 0) {
            await prisma.genreOnMovie.createMany({
              data: validGenreIds.map(genreId => ({
                movieId: newMovie.id,
                genreId: genreId,
              })),
            });
            console.log('Genres linked successfully');
          }
        }
      } catch (error) {
        console.log('Error processing genres:', error.message);
        // Không fail toàn bộ request nếu genres lỗi
      }
    }

    // Cập nhật UserUpload status và liên kết với Movie
    console.log('Updating user upload...');
    const updatedUpload = await prisma.userUpload.update({
      where: { id: uploadId },
      data: {
        status: 'APPROVED',
        approvedMovieId: newMovie.id,
      },
      include: {
        approvedMovie: true,
      },
    });

    console.log('=== APPROVE UPLOAD SUCCESS ===');
    res.status(200).json({
      message: 'Duyệt video thành công! Phim đã được tạo.',
      upload: updatedUpload,
      movie: newMovie,
    });
  } catch (err) {
    console.error('=== APPROVE UPLOAD ERROR ===');
    console.error('Error details:', err);
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({ 
      message: 'Lỗi server khi duyệt video', 
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// ===== REJECT UPLOAD =====
exports.rejectUpload = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectReason } = req.body;

    const uploadId = parseInt(id);
    const userUpload = await prisma.userUpload.findUnique({
      where: { id: uploadId },
    });

    if (!userUpload) {
      return res.status(404).json({ message: 'Không tìm thấy video upload' });
    }

    if (userUpload.status !== 'PENDING') {
      return res.status(400).json({ message: 'Video này đã được xử lý rồi' });
    }

    // Xóa files từ Cloudinary trước khi xóa database
    try {
      if (userUpload.videoUrl) {
        const videoPublicId = userUpload.videoUrl.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`user-uploads/videos/${videoPublicId}`, {
          resource_type: 'video'
        });
      }
      
      if (userUpload.posterUrl) {
        const posterPublicId = userUpload.posterUrl.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`user-uploads/posters/${posterPublicId}`, {
          resource_type: 'image'
        });
      }
    } catch (cloudinaryError) {
      // Tiếp tục xóa database dù có lỗi Cloudinary
    }

    // Xóa khỏi database
    await prisma.userUpload.delete({
      where: { id: uploadId },
    });

    res.status(200).json({
      message: 'Từ chối và xóa video thành công!',
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// ===== DELETE UPLOAD =====
exports.deleteUpload = async (req, res) => {
  try {
    const { id } = req.params;

    const uploadId = parseInt(id);
    const userUpload = await prisma.userUpload.findUnique({
      where: { id: uploadId },
    });

    if (!userUpload) {
      return res.status(404).json({ message: 'Không tìm thấy video upload' });
    }

    if (userUpload.status === 'APPROVED') {
      return res.status(400).json({ message: 'Không thể xóa video đã được duyệt' });
    }

    // Xóa file từ Cloudinary
    if (userUpload.videoUrl) {
      const publicId = userUpload.videoUrl.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`user-uploads/videos/${publicId}`, {
        resource_type: 'video',
      });
    }

    if (userUpload.posterUrl) {
      const publicId = userUpload.posterUrl.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`user-uploads/posters/${publicId}`);
    }

    await prisma.userUpload.delete({
      where: { id: uploadId },
    });

    res.status(200).json({
      message: 'Xóa video upload thành công!',
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// ===== EDIT APPROVED UPLOAD =====
exports.editApprovedUpload = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập tiêu đề phim' });
    }

    const uploadId = parseInt(id);
    const userUpload = await prisma.userUpload.findUnique({
      where: { id: uploadId },
      include: {
        approvedMovie: true
      }
    });

    if (!userUpload) {
      return res.status(404).json({ message: 'Không tìm thấy video upload' });
    }

    if (userUpload.status !== 'APPROVED') {
      return res.status(400).json({ message: 'Chỉ có thể chỉnh sửa video đã được duyệt' });
    }

    // Xử lý poster nếu có upload mới
    let finalPosterUrl = userUpload.posterUrl;
    if (req.file) {
      finalPosterUrl = req.file.path;
    }

    // Tạo slug mới từ title
    const finalTitle = title.trim();
    const slug = finalTitle
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Cập nhật UserUpload
    const updatedUpload = await prisma.userUpload.update({
      where: { id: uploadId },
      data: {
        title: finalTitle,
        description: description ? description.trim() : null,
        posterUrl: finalPosterUrl,
      },
    });

    // Cập nhật Movie nếu có
    if (userUpload.approvedMovie) {
      await prisma.movie.update({
        where: { id: userUpload.approvedMovie.id },
        data: {
          title: finalTitle,
          description: description ? description.trim() : null,
          slug: slug,
          posterUrl: finalPosterUrl,
          backgroundUrl: finalPosterUrl,
        },
      });
    }

    res.status(200).json({
      message: 'Cập nhật video thành công!',
      upload: updatedUpload,
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// ===== DELETE APPROVED UPLOAD =====
exports.deleteApprovedUpload = async (req, res) => {
  try {
    const { id } = req.params;

    const uploadId = parseInt(id);
    const userUpload = await prisma.userUpload.findUnique({
      where: { id: uploadId },
      include: {
        approvedMovie: true
      }
    });

    if (!userUpload) {
      return res.status(404).json({ message: 'Không tìm thấy video upload' });
    }

    if (userUpload.status !== 'APPROVED') {
      return res.status(400).json({ message: 'Chỉ có thể xóa video đã được duyệt' });
    }

    // Xóa Movie và các liên kết nếu có
    if (userUpload.approvedMovie) {
      const movieId = userUpload.approvedMovie.id;

      // Xóa liên kết genres
      await prisma.genreOnMovie.deleteMany({
        where: { movieId }
      });

      // Xóa episodes
      await prisma.episode.deleteMany({
        where: { movieId }
      });

      // Xóa ads
      await prisma.adBanner.deleteMany({
        where: { movieId }
      });

      // Xóa movie
      await prisma.movie.delete({
        where: { id: movieId }
      });
    }

    // Xóa files từ Cloudinary
    try {
      if (userUpload.videoUrl) {
        const videoPublicId = userUpload.videoUrl.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`user-uploads/videos/${videoPublicId}`, {
          resource_type: 'video'
        });
      }
      
      if (userUpload.posterUrl) {
        const posterPublicId = userUpload.posterUrl.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`user-uploads/posters/${posterPublicId}`, {
          resource_type: 'image'
        });
      }
    } catch (cloudinaryError) {
    }

    // Xóa UserUpload
    await prisma.userUpload.delete({
      where: { id: uploadId },
    });

    res.status(200).json({ message: 'Xóa video và phim thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

module.exports = {
  uploadVideo: exports.uploadVideo,
  uploadPoster: exports.uploadPoster,
  getUploadsBySender: exports.getUploadsBySender,
  getAllUploads: exports.getAllUploads,
  approveUpload: exports.approveUpload,
  rejectUpload: exports.rejectUpload,
  deleteUpload: exports.deleteUpload,
  editApprovedUpload: exports.editApprovedUpload,
  deleteApprovedUpload: exports.deleteApprovedUpload,
};
