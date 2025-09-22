const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const commentController = require('../Controller/CommentController');
const { authenticateToken } = require('../Middleware/auth');

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

// ===== COMMENT ROUTES =====

// POST /api/movies/:movieId/comments - Tạo bình luận mới
router.post('/movies/:movieId/comments', authenticateToken, upload.array('media', 5), commentController.createComment);

// GET /api/movies/:movieId/comments - Lấy danh sách bình luận
router.get('/movies/:movieId/comments', commentController.getComments);

// POST /api/comments/:commentId/like - Like/dislike bình luận
router.post('/comments/:commentId/like', authenticateToken, commentController.likeComment);

// POST /api/replies/:replyId/like - Like/dislike reply
router.post('/replies/:replyId/like', authenticateToken, commentController.likeReply);

// POST /api/comments/:commentId/replies - Trả lời bình luận
router.post('/comments/:commentId/replies', authenticateToken, upload.array('media', 5), commentController.createReply);

// PUT /api/comments/:commentId - Sửa bình luận
router.put('/comments/:commentId', authenticateToken, upload.array('media', 5), commentController.updateComment);

// DELETE /api/comments/:commentId - Xóa bình luận
router.delete('/comments/:commentId', authenticateToken, commentController.deleteComment);

// PUT /api/replies/:replyId - Sửa reply
router.put('/replies/:replyId', authenticateToken, upload.array('media', 5), commentController.updateReply);

// DELETE /api/replies/:replyId - Xóa reply
router.delete('/replies/:replyId', authenticateToken, commentController.deleteReply);

module.exports = router;
