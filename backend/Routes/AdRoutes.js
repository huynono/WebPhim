const express = require("express");
const router = express.Router();
const AdController = require("../Controller/AdController");
const multer = require("multer");

const upload = multer({ dest: "uploads/" });

router.post("/", upload.single("video"), AdController.createAd);
router.put("/:id", upload.single("video"), AdController.updateAd);
router.get("/", AdController.getAllAds);
router.get("/movie/:movieId", AdController.getAdsByMovie);
router.delete("/:id", AdController.deleteAd);

// ===== INCREMENT AD VIEW =====
router.post("/:id/view", AdController.incrementAdView);

module.exports = router;
