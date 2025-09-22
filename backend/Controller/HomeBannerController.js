const { PrismaClient } = require('@prisma/client');
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
    console.log('Error deleting from Cloudinary:', err);
  }
};

// Lấy tất cả banner
const getAllBanners = async (req, res) => {
  try {
    const banners = await prisma.homeBanner.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(banners);
  } catch (error) {
    console.error('Error getting banners:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách banner' });
  }
};

// Lấy banner theo type
const getBannersByType = async (req, res) => {
  try {
    const { type } = req.params;
    const banners = await prisma.homeBanner.findMany({
      where: {
        type: type.toUpperCase(),
        isActive: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(banners);
  } catch (error) {
    console.error('Error getting banners by type:', error);
    res.status(500).json({ error: 'Lỗi khi lấy banner theo loại' });
  }
};

// Tạo banner mới
const createBanner = async (req, res) => {
  try {
    ensureUploadDir();
    const { linkUrl, type } = req.body;
    
    if (!req.file && !req.body.videoUrl) {
      return res.status(400).json({ error: 'Vui lòng upload video hoặc nhập link video' });
    }

    if (!linkUrl) {
      return res.status(400).json({ error: 'Vui lòng nhập link URL' });
    }

    let videoUrl = req.body.videoUrl;

    // Nếu có upload file, upload lên Cloudinary
    if (req.file) {
      const result = await uploadToCloudinary(req.file.path, "home/banners", true);
      videoUrl = result.secure_url;
    }

    const banner = await prisma.homeBanner.create({
      data: {
        videoUrl,
        linkUrl,
        type: type.toUpperCase() || 'POPUP'
      }
    });

    res.json(banner);
  } catch (error) {
    console.error('Error creating banner:', error);
    res.status(500).json({ error: 'Lỗi khi tạo banner' });
  }
};

// Cập nhật banner
const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const { linkUrl, type, isActive } = req.body;

    const updateData = { linkUrl, type: type?.toUpperCase(), isActive };

    // Nếu có upload video mới
    if (req.file) {
      // Xóa video cũ từ Cloudinary
      const oldBanner = await prisma.homeBanner.findUnique({
        where: { id: parseInt(id) }
      });
      
      if (oldBanner && oldBanner.videoUrl) {
        await deleteFromCloudinary(oldBanner.videoUrl, true);
      }

      // Upload video mới lên Cloudinary
      const result = await uploadToCloudinary(req.file.path, "home/banners", true);
      updateData.videoUrl = result.secure_url;
    }

    const banner = await prisma.homeBanner.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.json(banner);
  } catch (error) {
    console.error('Error updating banner:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật banner' });
  }
};

// Xóa banner
const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;

    // Lấy thông tin banner để xóa file
    const banner = await prisma.homeBanner.findUnique({
      where: { id: parseInt(id) }
    });

    if (!banner) {
      return res.status(404).json({ error: 'Không tìm thấy banner' });
    }

    // Xóa video từ Cloudinary
    if (banner.videoUrl) {
      await deleteFromCloudinary(banner.videoUrl, true);
    }

    // Xóa banner khỏi database
    await prisma.homeBanner.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Xóa banner thành công' });
  } catch (error) {
    console.error('Error deleting banner:', error);
    res.status(500).json({ error: 'Lỗi khi xóa banner' });
  }
};

// Toggle trạng thái active
const toggleBannerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    const banner = await prisma.homeBanner.findUnique({
      where: { id: parseInt(id) }
    });

    if (!banner) {
      return res.status(404).json({ error: 'Không tìm thấy banner' });
    }

    const updatedBanner = await prisma.homeBanner.update({
      where: { id: parseInt(id) },
      data: { isActive: !banner.isActive }
    });

    res.json(updatedBanner);
  } catch (error) {
    console.error('Error toggling banner status:', error);
    res.status(500).json({ error: 'Lỗi khi thay đổi trạng thái banner' });
  }
};

// Tăng view count khi click vào banner
const incrementViewCount = async (req, res) => {
  try {
    const { id } = req.params;
    
    const banner = await prisma.homeBanner.findUnique({
      where: { id: parseInt(id) }
    });

    if (!banner) {
      return res.status(404).json({ error: 'Không tìm thấy banner' });
    }

    const updatedBanner = await prisma.homeBanner.update({
      where: { id: parseInt(id) },
      data: { 
        viewCount: banner.viewCount + 1 
      }
    });

    res.json({ 
      message: 'Đã tăng view count',
      viewCount: updatedBanner.viewCount 
    });
  } catch (error) {
    console.error('Error incrementing view count:', error);
    res.status(500).json({ error: 'Lỗi khi tăng view count' });
  }
};

module.exports = {
  getAllBanners,
  getBannersByType,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBannerStatus,
  incrementViewCount
};
