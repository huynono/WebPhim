const express = require("express");
const router = express.Router();
const watchHistoryController = require("../Controller/WatchHistoryController");
const { authenticateToken } = require("../Middleware/auth");

// ===== Watch History routes =====
// Tất cả routes đều cần authentication
router.use(authenticateToken);

// POST /api/watch-history - Lưu tiến độ xem
router.post("/", watchHistoryController.saveWatchProgress);

// GET /api/watch-history - Lấy lịch sử xem
router.get("/", watchHistoryController.getWatchHistory);

// GET /api/watch-history/continue - Lấy danh sách tiếp tục xem
router.get("/continue", watchHistoryController.getContinueWatching);

// GET /api/watch-history/progress/:movieId - Lấy tiến độ xem của phim
router.get("/progress/:movieId", watchHistoryController.getWatchProgress);

// DELETE /api/watch-history/:movieId - Xóa lịch sử xem của phim
router.delete("/:movieId", watchHistoryController.deleteWatchHistory);

module.exports = router;
