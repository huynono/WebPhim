import React, { useState, useEffect } from "react";
import { Plus, Search, Edit3, Trash2 } from "lucide-react";

const API_URL = "http://localhost:3000/api/genres";

interface Genre {
  id: string;
  name: string;
  slug: string;
  movies?: { id: number }[];
}

// Hàm tạo slug
const generateSlug = (text: string) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s\W-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

// ---------------- GenreForm (thêm) ----------------
interface GenreFormProps {
  newGenre: { name: string; slug: string };
  setNewGenre: React.Dispatch<React.SetStateAction<{ name: string; slug: string }>>;
  handleAddGenre: (e: React.FormEvent) => void;
  setShowAddModal: React.Dispatch<React.SetStateAction<boolean>>;
  generateSlug: (text: string) => string;
}

const GenreForm: React.FC<GenreFormProps> = ({
  newGenre,
  setNewGenre,
  handleAddGenre,
  setShowAddModal,
  generateSlug,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Thêm thể loại mới</h3>
          <button
            onClick={() => setShowAddModal(false)}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleAddGenre}>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tên thể loại *
            </label>
            <input
              type="text"
              value={newGenre.name}
              onChange={(e) =>
                setNewGenre({
                  name: e.target.value,
                  slug: generateSlug(e.target.value),
                })
              }
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập tên thể loại"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Slug *
            </label>
            <input
              type="text"
              value={newGenre.slug}
              onChange={(e) =>
                setNewGenre((prev) => ({ ...prev, slug: e.target.value }))
              }
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500"
              placeholder="ten-the-loai"
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
              Thêm thể loại
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ---------------- EditForm ----------------
interface EditFormProps {
  editingGenre: Genre | null;
  setEditingGenre: React.Dispatch<React.SetStateAction<Genre | null>>;
  handleEditGenre: (e: React.FormEvent) => void;
  setShowEditModal: React.Dispatch<React.SetStateAction<boolean>>;
  generateSlug: (text: string) => string;
}

const EditForm: React.FC<EditFormProps> = ({
  editingGenre,
  setEditingGenre,
  handleEditGenre,
  setShowEditModal,
  generateSlug,
}) => {
  if (!editingGenre) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Sửa thể loại</h3>
          <button
            onClick={() => setShowEditModal(false)}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleEditGenre}>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tên thể loại *
            </label>
            <input
              type="text"
              value={editingGenre.name}
              onChange={(e) =>
                setEditingGenre((prev) =>
                  prev ? { ...prev, name: e.target.value, slug: generateSlug(e.target.value) } : null
                )
              }
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
              value={editingGenre.slug}
              onChange={(e) =>
                setEditingGenre((prev) => (prev ? { ...prev, slug: e.target.value } : null))
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

// ---------------- GenreManagement ----------------
const GenreManagement = () => {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newGenre, setNewGenre] = useState<{ name: string; slug: string }>({ name: "", slug: "" });
  const [editingGenre, setEditingGenre] = useState<Genre | null>(null);

  useEffect(() => {
    fetchGenres();
  }, []);

  const fetchGenres = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setGenres(data);
    } catch (err) {
      console.error("❌ Lỗi khi lấy thể loại:", err);
    }
  };

  const handleAddGenre = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newGenre),
      });
      setNewGenre({ name: "", slug: "" });
      setShowAddModal(false);
      fetchGenres();
    } catch (err) {
      console.error("❌ Lỗi khi thêm:", err);
    }
  };

  const handleDeleteGenre = async (id: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa?")) return;
    try {
      await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      fetchGenres();
    } catch (err) {
      console.error("❌ Lỗi khi xóa:", err);
    }
  };

  const openEditModal = (genre: Genre) => {
    setEditingGenre(genre);
    setShowEditModal(true);
  };

  const handleEditGenre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGenre) return;
    try {
      await fetch(`${API_URL}/${editingGenre.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingGenre),
      });
      setShowEditModal(false);
      setEditingGenre(null);
      fetchGenres();
    } catch (err) {
      console.error("❌ Lỗi khi sửa:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Quản lý Thể loại</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} className="mr-2" />
          Thêm thể loại
        </button>
      </div>

      <div className="relative max-w-md">
        <Search
          size={20}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Tìm kiếm thể loại..."
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
                Tên thể loại
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
            {genres
              .filter((g) => g.name.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((genre) => (
                <tr key={genre.id} className="hover:bg-gray-750">
                  <td className="px-6 py-4 text-sm text-gray-300">{genre.id}</td>
                  <td className="px-6 py-4 text-sm font-medium text-white">{genre.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">{genre.slug}</td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => openEditModal(genre)}
                        className="text-green-400 hover:text-green-300"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteGenre(genre.id)}
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
        <GenreForm
          newGenre={newGenre}
          setNewGenre={setNewGenre}
          handleAddGenre={handleAddGenre}
          setShowAddModal={setShowAddModal}
          generateSlug={generateSlug}
        />
      )}

      {showEditModal && editingGenre && (
        <EditForm
          editingGenre={editingGenre}
          setEditingGenre={setEditingGenre}
          handleEditGenre={handleEditGenre}
          setShowEditModal={setShowEditModal}
          generateSlug={generateSlug}
        />
      )}
    </div>
  );
};

export default GenreManagement;
