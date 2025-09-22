const express = require("express");
const router = express.Router();
const favoriteController = require("../Controller/FavoriteController");
const { authenticateToken } = require("../Middleware/auth");

// ===== Public routes (không cần authentication) =====
// GET /api/favorites/count/:movieId - Lấy số lượng yêu thích của phim
router.get("/count/:movieId", favoriteController.getFavoriteCount);

// ===== Protected routes (cần authentication) =====
// POST /api/favorites/:movieId - Thêm phim vào yêu thích
router.post("/:movieId", authenticateToken, favoriteController.addToFavorites);

// DELETE /api/favorites/:movieId - Xóa phim khỏi yêu thích
router.delete("/:movieId", authenticateToken, favoriteController.removeFromFavorites);

// GET /api/favorites - Lấy danh sách phim yêu thích
router.get("/", authenticateToken, favoriteController.getUserFavorites);

// GET /api/favorites/check/:movieId - Kiểm tra phim có trong yêu thích không
router.get("/check/:movieId", authenticateToken, favoriteController.checkFavorite);

module.exports = router;
