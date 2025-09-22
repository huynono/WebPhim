const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Hàm chuyển name → slug
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .normalize("NFD") // bỏ dấu tiếng Việt
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-") // thay khoảng trắng = -
    .replace(/[^a-z0-9-]/g, "") // bỏ ký tự đặc biệt
    .replace(/-+/g, "-") // bỏ -- thừa
    .replace(/^-|-$/g, ""); // bỏ - ở đầu/cuối
};

// Lấy tất cả category
exports.getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: { 
        movies: {
          include: {
            movie: true
          }
        }
      },
    });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Thêm category
exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const slug = generateSlug(name);

    const category = await prisma.category.create({
      data: { name, slug },
    });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Sửa category
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const slug = generateSlug(name);

    const category = await prisma.category.update({
      where: { id: Number(id) },
      data: { name, slug },
    });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Xóa category
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.category.delete({
      where: { id: Number(id) },
    });
    res.json({ message: "Category deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
