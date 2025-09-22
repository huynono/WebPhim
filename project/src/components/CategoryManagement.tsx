import React, { useState, useEffect } from "react";
import { Plus, Search, Edit3, Trash2 } from "lucide-react";

const API_URL = "http://localhost:3000/api/categories";

interface Category {
  id: number;
  name: string;
  slug: string;
}

// Hàm tạo slug từ name
const generateSlug = (text: string) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, "-");
};

// ---------------- CategoryForm ----------------
interface CategoryFormProps {
  newCategory: { name: string; slug: string };
  setNewCategory: React.Dispatch<
    React.SetStateAction<{ name: string; slug: string }>
  >;
  handleAddCategory: (e: React.FormEvent) => void;
  setShowAddModal: React.Dispatch<React.SetStateAction<boolean>>;
  generateSlug: (text: string) => string;
}

const CategoryForm: React.FC<CategoryFormProps> = ({
  newCategory,
  setNewCategory,
  handleAddCategory,
  setShowAddModal,
  generateSlug,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Thêm danh mục mới</h3>
          <button
            onClick={() => setShowAddModal(false)}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleAddCategory}>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tên danh mục *
            </label>
            <input
              type="text"
              value={newCategory.name}
              onChange={(e) => {
                const name = e.target.value;
                setNewCategory((prev) => ({
                  ...prev,
                  name,
                  slug: generateSlug(name),
                }));
              }}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập tên danh mục"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Slug *
            </label>
            <input
              type="text"
              value={newCategory.slug}
              onChange={(e) =>
                setNewCategory((prev) => ({ ...prev, slug: e.target.value }))
              }
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500"
              placeholder="ten-danh-muc"
              required
            />
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Thêm danh mục
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ---------------- EditForm ----------------
interface EditFormProps {
  editingCategory: Category | null;
  setEditingCategory: React.Dispatch<React.SetStateAction<Category | null>>;
  handleEditCategory: (e: React.FormEvent) => void;
  setShowEditModal: React.Dispatch<React.SetStateAction<boolean>>;
  generateSlug: (text: string) => string;
}

const EditForm: React.FC<EditFormProps> = ({
  editingCategory,
  setEditingCategory,
  handleEditCategory,
  setShowEditModal,
  generateSlug,
}) => {
  if (!editingCategory) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Sửa danh mục</h3>
          <button
            onClick={() => setShowEditModal(false)}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleEditCategory}>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tên danh mục *
            </label>
            <input
              type="text"
              value={editingCategory.name}
              onChange={(e) => {
                const name = e.target.value;
                setEditingCategory((prev) =>
                  prev ? { ...prev, name, slug: generateSlug(name) } : null
                );
              }}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Slug *
            </label>
            <input
              type="text"
              value={editingCategory.slug}
              onChange={(e) =>
                setEditingCategory((prev) =>
                  prev ? { ...prev, slug: e.target.value } : null
                )
              }
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ---------------- CategoryManagement ----------------
const CategoryManagement = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newCategory, setNewCategory] = useState<{ name: string; slug: string }>(
    { name: "", slug: "" }
  );
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Lấy danh mục khi load trang
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error("❌ Lỗi khi lấy danh mục:", err);
    }
  };

  // Thêm category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCategory),
      });
      setNewCategory({ name: "", slug: "" });
      setShowAddModal(false);
      fetchCategories();
    } catch (err) {
      console.error("❌ Lỗi khi thêm:", err);
    }
  };

  // Xóa category
  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm("Bạn có chắc muốn xóa?")) return;
    try {
      await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      fetchCategories();
    } catch (err) {
      console.error("❌ Lỗi khi xóa:", err);
    }
  };

  // Mở modal edit
  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setShowEditModal(true);
  };

  // Sửa category
  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    try {
      await fetch(`${API_URL}/${editingCategory.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingCategory),
      });
      setShowEditModal(false);
      setEditingCategory(null);
      fetchCategories();
    } catch (err) {
      console.error("❌ Lỗi khi sửa:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Quản lý Danh mục</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} className="mr-2" />
          Thêm danh mục
        </button>
      </div>

      <div className="relative max-w-md">
        <Search
          size={20}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Tìm kiếm danh mục..."
          className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Tên danh mục
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Slug
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Hành động
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {categories
              .filter((c) =>
                c.name.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((category) => (
                <tr key={category.id} className="hover:bg-gray-750">
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {category.id}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-white">
                    {category.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {category.slug}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => openEditModal(category)}
                        className="text-green-400 hover:text-green-300"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <CategoryForm
          newCategory={newCategory}
          setNewCategory={setNewCategory}
          handleAddCategory={handleAddCategory}
          setShowAddModal={setShowAddModal}
          generateSlug={generateSlug}
        />
      )}

      {showEditModal && (
        <EditForm
          editingCategory={editingCategory}
          setEditingCategory={setEditingCategory}
          handleEditCategory={handleEditCategory}
          setShowEditModal={setShowEditModal}
          generateSlug={generateSlug}
        />
      )}
    </div>
  );
};

export default CategoryManagement;
