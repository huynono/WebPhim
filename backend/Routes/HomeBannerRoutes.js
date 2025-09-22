const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const {
  getAllBanners,
  getBannersByType,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBannerStatus,
  incrementViewCount
} = require('../Controller/HomeBannerController');

// Cấu hình multer giống AdController
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ cho phép upload file video!'), false);
    }
  }
});

// Lấy tất cả banner (cho admin)
router.get('/', getAllBanners);

// Lấy banner theo type (cho frontend)
router.get('/type/:type', getBannersByType);

// Tạo banner mới
router.post('/', upload.single('video'), createBanner);

// Cập nhật banner
router.put('/:id', upload.single('video'), updateBanner);

// Xóa banner
router.delete('/:id', deleteBanner);

// Toggle trạng thái active
router.patch('/:id/toggle', toggleBannerStatus);

// Tăng view count khi click vào banner
router.post('/:id/view', incrementViewCount);

module.exports = router;
