import React, { useState, useEffect } from 'react';

interface HomeBanner {
  id: number;
  videoUrl: string;
  linkUrl: string;
  type: 'POPUP' | 'FIXED' | 'MIDDLE' | 'MOVIE_BANNER_1' | 'MOVIE_BANNER_2' | 'MOVIE_BANNER_3' | 'MOVIE_BANNER_4';
  isActive: boolean;
  viewCount: number;
  createdAt: string;
}

const HomeBannerManagement = () => {
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<HomeBanner | null>(null);
  const [formData, setFormData] = useState({
    videoUrl: '',
    linkUrl: '',
    type: 'POPUP' as 'POPUP' | 'FIXED' | 'MIDDLE' | 'MOVIE_BANNER_1' | 'MOVIE_BANNER_2' | 'MOVIE_BANNER_3' | 'MOVIE_BANNER_4'
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);

  // Fetch banners
  const fetchBanners = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/api/home-banners');
      const data = await response.json();
      setBanners(data);
    } catch (error) {
      console.error('Error fetching banners:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.linkUrl) {
      alert('Vui lòng nhập link URL');
      return;
    }

    if (!videoFile && !formData.videoUrl) {
      alert('Vui lòng upload video hoặc nhập link video');
      return;
    }

    try {
      setLoading(true);
      const formDataToSend = new FormData();
      formDataToSend.append('linkUrl', formData.linkUrl);
      formDataToSend.append('type', formData.type);
      
      if (videoFile) {
        formDataToSend.append('video', videoFile);
      } else if (formData.videoUrl) {
        formDataToSend.append('videoUrl', formData.videoUrl);
      }

      const url = editingBanner 
        ? `http://localhost:3000/api/home-banners/${editingBanner.id}`
        : 'http://localhost:3000/api/home-banners';
      
      const method = editingBanner ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        body: formDataToSend
      });

      if (response.ok) {
        await fetchBanners();
        resetForm();
        alert(editingBanner ? 'Cập nhật banner thành công!' : 'Tạo banner thành công!');
      } else {
        const error = await response.json();
        alert(error.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  // Delete banner
  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa banner này?')) return;

    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3000/api/home-banners/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchBanners();
        alert('Xóa banner thành công!');
      } else {
        alert('Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Error deleting banner:', error);
      alert('Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  // Toggle banner status
  const handleToggleStatus = async (id: number) => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3000/api/home-banners/${id}/toggle`, {
        method: 'PATCH'
      });

      if (response.ok) {
        await fetchBanners();
      } else {
        alert('Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      videoUrl: '',
      linkUrl: '',
      type: 'POPUP'
    });
    setVideoFile(null);
    setEditingBanner(null);
    setShowForm(false);
  };

  // Edit banner
  const handleEdit = (banner: HomeBanner) => {
    setEditingBanner(banner);
    setFormData({
      videoUrl: banner.videoUrl,
      linkUrl: banner.linkUrl,
      type: banner.type
    });
    setShowForm(true);
  };

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Quản lý Banner</h1>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
          >
            Thêm Banner Mới
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-gray-800 p-6 rounded-lg mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingBanner ? 'Chỉnh sửa Banner' : 'Thêm Banner Mới'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Loại Banner</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <optgroup label="Banner Trang Chủ">
                    <option value="POPUP">Popup (Giữa màn hình)</option>
                    <option value="FIXED">Fixed (Cố định cuối trang)</option>
                    <option value="MIDDLE">Middle (Giữa nội dung)</option>
                  </optgroup>
                  <optgroup label="Banner Trang Chi Tiết Phim">
                    <option value="MOVIE_BANNER_1">Banner 1 (Giữa video và nội dung)</option>
                    <option value="MOVIE_BANNER_2">Banner 2 (Sau bình luận)</option>
                    <option value="MOVIE_BANNER_3">Banner 3 (Dưới thông tin phim)</option>
                    <option value="MOVIE_BANNER_4">Banner 4 (Cố định cuối trang)</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Link URL</label>
                <input
                  type="url"
                  value={formData.linkUrl}
                  onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Upload Video</label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
                <p className="text-sm text-gray-400 mt-1">Hoặc nhập link video bên dưới</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Link Video (tùy chọn)</label>
                <input
                  type="url"
                  value={formData.videoUrl}
                  onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                  placeholder="https://example.com/video.mp4"
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-6 py-2 rounded-lg transition-colors"
                >
                  {loading ? 'Đang xử lý...' : (editingBanner ? 'Cập nhật' : 'Tạo Banner')}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded-lg transition-colors"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Banner List */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Video
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Link
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Loại
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Views
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Ngày tạo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {banners.map((banner) => (
                  <tr key={banner.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <video
                        src={banner.videoUrl}
                        className="w-20 h-12 object-cover rounded"
                        controls
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a
                        href={banner.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 truncate max-w-xs block"
                      >
                        {banner.linkUrl}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        banner.type === 'POPUP' ? 'bg-yellow-600' :
                        banner.type === 'FIXED' ? 'bg-green-600' :
                        banner.type === 'MIDDLE' ? 'bg-blue-600' :
                        banner.type === 'MOVIE_BANNER_1' ? 'bg-red-600' :
                        banner.type === 'MOVIE_BANNER_2' ? 'bg-purple-600' :
                        banner.type === 'MOVIE_BANNER_3' ? 'bg-indigo-600' :
                        banner.type === 'MOVIE_BANNER_4' ? 'bg-pink-600' : 'bg-gray-600'
                      }`}>
                        {banner.type.replace('MOVIE_BANNER_', 'Movie Banner ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(banner.id)}
                        className={`px-3 py-1 text-xs rounded-full ${
                          banner.isActive 
                            ? 'bg-green-600 hover:bg-green-700' 
                            : 'bg-red-600 hover:bg-red-700'
                        }`}
                      >
                        {banner.isActive ? 'Hoạt động' : 'Tạm dừng'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <span className="bg-blue-600 px-2 py-1 rounded-full text-xs">
                        {banner.viewCount || 0} views
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {new Date(banner.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(banner)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDelete(banner.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {banners.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-400">
            Chưa có banner nào. Hãy tạo banner đầu tiên!
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeBannerManagement;
