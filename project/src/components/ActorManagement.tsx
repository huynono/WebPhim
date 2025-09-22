import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { Plus, Search, Edit3, Trash2, User } from "lucide-react";
import axios from "axios";

interface Actor {
  id: number;
  name: string;
  slug: string;
  avatar?: string;
  movieCount?: number;
}

const ActorManagement: React.FC = () => {
  const [actors, setActors] = useState<Actor[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [formData, setFormData] = useState<{
    id?: number;
    name: string;
    slug: string;
    avatarFile?: File | null;
    avatarPreview?: string;
    slugEdited?: boolean;
  }>({
    name: "",
    slug: "",
    avatarFile: null,
    avatarPreview: "",
    slugEdited: false,
  });

  // Fetch actors
  const fetchActors = async () => {
    try {
      const res = await axios.get<{ actors: Actor[] }>(
        "http://localhost:3000/api/actors"
      );
      setActors(res.data.actors);
    } catch (error) {
      console.error("Lỗi khi lấy actor:", error);
    }
  };

  useEffect(() => {
    fetchActors();
  }, []);

  // Open modal
  const openModal = (actor?: Actor) => {
  if (actor) {
    setIsEdit(true);
    setFormData({
      id: actor.id,
      name: actor.name,
      slug: actor.slug,
      avatarFile: null,
      avatarPreview: actor.avatar || "",
      slugEdited: false, // đặt false để có thể tự update khi đổi name
    });
  } else {
    setIsEdit(false);
    setFormData({ name: "", slug: "", avatarFile: null, avatarPreview: "", slugEdited: false });
  }
  setErrorMessage("");
  setShowModal(true);
};


  const closeModal = () => {
    setShowModal(false);
    setFormData({ name: "", slug: "", avatarFile: null, avatarPreview: "", slugEdited: false });
    setErrorMessage("");
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFormData(prev => ({
        ...prev,
        avatarFile: file,
        avatarPreview: URL.createObjectURL(file),
      }));
    }
  };

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, "d")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
  const { name, value } = e.target;
  setFormData(prev => {
    let updatedSlug = prev.slug;
    let slugEdited = prev.slugEdited;

    if (name === "name" && !prev.slugEdited) {
      // Nếu người dùng chưa chỉnh slug thủ công thì slug tự update
      updatedSlug = generateSlug(value);
    }

    if (name === "slug") {
      // Người dùng chỉnh slug trực tiếp
      slugEdited = true;
    }

    return {
      ...prev,
      [name]: value,
      slug: updatedSlug,
      slugEdited,
    };
  });
};


  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const data = new FormData();
      data.append("name", formData.name);
      const slugToSend = formData.slug.trim() || generateSlug(formData.name);
      data.append("slug", slugToSend);
      if (formData.avatarFile) data.append("avatar", formData.avatarFile);

      if (isEdit && formData.id) {
        const res = await axios.put<{ actor: Actor }>(
          `http://localhost:3000/api/actors/${formData.id}`,
          data
        );
        setActors(prev =>
          prev.map(a => (a.id === formData.id ? res.data.actor : a))
        );
      } else {
        const res = await axios.post<{ actor: Actor }>(
          "http://localhost:3000/api/actors",
          data
        );
        setActors(prev => [...prev, res.data.actor]);
      }

      closeModal();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa actor này?")) return;
    try {
      await axios.delete(`http://localhost:3000/api/actors/${id}`);
      setActors(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error("Lỗi khi xóa actor:", error);
    }
  };

  const filteredActors = actors.filter(actor =>
    actor.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header + Search */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Quản lý Diễn viên</h1>
        <button
          onClick={() => openModal()}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} className="mr-2" /> Thêm diễn viên
        </button>
      </div>

      <div className="relative max-w-md">
        <Search
          size={20}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Tìm kiếm diễn viên..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Actor grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredActors.map(actor => (
          <div
            key={actor.id}
            className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
          >
            <div className="text-center">
              <div className="relative mx-auto w-20 h-20 mb-4">
                {formData.avatarPreview && isEdit && formData.id === actor.id ? (
                  <img
                    src={formData.avatarPreview}
                    alt={actor.name}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : actor.avatar ? (
                  <img
                    src={actor.avatar}
                    alt={actor.name}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-700 rounded-full flex items-center justify-center">
                    <User size={32} className="text-gray-400" />
                  </div>
                )}
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">{actor.name}</h3>
              <p className="text-gray-400 text-sm mb-2">{actor.slug}</p>
              <p className="text-blue-400 text-sm font-medium mb-4">
                {actor.movieCount || 0} phim
              </p>

              <div className="flex justify-center space-x-2">
                <button
                  onClick={() => openModal(actor)}
                  className="p-2 text-green-400 hover:text-green-300 hover:bg-gray-700 rounded transition-colors"
                >
                  <Edit3 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(actor.id)}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">
                {isEdit ? "Chỉnh sửa diễn viên" : "Thêm diễn viên"}
              </h3>
              <button onClick={closeModal} className="text-white font-bold">
                Hủy
              </button>
            </div>

            {errorMessage && <p className="text-red-500 mb-2">{errorMessage}</p>}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tên diễn viên *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập tên diễn viên"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Slug
                </label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="ten-dien-vien"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Avatar
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-white"
                />
              </div>

              {formData.avatarPreview && (
                <div className="mb-4 text-center">
                  <img
                    src={formData.avatarPreview}
                    alt="Preview"
                    className="mx-auto w-24 h-24 object-cover rounded-full"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading
                    ? "Đang tải..."
                    : isEdit
                    ? "Lưu thay đổi"
                    : "Thêm diễn viên"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActorManagement;
