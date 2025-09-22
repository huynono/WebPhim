const { PrismaClient } = require("@prisma/client");
const cloudinary = require("cloudinary").v2;
const prisma = new PrismaClient();

// ===== Cloudinary config =====
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ===== Helper =====

// Upload buffer lên Cloudinary
const uploadToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "actors", transformation: [{ width: 400, height: 400, crop: "fill" }] },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });

// Xóa avatar từ Cloudinary
const deleteFromCloudinary = async (avatarUrl) => {
  if (!avatarUrl) return;

  try {
    // Lấy public_id đầy đủ từ URL Cloudinary
    const publicId = avatarUrl.split("/upload/")[1].split(".")[0];
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
  }
};

// Tạo slug đơn giản
const generateSlug = (name) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

// ===== CREATE ACTOR =====
exports.createActor = async (req, res) => {
  try {
    const { name, slug } = req.body;
    if (!name?.trim())
      return res.status(400).json({ message: "Tên diễn viên là bắt buộc" });

    const finalSlug = slug?.trim() || generateSlug(name.trim());

    const exists = await prisma.actor.findFirst({ where: { slug: finalSlug } });
    if (exists) return res.status(400).json({ message: "Slug đã tồn tại" });

    let avatarUrl = null;
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      avatarUrl = result.secure_url;
    }

    const actor = await prisma.actor.create({
      data: { name: name.trim(), slug: finalSlug, avatar: avatarUrl },
    });

    res.status(201).json({ actor });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ===== GET ALL ACTORS =====
exports.getAllActors = async (req, res) => {
  try {
    const actors = await prisma.actor.findMany({ orderBy: { name: "asc" } });
    res.status(200).json({ message: "Lấy danh sách thành công", total: actors.length, actors });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// ===== UPDATE ACTOR =====
exports.updateActor = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug } = req.body;
    if (!id) return res.status(400).json({ message: "ID diễn viên là bắt buộc" });

    const actorId = Number(id);
    const actor = await prisma.actor.findUnique({ where: { id: actorId } });
    if (!actor) return res.status(404).json({ message: "Không tìm thấy diễn viên" });

    const updateData = {};
    if (name?.trim()) updateData.name = name.trim();
    if (slug?.trim()) {
      const exists = await prisma.actor.findFirst({
        where: { slug: slug.trim(), id: { not: actorId } },
      });
      if (exists) return res.status(400).json({ message: "Slug đã tồn tại" });
      updateData.slug = slug.trim();
    }

    if (req.file) {
      if (actor.avatar) await deleteFromCloudinary(actor.avatar);
      const result = await uploadToCloudinary(req.file.buffer);
      updateData.avatar = result.secure_url;
    }

    const updated = await prisma.actor.update({ where: { id: actorId }, data: updateData });
    res.status(200).json({ message: "Cập nhật thành công", actor: updated });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// ===== DELETE ACTOR =====
exports.deleteActor = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "ID diễn viên là bắt buộc" });

    const actorId = Number(id);
    const actor = await prisma.actor.findUnique({ where: { id: actorId } });
    if (!actor) return res.status(404).json({ message: "Không tìm thấy diễn viên" });

    // Kiểm tra actor còn phim liên kết
    const relatedMovies = await prisma.actorOnMovie.findMany({
      where: { actorId },
    });

    if (relatedMovies.length > 0) {
      return res.status(400).json({
        message: "Diễn viên này còn phim liên kết, không thể xóa",
      });
    }

    // Xóa avatar nếu có
    if (actor.avatar) await deleteFromCloudinary(actor.avatar);

    // Xóa actor
    await prisma.actor.delete({ where: { id: actorId } });

    res.status(200).json({ message: "Xóa diễn viên thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};
