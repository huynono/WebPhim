const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const movieController = require("../Controller/MovieController");

// ===== Tạo folder uploads nếu chưa tồn tại =====
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ===== Multer storage =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

// ===== Multer fileFilter =====
const fileFilter = (req, file, cb) => {
  if (file.fieldname === "poster" || file.fieldname === "background") {
    if (!file.mimetype.startsWith("image/")) return cb(new Error("Poster/Background phải là ảnh"));
  } else if (file.fieldname === "video") {
    if (!file.mimetype.startsWith("video/")) return cb(new Error("Video phải là file video"));
  }
  cb(null, true);
};

// ===== Multer config =====
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5GB
});

// ===== Upload fields =====
const movieUpload = upload.fields([
  { name: "poster", maxCount: 1 },
  { name: "background", maxCount: 1 },
  { name: "video", maxCount: 1 },
]);

// ===== Middleware check file size =====
const checkFileSize = (req, res, next) => {
  const MAX_POSTER_BG = 10 * 1024 * 1024; // 10MB
  const MAX_VIDEO = 5 * 1024 * 1024 * 1024; // 5GB
  try {
    if (req.files?.poster && req.files.poster[0].size > MAX_POSTER_BG)
      return res.status(400).json({ message: "Poster quá lớn, max 10MB" });
    if (req.files?.background && req.files.background[0].size > MAX_POSTER_BG)
      return res.status(400).json({ message: "Background quá lớn, max 10MB" });
    if (req.files?.video && req.files.video[0].size > MAX_VIDEO)
      return res.status(400).json({ message: "Video quá lớn, max 5GB" });
    next();
  } catch (err) {
    res.status(500).json({ message: "Lỗi kiểm tra file size", error: err.message });
  }
};

// ===== Movie routes =====
router.post("/", movieUpload, checkFileSize, movieController.createMovie);
router.put("/:id", movieUpload, checkFileSize, movieController.updateMovie);
router.get("/", movieController.getAllMovies);
router.delete("/:id", movieController.deleteMovie);

// ===== Ad routes đã được chuyển sang AdRoutes.js =====

// ===== Route tăng view =====
router.post("/:id/view", movieController.incrementView);

// ===== Route toggle hidden status =====
router.patch("/:id/toggle-hidden", movieController.toggleHidden);

// ===== Route copy movie =====
router.post("/:id/copy", movieController.copyMovie);

router.get("/slug/:slug", movieController.getMovieBySlug);

module.exports = router;
