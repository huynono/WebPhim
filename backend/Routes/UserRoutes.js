const express = require('express');
const router = express.Router();
const userUploadController = require('../Controller/UserUploadController');

// ===== USER UPLOAD ROUTES =====

// Upload video (POST /api/user-uploads/video)
router.post('/video', userUploadController.uploadVideo);

// Upload poster (POST /api/user-uploads/poster)
router.post('/poster', userUploadController.uploadPoster);

// Get uploads by sender name (GET /api/user-uploads/by-sender?senderName=...)
router.get('/by-sender', userUploadController.getUploadsBySender);

// Delete user's upload (DELETE /api/user-uploads/:id)
router.delete('/:id', userUploadController.deleteUpload);

// ===== ADMIN ROUTES =====

// Get all uploads for admin (GET /api/user-uploads/admin/all)
router.get('/admin/all', userUploadController.getAllUploads);

// Approve upload (POST /api/user-uploads/admin/:id/approve)
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cấu hình multer cho poster upload
const posterStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'movie-posters',
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  },
});

const uploadPoster = multer({ storage: posterStorage });

router.post('/admin/:id/approve', uploadPoster.single('poster'), userUploadController.approveUpload);

// Reject upload (POST /api/user-uploads/admin/:id/reject)
router.post('/admin/:id/reject', userUploadController.rejectUpload);

// Edit approved upload (PUT /api/user-uploads/admin/:id/edit)
router.put('/admin/:id/edit', uploadPoster.single('poster'), userUploadController.editApprovedUpload);

// Delete approved upload (DELETE /api/user-uploads/admin/:id/delete)
router.delete('/admin/:id/delete', userUploadController.deleteApprovedUpload);

module.exports = router;
