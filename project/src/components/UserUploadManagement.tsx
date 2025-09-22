import React, { useState, useEffect, useCallback } from 'react';
import { 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Calendar,
  Video,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Edit3,
  Trash2
} from 'lucide-react';

interface UserUpload {
  id: number;
  title: string;
  description: string | null;
  videoUrl: string;
  posterUrl: string | null;
  senderName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectReason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Genre {
  id: number;
  name: string;
  slug: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalUploads: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  limit: number;
}

const UserUploadManagement = () => {
  const [uploads, setUploads] = useState<UserUpload[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalUploads: 0,
    hasNextPage: false,
    hasPrevPage: false,
    limit: 10
  });
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedUpload, setSelectedUpload] = useState<UserUpload | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editPosterFile, setEditPosterFile] = useState<File | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalPosition, setModalPosition] = useState({ y: 0, isMaximized: false });
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Fetch uploads
  const fetchUploads = useCallback(async (page = 1, status = selectedStatus) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });
      if (status) params.append('status', status);

      const response = await fetch(`http://localhost:3000/api/user-uploads/admin/all?${params}`);
      const data = await response.json();

      if (response.ok) {
        setUploads(data.uploads || []);
        setPagination(data.pagination || pagination);
      } else {
        showToast(data.message || 'Lỗi tải dữ liệu', 'error');
      }
    } catch (error) {
      console.error('Error fetching uploads:', error);
      showToast('Lỗi kết nối server', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedStatus]);

  // Fetch genres
  const fetchGenres = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3000/api/genres');
      const data = await response.json();
      if (response.ok) {
        setGenres(data || []);
      }
    } catch (error) {
      console.error('Error fetching genres:', error);
    }
  }, []);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3000/api/categories');
      const data = await response.json();
      if (response.ok) {
        setCategories(data || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  useEffect(() => {
    fetchUploads();
    fetchGenres();
    fetchCategories();
  }, [fetchUploads, fetchGenres, fetchCategories]);

  // Handle status filter
  const handleStatusFilter = (status: string) => {
    setSelectedStatus(status);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    fetchUploads(page, selectedStatus);
  };

  // Handle approve
  const handleApprove = async (upload: UserUpload) => {
    setSelectedUpload(upload);
    setEditTitle(upload.title);
    setEditDescription(upload.description || '');
    setEditPosterFile(null);
    setSelectedGenres([]);
    setSelectedCategories([]);
    setModalPosition({ y: 0, isMaximized: false });
    setShowApproveModal(true);
  };

  // Handle approve with genre selection
  const handleApproveSubmit = async () => {
    if (!selectedUpload || selectedCategories.length === 0) {
      showToast('Vui lòng chọn ít nhất một danh mục cho phim', 'error');
      return;
    }

    if (!editTitle.trim()) {
      showToast('Vui lòng nhập tiêu đề phim', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append('categoryIds', JSON.stringify(selectedCategories.map(id => parseInt(id))));
      formData.append('genreIds', JSON.stringify(selectedGenres.map(id => parseInt(id))));
      formData.append('title', editTitle.trim());
      formData.append('description', editDescription.trim());
      
      if (editPosterFile) {
        formData.append('poster', editPosterFile);
      }

      const response = await fetch(`http://localhost:3000/api/user-uploads/admin/${selectedUpload.id}/approve`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        showToast('Duyệt video thành công!', 'success');
        fetchUploads(pagination.currentPage, selectedStatus);
        setShowApproveModal(false);
        setSelectedGenres([]);
        setSelectedCategories([]);
        setEditTitle('');
        setEditDescription('');
        setEditPosterFile(null);
        setSelectedUpload(null);
      } else {
        showToast(data.message || 'Lỗi duyệt video', 'error');
      }
    } catch (error) {
      console.error('Error approving upload:', error);
      showToast('Lỗi kết nối server', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle genre selection
  const handleGenreToggle = (genreId: string) => {
    setSelectedGenres(prev => 
      prev.includes(genreId) 
        ? prev.filter(id => id !== genreId)
        : [...prev, genreId]
    );
  };

  // Handle category selection
  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Handle modal dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    const startY = e.clientY - modalPosition.y;
    
    const handleMouseMove = (e: MouseEvent) => {
      const newY = e.clientY - startY;
      const maxY = window.innerHeight - 400; // Minimum height
      const minY = 50; // Maximum height from top
      
      setModalPosition(prev => ({
        ...prev,
        y: Math.max(minY, Math.min(maxY, newY))
      }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Toggle modal maximize/minimize
  const toggleModalSize = () => {
    setModalPosition(prev => ({
      ...prev,
      isMaximized: !prev.isMaximized,
      y: prev.isMaximized ? 0 : 50
    }));
  };

  // Handle edit approved upload
  const handleEdit = async (upload: UserUpload) => {
    setSelectedUpload(upload);
    setEditTitle(upload.title);
    setEditDescription(upload.description || '');
    setEditPosterFile(null);
    setSelectedGenres([]);
    setShowEditModal(true);
  };

  // Handle edit submit
  const handleEditSubmit = async () => {
    if (!selectedUpload || !editTitle.trim()) {
      showToast('Vui lòng nhập tiêu đề phim', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', editTitle.trim());
      formData.append('description', editDescription.trim());
      
      if (editPosterFile) {
        formData.append('poster', editPosterFile);
      }

      const response = await fetch(`http://localhost:3000/api/user-uploads/admin/${selectedUpload.id}/edit`, {
        method: 'PUT',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        showToast('Cập nhật video thành công!', 'success');
        fetchUploads(pagination.currentPage, selectedStatus);
        setShowEditModal(false);
        setEditTitle('');
        setEditDescription('');
        setEditPosterFile(null);
        setSelectedUpload(null);
      } else {
        showToast(data.message || 'Lỗi cập nhật video', 'error');
      }
    } catch (error) {
      console.error('Error editing upload:', error);
      showToast('Lỗi kết nối server', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete approved upload
  const handleDelete = async (upload: UserUpload) => {
    if (!confirm('Bạn có chắc muốn xóa video này? Hành động này sẽ xóa cả phim đã được duyệt và không thể hoàn tác!')) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/api/user-uploads/admin/${upload.id}/delete`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        showToast('Xóa video thành công!', 'success');
        fetchUploads(pagination.currentPage, selectedStatus);
      } else {
        showToast(data.message || 'Lỗi xóa video', 'error');
      }
    } catch (error) {
      console.error('Error deleting upload:', error);
      showToast('Lỗi kết nối server', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle reject
  const handleReject = async (upload: UserUpload) => {
    const rejectReason = prompt('Nhập lý do từ chối (video sẽ bị xóa hoàn toàn):');
    if (!rejectReason) return;

    if (!confirm('Bạn có chắc muốn từ chối và xóa video này? Hành động này không thể hoàn tác!')) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/api/user-uploads/admin/${upload.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rejectReason }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast('Từ chối và xóa video thành công!', 'success');
        fetchUploads(pagination.currentPage, selectedStatus);
      } else {
        showToast(data.message || 'Lỗi từ chối video', 'error');
      }
    } catch (error) {
      console.error('Error rejecting upload:', error);
      showToast('Lỗi kết nối server', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2 py-1 bg-yellow-600 text-yellow-100 rounded-full text-xs font-medium flex items-center gap-1"><Clock size={12} /> Chờ duyệt</span>;
      case 'APPROVED':
        return <span className="px-2 py-1 bg-green-600 text-green-100 rounded-full text-xs font-medium flex items-center gap-1"><CheckCircle size={12} /> Đã duyệt</span>;
      case 'REJECTED':
        return <span className="px-2 py-1 bg-red-600 text-red-100 rounded-full text-xs font-medium flex items-center gap-1"><XCircle size={12} /> Từ chối</span>;
      default:
        return <span className="px-2 py-1 bg-gray-600 text-gray-100 rounded-full text-xs font-medium">{status}</span>;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Quản lý Video Upload</h2>
        <button
          onClick={() => fetchUploads(pagination.currentPage, selectedStatus)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw size={16} className="mr-2" />
          Làm mới
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="text-gray-300">Trạng thái:</span>
          <select
            value={selectedStatus}
            onChange={(e) => handleStatusFilter(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
          >
            <option value="">Tất cả</option>
            <option value="PENDING">Chờ duyệt</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="REJECTED">Từ chối</option>
          </select>
        </div>
        <div className="text-gray-300">
          Tổng: {pagination.totalUploads} video
        </div>
      </div>

      {/* Uploads Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Video</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Thông tin</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Người gửi</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Trạng thái</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Ngày gửi</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {uploads.map((upload) => (
              <tr key={upload.id} className="hover:bg-gray-750">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    {upload.posterUrl ? (
                      <img
                        src={upload.posterUrl}
                        alt={upload.title}
                        className="w-16 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-12 bg-gray-700 rounded flex items-center justify-center">
                        <Video size={20} className="text-gray-400" />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <a
                        href={upload.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                      >
                        Xem video
                      </a>
                      {upload.posterUrl && (
                        <a
                          href={upload.posterUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-400 hover:text-green-300 text-sm"
                        >
                          Xem poster
                        </a>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="max-w-xs">
                    <h3 className="text-white font-medium text-sm line-clamp-2">{upload.title}</h3>
                    {upload.description && (
                      <p className="text-gray-400 text-xs mt-1 line-clamp-2">{upload.description}</p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <User size={16} className="text-gray-400" />
                    <span className="text-gray-300 text-sm">{upload.senderName}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {getStatusBadge(upload.status)}
                  {upload.status === 'REJECTED' && upload.rejectReason && (
                    <div className="text-red-400 text-xs mt-1 max-w-xs">
                      Lý do: {upload.rejectReason}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <Calendar size={16} className="text-gray-400" />
                    <span className="text-gray-300 text-sm">{formatDate(upload.createdAt)}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    {upload.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleApprove(upload)}
                          disabled={actionLoading}
                          className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                          title="Duyệt"
                        >
                          <CheckCircle size={16} />
                        </button>
                        <button
                          onClick={() => handleReject(upload)}
                          disabled={actionLoading}
                          className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                          title="Từ chối"
                        >
                          <XCircle size={16} />
                        </button>
                      </>
                    )}
                    {upload.status === 'APPROVED' && (
                      <>
                        <button
                          onClick={() => handleEdit(upload)}
                          disabled={actionLoading}
                          className="p-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50"
                          title="Chỉnh sửa"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(upload)}
                          disabled={actionLoading}
                          className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                          title="Xóa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        setSelectedUpload(upload);
                        setShowModal(true);
                      }}
                      className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      title="Xem chi tiết"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {uploads.length === 0 && (
          <div className="text-center py-12">
            <Video size={48} className="text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">Không có video upload nào</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={!pagination.hasPrevPage}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-600 rounded-lg hover:bg-gray-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} className="mr-1" />
            Trước
          </button>

          <div className="flex space-x-1">
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const page = Math.max(1, Math.min(pagination.totalPages - 4, pagination.currentPage - 2)) + i;
              if (page > pagination.totalPages) return null;
              
              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    page === pagination.currentPage
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 bg-gray-800 border border-gray-600 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={!pagination.hasNextPage}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-600 rounded-lg hover:bg-gray-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Sau
            <ChevronRight size={16} className="ml-1" />
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Chỉnh sửa Video</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditTitle('');
                  setEditDescription('');
                  setEditPosterFile(null);
                  setSelectedUpload(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Tiêu đề phim *</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Nhập tiêu đề phim"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Mô tả phim</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Nhập mô tả phim"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Poster phim</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEditPosterFile(e.target.files?.[0] || null)}
                  className="w-full text-gray-300"
                />
                {selectedUpload.posterUrl && (
                  <div className="mt-2">
                    <p className="text-gray-400 text-sm mb-2">Poster hiện tại:</p>
                    <img
                      src={selectedUpload.posterUrl}
                      alt="Current poster"
                      className="w-32 h-20 object-cover rounded"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditTitle('');
                  setEditDescription('');
                  setEditPosterFile(null);
                  setSelectedUpload(null);
                }}
                className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
              >
                Hủy
              </button>
              <button
                onClick={handleEditSubmit}
                disabled={actionLoading || !editTitle.trim()}
                className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Đang cập nhật...' : 'Cập nhật Video'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div 
            className={`bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl transition-all duration-300 ${
              modalPosition.isMaximized ? 'h-[95vh]' : 'max-h-[80vh]'
            }`}
            style={{
              transform: `translateY(${modalPosition.y}px)`,
              height: modalPosition.isMaximized ? '95vh' : 'auto'
            }}
          >
            {/* Draggable Header */}
            <div 
              className="flex items-center justify-between p-4 border-b border-gray-700 cursor-move select-none"
              onMouseDown={handleMouseDown}
            >
              <div className="flex items-center space-x-3">
                <h3 className="text-xl font-bold text-white">Duyệt Video</h3>
                <span className="text-sm text-gray-400">({selectedUpload.senderName})</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleModalSize}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                  title={modalPosition.isMaximized ? "Thu nhỏ" : "Phóng to"}
                >
                  {modalPosition.isMaximized ? "⧉" : "⧈"}
                </button>
                <button
                  onClick={() => {
                    setShowApproveModal(false);
                    setSelectedGenres([]);
                    setSelectedCategories([]);
                    setEditTitle('');
                    setEditDescription('');
                    setEditPosterFile(null);
                    setSelectedUpload(null);
                    setModalPosition({ y: 0, isMaximized: false });
                  }}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto max-h-[calc(80vh-120px)] p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Basic Info */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 mb-2 font-medium">Tiêu đề phim *</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="Nhập tiêu đề phim"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2 font-medium">Mô tả phim</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={4}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none transition-colors resize-none"
                      placeholder="Nhập mô tả phim"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2 font-medium">Poster phim</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setEditPosterFile(e.target.files?.[0] || null)}
                      className="w-full text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                    />
                    {selectedUpload.posterUrl && (
                      <div className="mt-3">
                        <p className="text-gray-400 text-sm mb-2">Poster hiện tại:</p>
                        <img
                          src={selectedUpload.posterUrl}
                          alt="Current poster"
                          className="w-32 h-20 object-cover rounded border border-gray-600"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column - Categories & Genres */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 mb-2 font-medium">Chọn danh mục *</label>
                    <div className="max-h-48 overflow-y-auto bg-gray-700 border border-gray-600 rounded-lg p-3">
                      {categories.map((category) => (
                        <label key={category.id} className="flex items-center space-x-3 text-white hover:bg-gray-600 p-2 rounded cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(category.id.toString())}
                            onChange={() => handleCategoryToggle(category.id.toString())}
                            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                          />
                          <span className="text-sm font-medium">{category.name}</span>
                        </label>
                      ))}
                    </div>
                    {selectedCategories.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {selectedCategories.map(catId => {
                          const category = categories.find(c => c.id.toString() === catId);
                          return (
                            <span key={catId} className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                              {category?.name}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2 font-medium">Chọn thể loại (tùy chọn)</label>
                    <div className="max-h-48 overflow-y-auto bg-gray-700 border border-gray-600 rounded-lg p-3">
                      {genres.map((genre) => (
                        <label key={genre.id} className="flex items-center space-x-3 text-white hover:bg-gray-600 p-2 rounded cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedGenres.includes(genre.id.toString())}
                            onChange={() => handleGenreToggle(genre.id.toString())}
                            className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500 focus:ring-2"
                          />
                          <span className="text-sm font-medium">{genre.name}</span>
                        </label>
                      ))}
                    </div>
                    {selectedGenres.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {selectedGenres.map(genreId => {
                          const genre = genres.find(g => g.id.toString() === genreId);
                          return (
                            <span key={genreId} className="px-2 py-1 bg-green-600 text-white text-xs rounded-full">
                              {genre?.name}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center p-4 border-t border-gray-700 bg-gray-900 rounded-b-lg">
              <div className="text-sm text-gray-400">
                {selectedCategories.length > 0 && (
                  <span>Danh mục: {selectedCategories.length} • </span>
                )}
                {selectedGenres.length > 0 && (
                  <span>Thể loại: {selectedGenres.length}</span>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowApproveModal(false);
                    setSelectedGenres([]);
                    setSelectedCategories([]);
                    setEditTitle('');
                    setEditDescription('');
                    setEditPosterFile(null);
                    setSelectedUpload(null);
                    setModalPosition({ y: 0, isMaximized: false });
                  }}
                  className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleApproveSubmit}
                  disabled={actionLoading || selectedCategories.length === 0}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {actionLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Đang duyệt...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      <span>Duyệt Video</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showModal && selectedUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Chi tiết Video Upload</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Tiêu đề</label>
                <p className="text-white bg-gray-700 p-3 rounded-lg">{selectedUpload.title}</p>
              </div>

              {selectedUpload.description && (
                <div>
                  <label className="block text-gray-300 mb-2">Mô tả</label>
                  <p className="text-white bg-gray-700 p-3 rounded-lg">{selectedUpload.description}</p>
                </div>
              )}

              <div>
                <label className="block text-gray-300 mb-2">Người gửi</label>
                <p className="text-white bg-gray-700 p-3 rounded-lg">{selectedUpload.senderName}</p>
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Trạng thái</label>
                <div className="bg-gray-700 p-3 rounded-lg">
                  {getStatusBadge(selectedUpload.status)}
                  {selectedUpload.status === 'REJECTED' && selectedUpload.rejectReason && (
                    <p className="text-red-400 text-sm mt-2">Lý do: {selectedUpload.rejectReason}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Video</label>
                <video
                  src={selectedUpload.videoUrl}
                  controls
                  className="w-full rounded-lg"
                  style={{ maxHeight: '300px' }}
                />
              </div>

              {selectedUpload.posterUrl && (
                <div>
                  <label className="block text-gray-300 mb-2">Poster</label>
                  <img
                    src={selectedUpload.posterUrl}
                    alt="Poster"
                    className="w-full rounded-lg"
                    style={{ maxHeight: '300px', objectFit: 'contain' }}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-2">Ngày gửi</label>
                  <p className="text-white bg-gray-700 p-3 rounded-lg">{formatDate(selectedUpload.createdAt)}</p>
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Cập nhật cuối</label>
                  <p className="text-white bg-gray-700 p-3 rounded-lg">{formatDate(selectedUpload.updatedAt)}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
              >
                Đóng
              </button>
              {selectedUpload.status === 'PENDING' && (
                <>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      handleApprove(selectedUpload);
                    }}
                    disabled={actionLoading}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    Duyệt
                  </button>
                  <button
                    onClick={() => {
                      handleReject(selectedUpload);
                      setShowModal(false);
                    }}
                    disabled={actionLoading}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    Từ chối
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-50">
          <div
            className={`flex items-center p-4 rounded-lg shadow-lg ${
              toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            } text-white`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="h-5 w-5 mr-2" />
            ) : (
              <XCircle className="h-5 w-5 mr-2" />
            )}
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserUploadManagement;
