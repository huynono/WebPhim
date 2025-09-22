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

const uploadToCloudinary = (filePath, folder, isVideo = false) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      filePath,
      { folder, resource_type: isVideo ? "video" : "image" },
      (err, result) => {
        fs.unlink(filePath, () => {});
        if (err) return reject(err);
        resolve(result);
      }
    );
  });

const deleteFromCloudinary = async (url, isVideo = false) => {
  if (!url) return;
  try {
    const publicId = url.split("/upload/")[1].split(".")[0];
    await cloudinary.uploader.destroy(publicId, { resource_type: isVideo ? "video" : "image" });
  } catch (err) {
  }
};

// ===== CREATE AD =====
exports.createAd = async (req, res) => {
  try {
    ensureUploadDir();
    const { movieId, type = "PRE_ROLL", linkUrl, startTime, duration, isSkippable, skipAfter } = req.body;

    if (!movieId) return res.status(400).json({ message: "movieId là bắt buộc" });

    let uploadedUrl = null;

    if (type === "OVERLAY") {
      // Overlay: upload video (3-4s) hoặc dùng videoUrl
      if (!req.file && !req.body.videoUrl) return res.status(400).json({ message: "Chưa upload video overlay hoặc chưa nhập link video" });
      if (req.file) {
        const result = await uploadToCloudinary(req.file.path, "movies/ads", true);
        uploadedUrl = result.secure_url;
      } else {
        uploadedUrl = req.body.videoUrl;
      }
    } else {
      // Video: upload video hoặc dùng videoUrl
      if (!req.file && !req.body.videoUrl) return res.status(400).json({ message: "Chưa upload video hoặc chưa nhập link video" });
      if (req.file) {
        const result = await uploadToCloudinary(req.file.path, "movies/ads", true);
        uploadedUrl = result.secure_url;
      } else {
        uploadedUrl = req.body.videoUrl;
      }
    }

    const adData = {
      movieId: Number(movieId),
      type,
      videoUrl: uploadedUrl,
      linkUrl: type === "OVERLAY" ? linkUrl : "",
      startTime: type === "MID_ROLL" ? Number(startTime) || 0 : null,
      duration: duration ? Number(duration) : null,
      isSkippable: type !== "OVERLAY" ? (isSkippable === "true" || isSkippable === true) : false,
      skipAfter: type !== "OVERLAY" && skipAfter ? Number(skipAfter) : null,
    };

    const ad = await prisma.adBanner.create({ data: adData });
    res.status(201).json({ message: "Thêm quảng cáo thành công", ad });

  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};



// ===== GET ALL ADS =====
exports.getAllAds = async (req, res) => {
  try {
    const ads = await prisma.adBanner.findMany({
      include: { movie: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json(ads);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ===== GET ADS BY MOVIE =====
exports.getAdsByMovie = async (req, res) => {
  try {
    const { movieId } = req.params;
    const ads = await prisma.adBanner.findMany({
      where: { movieId: Number(movieId) },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json(ads);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ===== UPDATE AD =====
exports.updateAd = async (req, res) => {
  try {
    const { id } = req.params;
    const { linkUrl, type, startTime, duration, isSkippable, skipAfter } = req.body;

    const ad = await prisma.adBanner.findUnique({ where: { id: Number(id) } });
    if (!ad) return res.status(404).json({ message: "Không tìm thấy quảng cáo" });

    // Tất cả ads đều là video (bao gồm overlay)
    const isVideoAd = true;

    const updateData = {
      linkUrl,
      type,
      startTime: type === "MID_ROLL" ? Number(startTime) || 0 : null,
      duration: duration ? Number(duration) : null,
      isSkippable: isSkippable === "true" || isSkippable === true,
      skipAfter: skipAfter ? Number(skipAfter) : null,
    };

    if (req.file) {
      if (ad.videoUrl) await deleteFromCloudinary(ad.videoUrl, true); // Tất cả đều là video
      const result = await uploadToCloudinary(req.file.path, "movies/ads", isVideoAd);
      updateData.videoUrl = result.secure_url;
    }

    const updatedAd = await prisma.adBanner.update({
      where: { id: Number(id) },
      data: updateData,
    });
    res.status(200).json({ message: "Cập nhật quảng cáo thành công", ad: updatedAd });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ===== DELETE AD =====
exports.deleteAd = async (req, res) => {
  try {
    const { id } = req.params;
    const ad = await prisma.adBanner.findUnique({ where: { id: Number(id) } });
    if (!ad) return res.status(404).json({ message: "Không tìm thấy quảng cáo" });

    if (ad.videoUrl) {
      const isVideo = ad.type !== 'OVERLAY';
      await deleteFromCloudinary(ad.videoUrl, isVideo);
    }
    
    await prisma.adBanner.delete({ where: { id: Number(id) } });
    res.status(200).json({ message: "Xoá quảng cáo thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};


// ===== INCREMENT AD VIEW =====
exports.incrementAdView = async (req, res) => {
  try {
    const { id } = req.params;
    const ad = await prisma.adBanner.findUnique({ where: { id: Number(id) } });
    if (!ad) return res.status(404).json({ message: "Không tìm thấy quảng cáo" });

    const updatedAd = await prisma.adBanner.update({
      where: { id: Number(id) },
      data: { views: { increment: 1 } },
    });

    res.status(200).json({ message: "Tăng lượt xem quảng cáo thành công", ad: updatedAd });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};
