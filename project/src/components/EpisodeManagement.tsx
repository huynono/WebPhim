import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { Plus, Edit3, Trash2, Play } from "lucide-react";

interface Movie {
  id: number;
  title: string;
}

interface Ad {
  id: number;
  type: "PRE_ROLL" | "MID_ROLL" | "OVERLAY";
  videoUrl: string;
  linkUrl?: string;
  movieId: number;
  movie?: Movie | null;
  startTime?: number | null;
  isSkippable: boolean;
  skipAfter?: number | null;
  createdAt: string;
  views?: number;
}

interface AdFormData {
  movieId: string;
  type: "PRE_ROLL" | "MID_ROLL" | "OVERLAY";
  startTime: string;
  videoUrl: string;
  file: File | null;
  isSkippable: boolean;
  skipAfter: string;
}
interface AxiosErrorLike {
  response?: {
    data?: {
      message?: string;
    };
  };
}

const AdManagement = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [form, setForm] = useState<AdFormData>({
    movieId: "",
    type: "PRE_ROLL",
    startTime: "",
    videoUrl: "",
    file: null,
    isSkippable: false,
    skipAfter: "",
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [ads, setAds] = useState<Ad[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  type AdResponse = Ad | { ad: Ad; message?: string };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // ===== GET ADS =====
  useEffect(() => {
    const fetchAds = async () => {
      try {
        const res = await axios.get<Ad[]>("http://localhost:3000/api/ads");
        setAds(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Lỗi lấy quảng cáo:", err);
        setAds([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAds();
  }, []);

  // ===== GET MOVIES =====
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        // Gọi API với pagination để lấy tất cả phim
        const res = await axios.get<{movies: Movie[]} | Movie[]>("http://localhost:3000/api/movies?page=1&limit=1000");
        const moviesData = Array.isArray(res.data) ? res.data : res.data.movies;
        setMovies(Array.isArray(moviesData) ? moviesData : []);
      } catch (err) {
        console.error("Lỗi lấy phim:", err);
        setMovies([]);
      }
    };
    fetchMovies();
  }, []);

  // ===== CREATE/UPDATE AD =====
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("movieId", form.movieId);
    formData.append("type", form.type);
    if (form.type === "MID_ROLL" && form.startTime) formData.append("startTime", form.startTime);
    if (form.type !== "OVERLAY") {
      formData.append("isSkippable", String(form.isSkippable));
      if (form.isSkippable && form.skipAfter) formData.append("skipAfter", form.skipAfter);
    }
    if (form.file) formData.append("video", form.file);
    if (form.videoUrl) {
      if (form.type === "OVERLAY") formData.append("linkUrl", form.videoUrl);
      else formData.append("videoUrl", form.videoUrl);
    }

    const handleError = (err: unknown, defaultMsg: string) => {
      console.error(defaultMsg, err);
      let message = defaultMsg;

      if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === "object" && err !== null) {
        const maybeAxiosError = err as AxiosErrorLike;
        if (maybeAxiosError.response?.data?.message) {
          message = maybeAxiosError.response.data.message;
        }
      }

      setNotification({ message, type: "error" });
    };

    if (editingAd) {
      // Update logic
      try {
        const res = await axios.put<AdResponse>(
          `http://localhost:3000/api/ads/${editingAd.id}`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        let updatedAd: Ad = "ad" in res.data ? res.data.ad : res.data;
        const movie = movies.find((m) => m.id === updatedAd.movieId) || null;
        updatedAd = { ...updatedAd, movie };

        setAds(ads.map(ad => ad.id === updatedAd.id ? updatedAd : ad));
        setShowAddModal(false);
        setEditingAd(null);
        setNotification({ message: "Cập nhật quảng cáo thành công!", type: "success" });
      } catch (err: unknown) {
        handleError(err, "Lỗi cập nhật quảng cáo");
      }
    } else {
      // Create logic
      try {
        if (!form.file && !form.videoUrl) {
          alert("Vui lòng chọn video hoặc nhập link/banner!");
          return;
        }

        const res = await axios.post<AdResponse>(
          "http://localhost:3000/api/ads",
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        let newAd: Ad = "ad" in res.data ? res.data.ad : res.data;
        const movie = movies.find((m) => m.id === newAd.movieId) || null;
        newAd = { ...newAd, movie };

        setAds([newAd, ...ads]);
        setShowAddModal(false);
        setForm({
          movieId: "",
          type: "PRE_ROLL",
          startTime: "",
          videoUrl: "",
          file: null,
          isSkippable: false,
          skipAfter: "",
        });
        setNotification({ message: "Thêm quảng cáo thành công!", type: "success" });
      } catch (err: unknown) {
        handleError(err, "Lỗi thêm quảng cáo");
      }
    }
  };

  const handleEditClick = useCallback((ad: Ad) => {
    setEditingAd(ad);
    setForm({
      movieId: String(ad.movieId),
      type: ad.type,
      startTime: String(ad.startTime || ""),
      videoUrl: ad.type === 'OVERLAY' ? ad.linkUrl || '' : ad.videoUrl || '',
      file: null,
      isSkippable: ad.isSkippable,
      skipAfter: String(ad.skipAfter || ""),
    });
    setShowAddModal(true);
  }, []);

  // ===== DELETE AD =====
  const handleDelete = useCallback(async (id: number) => {
    if (!window.confirm("Bạn có chắc muốn xóa quảng cáo này?")) return;

    try {
      await axios.delete(`http://localhost:3000/api/ads/${id}`);
      setAds(prevAds => prevAds.filter(ad => ad.id !== id));
      setNotification({ message: "Xóa quảng cáo thành công!", type: "success" });
    } catch (err: unknown) {
      console.error("Lỗi xóa quảng cáo:", err);

      let message = "Lỗi xóa quảng cáo";

      if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === "object" && err !== null) {
        const maybeAxiosError = err as AxiosErrorLike;
        if (maybeAxiosError.response?.data?.message) {
          message = maybeAxiosError.response.data.message;
        }
      }

      setNotification({ message, type: "error" });
    }
  }, []);


  // ===== FORM HANDLERS =====
  const handleFormChange = useCallback((field: keyof AdFormData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, file: e.target.files?.[0] || null }));
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowAddModal(false);
    setEditingAd(null);
  }, []);

  // ===== FORM MODAL =====
  const AdForm = useMemo(() => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">{editingAd ? "Chỉnh sửa quảng cáo" : "Thêm quảng cáo mới"}</h3>
          <button
            onClick={handleCloseModal}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Movie */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Chọn phim *
            </label>
            <select
              value={form.movieId}
              onChange={(e) => handleFormChange('movieId', e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              required
            >
              <option value="">Chọn phim</option>
              {movies.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>

          {/* Ad type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Loại quảng cáo *
              </label>
              <select
                value={form.type}
                onChange={(e) => handleFormChange('type', e.target.value as AdFormData["type"])}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              >
                <option value="PRE_ROLL">Pre-roll</option>
                <option value="MID_ROLL">Mid-roll</option>
                <option value="OVERLAY">Overlay</option>
              </select>
            </div>
            {form.type === "MID_ROLL" && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Thời điểm (giây)
                </label>
                <input
                  type="number"
                  value={form.startTime}
                  onChange={(e) => handleFormChange('startTime', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  placeholder="60"
                />
              </div>
            )}
          </div>

          {/* File / Link */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {form.type === "OVERLAY" ? "Video overlay (3-4s) & link" : "Chọn video quảng cáo *"}
            </label>
            <input
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="w-full text-gray-300"
            />
            <input
              type="text"
              placeholder={form.type === "OVERLAY" ? "Link khi click vào video overlay" : "Hoặc nhập link video"}
              value={form.videoUrl}
              onChange={(e) => handleFormChange('videoUrl', e.target.value)}
              className="w-full mt-2 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
            />
            {form.type === "OVERLAY" && (
              <p className="text-xs text-gray-400 mt-1">
                Khuyến nghị: Video ngắn 3-4 giây, định dạng MP4, tối đa 10MB
              </p>
            )}
          </div>

          {/* Preview */}
          {form.file && (
            <div className="mt-4">
              <video
                ref={videoRef}
                src={URL.createObjectURL(form.file)}
                controls
                className="w-full rounded-lg"
                style={{ maxHeight: form.type === "OVERLAY" ? "200px" : "400px" }}
              />
              {form.type === "OVERLAY" && (
                <p className="text-xs text-gray-400 mt-2">
                  Video sẽ tự động lặp lại khi hiển thị overlay
                </p>
              )}
            </div>
          )}



          {/* Skip settings */}
          {form.type !== "OVERLAY" && (
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={form.isSkippable}
                  onChange={(e) => handleFormChange('isSkippable', e.target.checked)}
                />
                <span>Cho phép skip</span>
              </label>

              {form.isSkippable && (
                <input
                  type="number"
                  min={0}
                  value={form.skipAfter}
                  onChange={(e) => handleFormChange('skipAfter', e.target.value)}
                  placeholder="Skip sau (giây)"
                  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1 text-white w-32"
                />
              )}
            </div>
          )}

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {editingAd ? "Cập nhật" : "Thêm quảng cáo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  ), [form, editingAd, movies, handleFormChange, handleFileChange, handleCloseModal, handleSubmit]);

  if (loading) return <p className="text-white">Đang tải...</p>;

  const Notification = () => {
    if (!notification) return null;
    const baseClasses = "fixed top-5 right-5 p-4 rounded-lg shadow-lg text-white z-[100]";
    const typeClasses = notification.type === 'success' ? "bg-green-600" : "bg-red-600";
    return (
      <div className={`${baseClasses} ${typeClasses}`}>
        {notification.message}
      </div>
    );
  };

  return (
    <div className="space-y-6 relative">
      <Notification />
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Quản lý Quảng cáo</h1>
        <button
          onClick={() => {
            setEditingAd(null);
            setForm({
              movieId: "",
              type: "PRE_ROLL",
              startTime: "",
              videoUrl: "",
              file: null,
              isSkippable: false,
              skipAfter: "",
            });
            setShowAddModal(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} className="mr-2" />
          Thêm quảng cáo
        </button>
      </div>

      {/* Ads list */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Phim</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Loại</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Video / Banner</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Thời điểm</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Skip sau (giây)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Lượt xem</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Ngày tạo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {ads.map((ad) => (
              <tr key={ad.id} className="hover:bg-gray-750">
                <td className="px-6 py-4 text-sm text-gray-300">{ad.movie?.title || "Không rõ"}</td>
                <td className="px-6 py-4 text-sm text-gray-300">{ad.type}</td>
                <td className="px-6 py-4 text-sm text-blue-400">
                  {ad.videoUrl ? (
                    <a href={ad.videoUrl} target="_blank" rel="noreferrer">
                      <Play size={14} className="inline mr-1" />
                      {ad.type === "OVERLAY" ? "Video Overlay" : "Xem"}
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-300">{ad.startTime ? `${ad.startTime}s` : "-"}</td>
                <td className="px-6 py-4 text-sm text-gray-300">{ad.isSkippable ? ad.skipAfter + "s" : "-"}</td>
                <td className="px-6 py-4 text-sm text-gray-300">{(ad.views || 0).toLocaleString()}</td>
                <td className="px-6 py-4 text-sm text-gray-300">{ad.createdAt ? new Date(ad.createdAt).toLocaleString("vi-VN") : "-"}</td>
                <td className="px-6 py-4 text-sm font-medium">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleEditClick(ad)}
                      className="text-green-400 hover:text-green-300"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(ad.id)}
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

      {showAddModal && AdForm}
    </div>
  );
};

export default AdManagement;
