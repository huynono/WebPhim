import { useState } from 'react';
import { Upload, Video, Image, User, FileText, Send, CheckCircle, XCircle } from 'lucide-react';

interface UploadResponse {
  message: string;
  upload: {
    id: number;
    title: string;
    description: string | null;
    videoUrl: string;
    posterUrl: string | null;
    senderName: string;
    status: string;
    createdAt: string;
  };
}

const UserUpload = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    senderName: '',
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [uploadId, setUploadId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Form, 2: Video Upload, 3: Poster Upload, 4: Success
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Kiểm tra định dạng video
      const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm'];
      if (!allowedTypes.includes(file.type)) {
        showToast('Vui lòng chọn file video hợp lệ (MP4, AVI, MOV, WMV, FLV, WEBM)', 'error');
        return;
      }
      
      // Kiểm tra kích thước file (tối đa 500MB)
      if (file.size > 500 * 1024 * 1024) {
        showToast('Kích thước file video không được vượt quá 500MB', 'error');
        return;
      }
      
      setVideoFile(file);
    }
  };

  const handlePosterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Kiểm tra định dạng hình ảnh
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        showToast('Vui lòng chọn file hình ảnh hợp lệ (JPG, PNG, GIF, WEBP)', 'error');
        return;
      }
      
      setPosterFile(file);
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast('Vui lòng nhập tiêu đề phim', 'error');
      return;
    }
    if (!formData.senderName.trim()) {
      showToast('Vui lòng nhập tên người gửi', 'error');
      return;
    }
    setStep(2);
  };

  const handleUploadVideo = async () => {
    if (!videoFile) {
      showToast('Vui lòng chọn video để upload', 'error');
      return;
    }

    setLoading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('video', videoFile);
      formDataUpload.append('title', formData.title);
      formDataUpload.append('description', formData.description);
      formDataUpload.append('senderName', formData.senderName);

      const response = await fetch('http://localhost:3000/api/user-uploads/video', {
        method: 'POST',
        body: formDataUpload,
      });

      const result: UploadResponse = await response.json();

      if (response.ok) {
        setUploadId(result.upload.id);
        setStep(3);
        showToast('Upload video thành công! Bây giờ bạn có thể upload poster (tùy chọn).', 'success');
      } else {
        showToast(result.message || 'Lỗi upload video', 'error');
      }
    } catch (error) {
      console.error('Upload video error:', error);
      showToast('Lỗi kết nối server', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPoster = async () => {
    if (!posterFile || !uploadId) {
      setStep(4);
      return;
    }

    setLoading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('poster', posterFile);
      formDataUpload.append('uploadId', uploadId.toString());

      const response = await fetch('http://localhost:3000/api/user-uploads/poster', {
        method: 'POST',
        body: formDataUpload,
      });

      const result = await response.json();

      if (response.ok) {
        showToast('Upload poster thành công!', 'success');
      } else {
        showToast(result.message || 'Lỗi upload poster', 'error');
      }
    } catch (error) {
      console.error('Upload poster error:', error);
      showToast('Lỗi kết nối server', 'error');
    } finally {
      setLoading(false);
      setStep(4);
    }
  };

  const handleSkipPoster = () => {
    setStep(4);
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', senderName: '' });
    setVideoFile(null);
    setPosterFile(null);
    setUploadId(null);
    setStep(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Gửi Video Cho Chúng Tôi</h1>
          <p className="text-gray-300">
            Chia sẻ video của bạn và chúng tôi sẽ xem xét để đăng lên website
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3, 4].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= stepNumber
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {stepNumber}
                </div>
                {stepNumber < 4 && (
                  <div
                    className={`w-12 h-1 mx-2 ${
                      step > stepNumber ? 'bg-red-600' : 'bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Form */}
        {step === 1 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-white mb-6 flex items-center">
              <FileText className="mr-2" />
              Thông tin phim
            </h2>
            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Tiêu đề phim *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-red-500 focus:outline-none"
                  placeholder="Nhập tiêu đề phim"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Mô tả phim</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-red-500 focus:outline-none"
                  placeholder="Nhập mô tả phim (tùy chọn)"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Tên người gửi *</label>
                <input
                  type="text"
                  name="senderName"
                  value={formData.senderName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-red-500 focus:outline-none"
                  placeholder="Nhập tên của bạn"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
              >
                Tiếp theo
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Video Upload */}
        {step === 2 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-white mb-6 flex items-center">
              <Video className="mr-2" />
              Upload Video
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Chọn file video *</label>
                <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-red-500 transition-colors">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoChange}
                    className="hidden"
                    id="video-upload"
                  />
                  <label htmlFor="video-upload" className="cursor-pointer">
                    <Video className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-300 mb-2">
                      {videoFile ? videoFile.name : 'Click để chọn video'}
                    </p>
                    <p className="text-sm text-gray-500">
                      Hỗ trợ: MP4, AVI, MOV, WMV, FLV, WEBM (tối đa 500MB)
                    </p>
                  </label>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  Quay lại
                </button>
                <button
                  onClick={handleUploadVideo}
                  disabled={!videoFile || loading}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
                >
                  {loading ? 'Đang upload...' : 'Upload Video'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Poster Upload */}
        {step === 3 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-white mb-6 flex items-center">
              <Image className="mr-2" />
              Upload Poster (Tùy chọn)
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Chọn poster phim</label>
                <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-red-500 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePosterChange}
                    className="hidden"
                    id="poster-upload"
                  />
                  <label htmlFor="poster-upload" className="cursor-pointer">
                    <Image className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-300 mb-2">
                      {posterFile ? posterFile.name : 'Click để chọn poster'}
                    </p>
                    <p className="text-sm text-gray-500">
                      Hỗ trợ: JPG, PNG, GIF, WEBP
                    </p>
                  </label>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={handleSkipPoster}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  Bỏ qua
                </button>
                <button
                  onClick={handleUploadPoster}
                  disabled={loading}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
                >
                  {loading ? 'Đang upload...' : 'Upload Poster'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-semibold text-white mb-4">Gửi Video Thành Công!</h2>
            <p className="text-gray-300 mb-6">
              Video của bạn đã được gửi và đang chờ admin duyệt. 
              Chúng tôi sẽ xem xét và thông báo kết quả sớm nhất.
            </p>
            <button
              onClick={resetForm}
              className="bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
            >
              Gửi Video Khác
            </button>
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
    </div>
  );
};

export default UserUpload;
