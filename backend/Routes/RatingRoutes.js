const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const ratingController = require('../Controller/RatingController');
const { authenticateToken, optionalAuth } = require('../Middleware/auth');

// ===== Multer config =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Chỉ cho phép ảnh và video
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ cho phép file ảnh và video!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 5 // Tối đa 5 files
  }
});

// ===== RATING ROUTES =====

// POST /api/movies/:movieId/rating - Đánh giá phim (có thể kèm media)
router.post('/movies/:movieId/rating', authenticateToken, upload.array('media', 5), ratingController.submitRating);

// GET /api/movies/:movieId/ratings - Lấy thông tin đánh giá của phim
router.get('/movies/:movieId/ratings', optionalAuth, ratingController.getMovieRatings);

// GET /api/ratings/user - Lấy danh sách đánh giá của user hiện tại
router.get('/ratings/user', authenticateToken, ratingController.getUserRatings);

// DELETE /api/movies/:movieId/rating - Xóa đánh giá của user
router.delete('/movies/:movieId/rating', authenticateToken, ratingController.deleteRating);

// GET /api/ratings/top - Lấy danh sách phim được đánh giá cao nhất
router.get('/ratings/top', ratingController.getTopRatedMovies);

// POST /api/movies/:movieId/rating/media - Upload media cho rating
router.post('/movies/:movieId/rating/media', authenticateToken, upload.array('media', 5), ratingController.uploadRatingMedia);

module.exports = router;
