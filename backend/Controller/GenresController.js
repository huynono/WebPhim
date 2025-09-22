const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();


const generateSlug = (name) => {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};
// Lấy tất cả genres
exports.getGenres = async (req, res) => {
  try {
    const genres = await prisma.genre.findMany({
      include: { movies: true },
    });
    res.json(genres);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Thêm genre
exports.createGenre = async (req, res) => {
  try {
    const { name, slug } = req.body;
    const finalSlug = slug && slug.trim() !== "" ? slug : generateSlug(name);

    const genre = await prisma.genre.create({
      data: { name, slug: finalSlug },
    });
    res.json(genre);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Sửa genre
// update genre theo id
exports.updateGenre = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, newSlug } = req.body;
    const finalSlug = newSlug && newSlug.trim() !== "" ? newSlug : generateSlug(name);

    const genre = await prisma.genre.update({
      where: { id: Number(id) }, // dùng id thay vì slug
      data: { name, slug: finalSlug },
    });
    res.json(genre);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// delete genre theo id
exports.deleteGenre = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.genre.delete({
      where: { id: Number(id) },
    });
    res.json({ message: "Genre deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

