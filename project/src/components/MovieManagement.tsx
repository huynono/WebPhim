import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, Edit3, Trash2, Eye, Upload, X, Film, PlayCircle, Image, Loader2, AlertCircle, LucideIcon, EyeOff, Copy, ChevronLeft, ChevronRight, CheckCircle, XCircle } from 'lucide-react';

interface Ad {
  id: number;
  imageUrl: string;
  link: string;
  movieId: number;
}

interface Movie {
  id: number;
  title: string;
  slug: string;
  description?: string;
  posterUrl?: string;
  backgroundUrl?: string;
  releaseYear?: number;
  country: string;
  status: string;
  type: string;
  isHidden?: boolean;
  createdAt: string;
  updatedAt: string;
  views?: number;
  categories: {
    movie: Movie;
    category: {
      id: number;
      name: string;
      slug: string;
    };
  }[];
  genres: {
    movie: Movie;
    genre: {
      id: number;
      name: string;
      slug: string;
    };
  }[];
  actors: {
    movie: Movie;
    actor: {
      id: number;
      name: string;
      avatar?: string;
      slug: string;
    };
  }[];
  episodes: {
    id: number;
    title: string;
    videoUrl: string;
    createdAt: string;
  }[];
  ads: Ad[];
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface Genre {
  id: number;
  name: string;
  slug: string;
}

interface Actor {
  id: number;
  name: string;
  avatar?: string;
  slug: string;
}

// Custom hook for debounced search
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Separate FileUploadSection component
const FileUploadSection = React.memo(({
  title,
  fileType,
  file,
  previewUrl,
  inputRef,
  accept,
  description,
  icon: Icon,
  onFileChange,
  onRemoveFile,
  uploading
}: {
  title: string;
  fileType: 'poster' | 'background' | 'video';
  file: File | null;
  previewUrl?: string;
  inputRef: React.RefObject<HTMLInputElement>;
  accept: string;
  description: string;
  icon: LucideIcon;
  onFileChange: (fileType: 'poster' | 'background' | 'video') => (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (fileType: 'poster' | 'background' | 'video') => void;
  uploading: boolean;
}) => (
  <div className="bg-gray-900 rounded-lg p-4">
    <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
      <Icon size={20} className="mr-2" />
      {title}
    </h4>
    <div className="space-y-3 sm:space-y-4">
      <div>
        <input
          type="file"
          ref={inputRef}
          onChange={onFileChange(fileType)}
          accept={accept}
          className="hidden"
        />

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            <Upload size={16} className="mr-2" />
            Chọn {fileType === 'video' ? 'Video' : 'Hình ảnh'}
          </button>

          {file && (
            <div className="flex flex-col sm:flex-row sm:items-center text-green-400 gap-2 sm:gap-0">
              <div className="flex items-center">
                <span className="text-sm truncate">{file.name}</span>
                <span className="text-xs text-gray-400 ml-2">
                  ({(file.size / 1024 / 1024).toFixed(1)} MB)
                </span>
              </div>
              <button
                type="button"
                onClick={() => onRemoveFile(fileType)}
                className="text-red-400 hover:text-red-300 p-1 self-start sm:self-auto sm:ml-2"
                disabled={uploading}
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-2">{description}</p>
      </div>

      {previewUrl && fileType !== 'video' && (
        <div className="mt-4">
          <img
            src={previewUrl}
            alt={`${fileType} preview`}
            className="w-full max-w-xs max-h-48 object-cover rounded-lg border border-gray-700"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x450?text=No+Image';
            }}
          />
        </div>
      )}

      {file && fileType === 'video' && (
        <div className="mt-4 p-3 bg-gray-800 rounded-lg">
          <div className="flex items-center text-blue-400">
            <PlayCircle size={16} className="mr-2" />
            <span className="text-sm">Video đã chọn: {file.name}</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Kích thước: {(file.size / 1024 / 1024).toFixed(1)} MB
          </p>
        </div>
      )}
    </div>
  </div>
));

interface MovieFormProps {
  isEdit?: boolean;
  handleCloseModal: (modalType: 'add' | 'edit' | 'view') => void;
  uploading: boolean;
  uploadProgress: number;
  handleUpdate: (e: React.FormEvent) => Promise<void>;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  formData: {
    title: string;
    slug: string;
    description: string;
    type: string;
    releaseYear: string;
    country: string;
    episodeTitle: string;
  };
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  categories: Category[];
  selectedCategories: number[];
  handleCategoryToggle: (categoryId: number) => void;
  files: {
    poster: File | null;
    background: File | null;
    video: File | null;
  };
  previewUrls: {
    poster: string;
    background: string;
  };
  posterInputRef: React.RefObject<HTMLInputElement>;
  backgroundInputRef: React.RefObject<HTMLInputElement>;
  videoInputRef: React.RefObject<HTMLInputElement>;
  handleFileChange: (fileType: 'poster' | 'background' | 'video') => (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveFile: (fileType: 'poster' | 'background' | 'video') => void;
  genres: Genre[];
  selectedGenres: number[];
  handleGenreToggle: (genreId: number) => void;
  actors: Actor[];
  selectedActors: number[];
  handleActorToggle: (actorId: number) => void;
  existingVideoUrl?: string;
}

const MovieForm = React.memo(({
  isEdit = false,
  handleCloseModal,
  uploading,
  uploadProgress,
  handleUpdate,
  handleSubmit,
  formData,
  handleInputChange,
  categories,
  selectedCategories,
  handleCategoryToggle,
  files,
  previewUrls,
  posterInputRef,
  backgroundInputRef,
  videoInputRef,
  handleFileChange,
  handleRemoveFile,
  genres,
  selectedGenres,
  handleGenreToggle,
  actors,
  selectedActors,
  handleActorToggle,
  existingVideoUrl,
}: MovieFormProps) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-800 p-4 sm:p-6 border-b border-gray-700 z-10">
          <div className="flex items-center justify-between">
            <h3 className="text-xl sm:text-2xl font-bold text-white">
              {isEdit ? 'Chỉnh sửa phim' : 'Thêm phim mới'}
            </h3>
            <button
              onClick={() => handleCloseModal(isEdit ? 'edit' : 'add')}
              className="text-gray-400 hover:text-white transition-colors p-1"
              disabled={uploading}
            >
              <X size={20} className="sm:w-6 sm:h-6" />
            </button>
          </div>

          {uploading && (
            <div className="mt-4">
              <div className="flex items-center space-x-3">
                <Loader2 className="animate-spin text-blue-500" size={16} />
                <span className="text-blue-400 text-sm">Đang tải lên...</span>
                <span className="text-gray-400 text-sm">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={isEdit ? handleUpdate : handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Basic Information */}
          <div className="bg-gray-900 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-white mb-4">Thông tin cơ bản</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tên phim *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nhập tên phim"
                  required
                  disabled={uploading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Slug *
                </label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ten-phim (tự động tạo từ tên phim)"
                  disabled={uploading}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Mô tả phim
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent h-32 resize-none"
                placeholder="Nhập mô tả chi tiết về phim..."
                disabled={uploading}
              />
            </div>
          </div>

          {/* Category and Information */}
          <div className="bg-gray-900 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-white mb-4">Phân loại và thông tin</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Năm phát hành
                </label>
                <input
                  type="number"
                  name="releaseYear"
                  value={formData.releaseYear}
                  onChange={handleInputChange}
                  min="1900"
                  max="2030"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="2024"
                  disabled={uploading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Quốc gia *
                </label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Việt Nam, Mỹ, Hàn Quốc..."
                  required
                  disabled={uploading}
                />
              </div>

            </div>
          </div>

          {/* Categories */}
          <div className="bg-gray-900 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-white mb-4">Danh mục phim</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {categories.map((category) => (
                <label key={category.id} className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.id)}
                    onChange={() => handleCategoryToggle(category.id)}
                    className="mr-2 rounded text-blue-600 focus:ring-blue-500 focus:ring-2"
                    disabled={uploading}
                  />
                  <span className="text-gray-300 text-sm">{category.name}</span>
                </label>
              ))}
            </div>
            {selectedCategories.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-gray-400 mb-2">Đã chọn:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedCategories.map(categoryId => {
                    const category = categories.find(c => c.id === categoryId);
                    return (
                      <span
                        key={categoryId}
                        className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full flex items-center"
                      >
                        {category?.name}
                        <button
                          type="button"
                          onClick={() => handleCategoryToggle(categoryId)}
                          className="ml-1 hover:text-gray-300"
                          disabled={uploading}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* File Uploads */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            <FileUploadSection
              title="Poster"
              fileType="poster"
              file={files.poster}
              previewUrl={previewUrls.poster}
              inputRef={posterInputRef}
              accept="image/*"
              description="Khuyến nghị: 300x450px, JPG/PNG, tối đa 10MB"
              icon={Image}
              onFileChange={handleFileChange}
              onRemoveFile={handleRemoveFile}
              uploading={uploading}
            />

            <FileUploadSection
              title="Hình nền"
              fileType="background"
              file={files.background}
              previewUrl={previewUrls.background}
              inputRef={backgroundInputRef}
              accept="image/*"
              description="Khuyến nghị: 1920x1080px, JPG/PNG, tối đa 10MB"
              icon={Image}
              onFileChange={handleFileChange}
              onRemoveFile={handleRemoveFile}
              uploading={uploading}
            />
          </div>

          {/* Video Upload - Always show for all movies */}
          <div>
              {isEdit && existingVideoUrl && !files.video && (
                <div className="mb-4 p-4 bg-gray-900 rounded-lg">
                  <h4 className="text-lg font-semibold text-white mb-2 flex items-center">
                    <PlayCircle size={20} className="mr-2" />
                    Video hiện tại
                  </h4>
                  <a href={existingVideoUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline break-all">
                    {existingVideoUrl}
                  </a>
                  <p className="text-xs text-gray-400 mt-2">
                    Chọn một video mới bên dưới sẽ thay thế video hiện tại.
                  </p>
                </div>
              )}
              <FileUploadSection
                title="Tải lên Video Mới"
                fileType="video"
                file={files.video}
                inputRef={videoInputRef}
                accept="video/*"
                description="Định dạng: MP4, AVI, MOV, tối đa 5GB"
                icon={Film}
                onFileChange={handleFileChange}
                onRemoveFile={handleRemoveFile}
                uploading={uploading}
              />
            </div>
          

          {/* Genres */}
          <div className="bg-gray-900 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-white mb-4">Thể loại phim</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {genres.map((genre) => (
                <label key={genre.id} className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedGenres.includes(genre.id)}
                    onChange={() => handleGenreToggle(genre.id)}
                    className="mr-2 rounded text-blue-600 focus:ring-blue-500 focus:ring-2"
                    disabled={uploading}
                  />
                  <span className="text-gray-300 text-sm">{genre.name}</span>
                </label>
              ))}
            </div>
            {selectedGenres.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-gray-400 mb-2">Đã chọn:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedGenres.map(genreId => {
                    const genre = genres.find(g => g.id === genreId);
                    return (
                      <span
                        key={genreId}
                        className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full flex items-center"
                      >
                        {genre?.name}
                        <button
                          type="button"
                          onClick={() => handleGenreToggle(genreId)}
                          className="ml-1 hover:text-gray-300"
                          disabled={uploading}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Actors */}
          <div className="bg-gray-900 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-white mb-4">Diễn viên</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {actors.map((actor) => (
                <label key={actor.id} className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedActors.includes(actor.id)}
                    onChange={() => handleActorToggle(actor.id)}
                    className="mr-2 rounded text-blue-600 focus:ring-blue-500 focus:ring-2"
                    disabled={uploading}
                  />
                  <span className="text-gray-300 text-sm">{actor.name}</span>
                </label>
              ))}
            </div>
            {selectedActors.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-gray-400 mb-2">Đã chọn:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedActors.map(actorId => {
                    const actor = actors.find(a => a.id === actorId);
                    return (
                      <span
                        key={actorId}
                        className="px-2 py-1 bg-green-600 text-white text-xs rounded-full flex items-center"
                      >
                        {actor?.name}
                        <button
                          type="button"
                          onClick={() => handleActorToggle(actorId)}
                          className="ml-1 hover:text-gray-300"
                          disabled={uploading}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="sticky bottom-0 bg-gray-800 p-4 sm:p-6 border-t border-gray-700 flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => handleCloseModal(isEdit ? 'edit' : 'add')}
              className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors w-full sm:w-auto"
              disabled={uploading}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : (
                <Plus size={16} className="mr-2" />
              )}
              {uploading ? 'Đang tải...' : (isEdit ? 'Cập nhật' : 'Thêm phim')}
            </button>
          </div>
        </form>
      </div>
    </div>
));

// Movie View Modal Component
const MovieViewModal = ({ movie, onClose }: { movie: Movie; onClose: () => void }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
    <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 bg-gray-800 p-4 sm:p-6 border-b border-gray-700 z-10">
        <div className="flex items-center justify-between">
          <h3 className="text-xl sm:text-2xl font-bold text-white">Chi tiết phim</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Movie Header */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Poster */}
          <div className="flex-shrink-0">
            {movie.posterUrl ? (
              <img
                src={movie.posterUrl}
                alt={movie.title}
                className="w-full max-w-xs mx-auto lg:mx-0 rounded-lg shadow-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?w=300";
                }}
              />
            ) : (
              <div className="w-full max-w-xs mx-auto lg:mx-0 h-96 bg-gray-700 rounded-lg flex items-center justify-center">
                <Film size={48} className="text-gray-500" />
              </div>
            )}
          </div>

          {/* Movie Info */}
          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{movie.title}</h1>
              <p className="text-gray-400 text-lg">{movie.country}</p>
              <p className="text-gray-500 text-sm">Slug: {movie.slug}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-gray-900 rounded-lg p-3">
                <p className="text-gray-400 text-sm">Danh mục</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {movie.categories?.map((categoryItem, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs bg-purple-900 text-purple-300 rounded"
                    >
                      {categoryItem.category?.name || 'N/A'}
                    </span>
                  ))}
                </div>
              </div>
              <div className="bg-gray-900 rounded-lg p-3">
                <p className="text-gray-400 text-sm">Năm phát hành</p>
                <p className="text-white font-semibold">{movie.releaseYear || 'N/A'}</p>
              </div>
              <div className="bg-gray-900 rounded-lg p-3">
                <p className="text-gray-400 text-sm">Lượt xem</p>
                <p className="text-white font-semibold">{(movie.views || 0).toLocaleString()}</p>
              </div>
              <div className="bg-gray-900 rounded-lg p-3">
                <p className="text-gray-400 text-sm">Trạng thái</p>
                <span className={`px-2 py-1 text-xs rounded-full ${movie.status === 'completed'
                  ? 'bg-green-900 text-green-300'
                  : 'bg-yellow-900 text-yellow-300'
                }`}>
                  {movie.status === 'completed' ? 'Hoàn thành' : 'Đang cập nhật'}
                </span>
              </div>
              <div className="bg-gray-900 rounded-lg p-3">
                <p className="text-gray-400 text-sm">Số tập</p>
                <p className="text-white font-semibold">{movie.episodes.length} tập</p>
              </div>
              <div className="bg-gray-900 rounded-lg p-3">
                <p className="text-gray-400 text-sm">Loại</p>
                <p className="text-white font-semibold">{movie.type}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {movie.description && (
          <div className="bg-gray-900 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-white mb-3">Mô tả</h4>
            <p className="text-gray-300 leading-relaxed">{movie.description}</p>
          </div>
        )}

        {/* Genres */}
        <div className="bg-gray-900 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-white mb-3">Thể loại</h4>
          <div className="flex flex-wrap gap-2">
            {movie.genres?.map((genreItem, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-blue-900 text-blue-300 rounded-full text-sm"
              >
                {genreItem.genre?.name || 'N/A'}
              </span>
            ))}
          </div>
        </div>

        {/* Actors */}
        <div className="bg-gray-900 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-white mb-3">Diễn viên</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {movie.actors?.map((actorItem, index) => (
              <div key={index} className="flex items-center space-x-3 bg-gray-800 rounded-lg p-3">
                {actorItem.actor?.avatar ? (
                  <img
                    src={actorItem.actor.avatar}
                    alt={actorItem.actor.name}
                    className="w-10 h-10 rounded-full object-cover border border-gray-600"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://via.placeholder.com/40x40.png?text=?";
                    }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-gray-300 text-sm">
                    ?
                  </div>
                )}
                <span className="text-white font-medium">{actorItem.actor?.name || 'N/A'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Episodes */}
        <div className="bg-gray-900 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-white mb-3">Danh sách tập phim</h4>
          <div className="space-y-2">
            {movie.episodes?.map((episode, index) => (
              <div key={episode.id} className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
                <div className="flex items-center space-x-3">
                  <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </span>
                  <span className="text-white font-medium">{episode.title}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {episode.videoUrl && (
                    <a
                      href={episode.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <PlayCircle size={20} />
                    </a>
                  )}
                  <span className="text-gray-400 text-sm">
                    {new Date(episode.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Background Image */}
        {movie.backgroundUrl && (
          <div className="bg-gray-900 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-white mb-3">Hình nền</h4>
            <img
              src={movie.backgroundUrl}
              alt={`${movie.title} background`}
              className="w-full max-w-2xl mx-auto rounded-lg shadow-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://via.placeholder.com/800x450.png?text=No+Image";
              }}
            />
          </div>
        )}

        {/* Timestamps */}
        <div className="bg-gray-900 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-white mb-3">Thông tin hệ thống</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Ngày tạo</p>
              <p className="text-white">{new Date(movie.createdAt).toLocaleString('vi-VN')}</p>
            </div>
            <div>
              <p className="text-gray-400">Cập nhật lần cuối</p>
              <p className="text-white">{new Date(movie.updatedAt).toLocaleString('vi-VN')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Close Button */}
      <div className="sticky bottom-0 bg-gray-800 p-4 sm:p-6 border-t border-gray-700">
        <button
          onClick={onClose}
          className="w-full px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          Đóng
        </button>
      </div>
    </div>
  </div>
);

// Pagination Component
const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  hasNextPage, 
  hasPrevPage 
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const start = Math.max(1, currentPage - 2);
      const end = Math.min(totalPages, start + maxVisible - 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  return (
    <div className="flex items-center justify-center space-x-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!hasPrevPage}
        className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronLeft size={16} className="mr-1" />
        Trước
      </button>

      {getPageNumbers().map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-3 py-2 text-sm font-medium rounded-lg ${
            page === currentPage
              ? 'bg-blue-600 text-white'
              : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-700'
          }`}
        >
          {page}
        </button>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNextPage}
        className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Sau
        <ChevronRight size={16} className="ml-1" />
      </button>
    </div>
  );
};

const MovieManagement = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [viewingMovie, setViewingMovie] = useState<Movie | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [selectedActors, setSelectedActors] = useState<number[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [actors, setActors] = useState<Actor[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalMovies: 0,
    hasNextPage: false,
    hasPrevPage: false,
    limit: 4
  });
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  }>({
    show: false,
    message: '',
    type: 'success'
  });

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    type: 'single',
    releaseYear: '',
    country: '',
    episodeTitle: ''
  });

  const [files, setFiles] = useState({
    poster: null as File | null,
    background: null as File | null,
    video: null as File | null
  });

  const [previewUrls, setPreviewUrls] = useState({
    poster: '',
    background: ''
  });

  // File input refs
  const posterInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Debounced search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const fetchMovies = useCallback(async (page = currentPage) => {
    try {
      setLoading(true);
      try {
        // Admin panel: 4 phim trên 1 trang
        const response = await fetch(`http://localhost:3000/api/movies?page=${page}&isAdmin=true&t=${Date.now()}`);
        if (response.ok) {
          const data = await response.json();
          // Xử lý response mới có pagination
          const moviesData = data.movies || data; // Backward compatibility
          console.log('Frontend - Fetched movies data:', moviesData.length, 'movies');
          console.log('Frontend - Movie 9 categories after refresh:', moviesData.find((m: Movie) => m.id === 9)?.categories);
          console.log('Frontend - Movie 9 categories length:', moviesData.find((m: Movie) => m.id === 9)?.categories?.length);
          console.log('Frontend - Movie 9 first category name:', moviesData.find((m: Movie) => m.id === 9)?.categories?.[0]?.category?.name);
          setMovies(moviesData);
          
          // Lưu thông tin pagination
          if (data.pagination) {
            setPagination(data.pagination);
          }
          return;
        }
      } catch {
  console.warn("Backend not available, using empty movies list");
  setMovies([]); // hoặc giữ nguyên state cũ nếu muốn
}

      setMovies([]);
    } catch (error) {
      console.warn('Error fetching movies:', error);
      setMovies([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch("http://localhost:3000/api/categories");
      if (response.ok) {
        const data = await response.json();
        const categoriesArray = Array.isArray(data) ? data : data.categories;
        setCategories(categoriesArray || []);
      } else {
        setCategories([]);
      }
    } catch {
  console.warn("Backend not available, using empty categories list");
  setCategories([]); // hoặc giữ nguyên state cũ nếu muốn
}

  }, []);

  const fetchGenres = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/genres`);
      if (response.ok) {
        const data = await response.json();
        const genresArray = Array.isArray(data) ? data : data.genres;
        setGenres(genresArray || []);
      } else {
        setGenres([]);
      }
    } catch (error) {
      console.warn("Error fetching genres:", error);
      setGenres([]);
    }
  }, []);

  const fetchActors = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/actors`);
      if (response.ok) {
        const data = await response.json();
        const actorsArray = Array.isArray(data) ? data : data.actors;
        setActors(actorsArray || []);
      } else {
        setActors([]);
      }
    } catch (error) {
      console.warn("Error fetching actors:", error);
      setActors([]);
    }
  }, []);

  // Fetch data on component mount
  useEffect(() => {
    const initializeData = async () => {
      await Promise.all([
        fetchMovies(),
        fetchCategories(),
        fetchGenres(),
        fetchActors()
      ]);
    };
    initializeData();
  }, [fetchMovies, fetchCategories, fetchGenres, fetchActors]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-generate slug from title
    if (name === 'title' && value) {
      const slug = value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setFormData(prev => ({
        ...prev,
        slug: slug
      }));
    }
  }, []);

  const handleFileChange = useCallback((fileType: 'poster' | 'background' | 'video') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    const maxSize = fileType === 'video' ? 5 * 1024 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`File ${fileType} quá lớn. Tối đa ${fileType === 'video' ? '5GB' : '10MB'}`);
      return;
    }

    // Validate file type
    if (fileType !== 'video' && !file.type.startsWith('image/')) {
      alert('Vui lòng chọn file hình ảnh');
      return;
    }
    if (fileType === 'video' && !file.type.startsWith('video/')) {
      alert('Vui lòng chọn file video');
      return;
    }

    setFiles(prev => ({
      ...prev,
      [fileType]: file
    }));

    // Create preview for images
    if (fileType !== 'video') {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrls(prev => ({
          ...prev,
          [fileType]: e.target?.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleRemoveFile = useCallback((fileType: 'poster' | 'background' | 'video') => {
    setFiles(prev => ({ ...prev, [fileType]: null }));
    if (fileType !== 'video') {
      setPreviewUrls(prev => ({ ...prev, [fileType]: '' }));
    }
    const inputRef = fileType === 'poster' ? posterInputRef : 
                    fileType === 'background' ? backgroundInputRef : videoInputRef;
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, []);

  const handleCategoryToggle = useCallback((categoryId: number) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  }, []);

  const handleGenreToggle = useCallback((genreId: number) => {
    setSelectedGenres(prev =>
      prev.includes(genreId)
        ? prev.filter(id => id !== genreId)
        : [...prev, genreId]
    );
  }, []);

  const handleActorToggle = useCallback((actorId: number) => {
    setSelectedActors(prev =>
      prev.includes(actorId)
        ? prev.filter(id => id !== actorId)
        : [...prev, actorId]
    );
  }, []);

  const resetForm = useCallback(() => {
    console.log('Frontend - Resetting form');
    setFormData({
      title: '',
      slug: '',
      description: '',
      type: 'single',
      releaseYear: '',
      country: '',
      episodeTitle: ''
    });
    setFiles({
      poster: null,
      background: null,
      video: null
    });
    setPreviewUrls({
      poster: '',
      background: ''
    });
    setSelectedCategories([]);
    setSelectedGenres([]);
    setSelectedActors([]);
    setUploading(false);
    setUploadProgress(0);
    
    // Clear file inputs
    if (posterInputRef.current) posterInputRef.current.value = '';
    if (backgroundInputRef.current) backgroundInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.country) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formDataToSend = new FormData();

      // Add text fields
      Object.entries(formData).forEach(([key, value]) => {
        if (value) {
          formDataToSend.append(key, value);
        }
      });

      // Add arrays - luôn gửi để có thể xóa tất cả nếu cần
      formDataToSend.append('categoryIds', JSON.stringify(selectedCategories));
      formDataToSend.append('genreIds', JSON.stringify(selectedGenres));
      formDataToSend.append('actorIds', JSON.stringify(selectedActors));

      // Add files
      if (files.poster) {
        formDataToSend.append('poster', files.poster);
      }
      if (files.background) {
        formDataToSend.append('background', files.background);
      }
      if (files.video) {
        formDataToSend.append('video', files.video);
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const response = await fetch(`http://localhost:3000/api/movies`, {
        method: 'POST',
        body: formDataToSend
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể tạo phim');
      }

      showToast('Thêm phim thành công!');
      setShowAddModal(false);
      resetForm();
      await fetchMovies(currentPage);

    } catch (error) {
      console.error('Error creating movie:', error);
      showToast(error instanceof Error ? error.message : 'Có lỗi xảy ra khi tạo phim', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [formData, selectedGenres, selectedActors, files, resetForm, fetchMovies]);

  const handleView = useCallback((movie: Movie) => {
    setViewingMovie(movie);
    setShowViewModal(true);
  }, []);

  const handleEdit = useCallback((movie: Movie) => {
    setEditingMovie(movie);
    setFormData({
      title: movie.title,
      slug: movie.slug,
      description: movie.description || '',
      type: movie.type,
      releaseYear: movie.releaseYear?.toString() || '',
      country: movie.country,
      episodeTitle: movie.episodes[0]?.title || ''
    });
    console.log('Frontend EDIT - movie.categories:', movie.categories);
    const categoryIds = movie.categories?.map(c => c.category.id) || [];
    console.log('Frontend EDIT - categoryIds:', categoryIds);
    
    setSelectedCategories(categoryIds);
    setSelectedGenres(movie.genres?.map(g => g.genre.id) || []);
    setSelectedActors(movie.actors?.map(a => a.actor.id) || []);
    
    console.log('Frontend - Set selectedCategories to:', categoryIds);
    console.log('Frontend - Set selectedGenres to:', movie.genres?.map(g => g.genre.id) || []);
    console.log('Frontend - Set selectedActors to:', movie.actors?.map(a => a.actor.id) || []);
    
    // Set existing image previews
    setPreviewUrls({
      poster: movie.posterUrl || '',
      background: movie.backgroundUrl || ''
    });
    
    setShowEditModal(true);
  }, []);

  const handleUpdate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMovie) return;

    setUploading(true);

    try {
      const formDataToSend = new FormData();

      // Add text fields
      Object.entries(formData).forEach(([key, value]) => {
        if (value) {
          formDataToSend.append(key, value);
        }
      });

      // Add arrays - luôn gửi để có thể xóa tất cả nếu cần
      console.log('Frontend UPDATE - selectedCategories:', selectedCategories);
      console.log('Frontend UPDATE - selectedGenres:', selectedGenres);
      console.log('Frontend UPDATE - selectedActors:', selectedActors);
      
      formDataToSend.append('categoryIds', JSON.stringify(selectedCategories));
      formDataToSend.append('genreIds', JSON.stringify(selectedGenres));
      formDataToSend.append('actorIds', JSON.stringify(selectedActors));

      // Add files only if new files are selected
      if (files.poster) {
        formDataToSend.append('poster', files.poster);
      }
      if (files.background) {
        formDataToSend.append('background', files.background);
      }
      if (files.video) {
        formDataToSend.append('video', files.video);
      }

      console.log('Frontend - Sending update request to:', `http://localhost:3000/api/movies/${editingMovie.id}`);
      const response = await fetch(`http://localhost:3000/api/movies/${editingMovie.id}`, {
        method: 'PUT',
        body: formDataToSend
      });

      console.log('Frontend - Update response status:', response.status);
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Frontend - Update error:', errorData);
        throw new Error(errorData.message || 'Không thể cập nhật phim');
      }

      showToast('Cập nhật phim thành công!');
      setShowEditModal(false);
      setEditingMovie(null);
      resetForm();
      console.log('Frontend - About to refresh movies after update');
      await fetchMovies(currentPage);
      console.log('Frontend - Movies refreshed after update');

    } catch (error) {
      console.error('Error updating movie:', error);
      showToast(error instanceof Error ? error.message : 'Có lỗi xảy ra khi cập nhật phim', 'error');
    } finally {
      setUploading(false);
    }
  }, [editingMovie, formData, selectedCategories, selectedGenres, selectedActors, files, resetForm, fetchMovies, currentPage]);

  const handleDelete = useCallback(async (movieId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa phim này?')) return;

    try {
      const response = await fetch(`http://localhost:3000/api/movies/${movieId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể xóa phim');
      }

      showToast('Xóa phim thành công!');
      await fetchMovies(currentPage);

    } catch (error) {
      console.error('Error deleting movie:', error);
      showToast(error instanceof Error ? error.message : 'Có lỗi xảy ra khi xóa phim', 'error');
    }
  }, [fetchMovies]);

  const handleToggleHidden = useCallback(async (movieId: number) => {
    try {
      const response = await fetch(`http://localhost:3000/api/movies/${movieId}/toggle-hidden`, {
        method: 'PATCH'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể thay đổi trạng thái phim');
      }

      const data = await response.json();
      showToast(data.message);
      await fetchMovies(currentPage);

    } catch (error) {
      console.error('Error toggling hidden status:', error);
      showToast(error instanceof Error ? error.message : 'Có lỗi xảy ra khi thay đổi trạng thái phim', 'error');
    }
  }, [fetchMovies]);

  const handleCopyMovie = useCallback(async (movieId: number) => {
    if (!confirm('Bạn có chắc chắn muốn copy phim này?')) return;

    try {
      const response = await fetch(`http://localhost:3000/api/movies/${movieId}/copy`, {
        method: 'POST'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể copy phim');
      }

      const data = await response.json();
      showToast(data.message);
      await fetchMovies(currentPage);

    } catch (error) {
      console.error('Error copying movie:', error);
      showToast(error instanceof Error ? error.message : 'Có lỗi xảy ra khi copy phim', 'error');
    }
  }, [fetchMovies]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    fetchMovies(page);
  }, [fetchMovies]);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  }, []);

  const handleCloseModal = useCallback((modalType: 'add' | 'edit' | 'view') => {
    if (modalType === 'edit') {
      setShowEditModal(false);
      setEditingMovie(null);
      resetForm();
    } else if (modalType === 'view') {
      setShowViewModal(false);
      setViewingMovie(null);
    } else {
      setShowAddModal(false);
      resetForm();
    }
  }, [resetForm]);

  // Memoized filtered movies to prevent unnecessary re-calculations
  const filteredMovies = useMemo(() => {
    if (!debouncedSearchTerm) return movies;
    return movies.filter(movie =>
      movie.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      movie.country.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [movies, debouncedSearchTerm]);


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-3">
          <Loader2 className="animate-spin text-blue-500" size={24} />
          <span className="text-white text-lg">Đang tải danh sách phim...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Quản lý Phim</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto"
        >
          <Plus size={20} className="mr-2" />
          Thêm phim
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm phim..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => fetchMovies(currentPage)}
          className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors w-full sm:w-auto"
        >
          Làm mới
        </button>
      </div>

      {/* Movies Table - Desktop */}
      <div className="hidden lg:block bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Phim
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Danh mục
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Thể loại
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Năm
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Lượt xem
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Ẩn/Hiện
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredMovies.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <AlertCircle size={48} className="mb-4" />
                      <p className="text-lg">Không có phim nào</p>
                      <p className="text-sm">Hãy thêm phim đầu tiên của bạn</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMovies.map((movie) => (
                  <tr key={`${movie.id}-${movie.updatedAt}-${Date.now()}`} className="hover:bg-gray-750 transition-colors">
                    <td className="px-4 lg:px-6 py-4">
                      <div className="flex items-center space-x-3">
                        {movie.posterUrl ? (
                          <img
                            className="h-12 w-8 lg:h-16 lg:w-12 object-cover rounded shadow-lg"
                            src={movie.posterUrl}
                            alt={movie.title}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?w=300";
                            }}
                          />
                        ) : (
                          <div className="h-12 w-8 lg:h-16 lg:w-12 bg-gray-700 rounded flex items-center justify-center">
                            <Film size={16} className="text-gray-500" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-white truncate">{movie.title}</div>
                          <div className="text-xs text-gray-400">{movie.country}</div>
                          <div className="text-xs text-gray-500 truncate">{movie.slug}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 lg:px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {movie.categories && movie.categories.length > 0 ? (
                          <>
                            {movie.categories.slice(0, 2).map((categoryItem, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 text-xs bg-purple-700 text-purple-300 rounded"
                              >
                                {categoryItem.category?.name ?? "N/A"}
                              </span>
                            ))}
                            {movie.categories.length > 2 && (
                              <span className="px-2 py-1 text-xs bg-gray-600 text-gray-400 rounded">
                                +{movie.categories.length - 2}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-gray-600 text-gray-400 rounded">
                            Chưa có danh mục
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 lg:px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {movie.genres?.slice(0, 2).map((genreItem, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded"
                          >
                            {genreItem.genre?.name ?? "N/A"}
                          </span>
                        ))}
                        {movie.genres?.length > 2 && (
                          <span className="px-2 py-1 text-xs bg-gray-600 text-gray-400 rounded">
                            +{movie.genres.length - 2}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {movie.releaseYear || 'N/A'}
                    </td>
                    
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${movie.status === 'completed'
                        ? 'bg-green-900 text-green-300'
                        : 'bg-yellow-900 text-yellow-300'
                        }`}>
                        {movie.status === 'completed' ? 'Hoàn thành' : 'Đang cập nhật'}
                      </span>
                    </td>

                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {movie.views?.toLocaleString() ?? '0'}
                    </td>
                    
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${movie.isHidden
                        ? 'bg-red-900 text-red-300'
                        : 'bg-green-900 text-green-300'
                        }`}>
                        {movie.isHidden ? 'Đã ẩn' : 'Hiển thị'}
                      </span>
                    </td>
                    
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleView(movie)}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleEdit(movie)}
                          className="text-green-400 hover:text-green-300 transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleHidden(movie.id)}
                          className={`transition-colors ${movie.isHidden 
                            ? 'text-yellow-400 hover:text-yellow-300' 
                            : 'text-orange-400 hover:text-orange-300'
                          }`}
                          title={movie.isHidden ? 'Hiện phim' : 'Ẩn phim'}
                        >
                          {movie.isHidden ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                        <button
                          onClick={() => handleCopyMovie(movie.id)}
                          className="text-purple-400 hover:text-purple-300 transition-colors"
                          title="Copy phim"
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(movie.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title="Xóa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {filteredMovies.length === 0 ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
            <div className="flex flex-col items-center justify-center text-gray-400">
              <AlertCircle size={48} className="mb-4" />
              <p className="text-lg">Không có phim nào</p>
              <p className="text-sm">Hãy thêm phim đầu tiên của bạn</p>
            </div>
          </div>
        ) : (
          filteredMovies.map((movie) => (
            <div key={`${movie.id}-${movie.updatedAt}-${Date.now()}`} className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <div className="flex items-start space-x-4">
                {movie.posterUrl ? (
                  <img
                    className="h-20 w-14 object-cover rounded shadow-lg flex-shrink-0"
                    src={movie.posterUrl}
                    alt={movie.title}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?w=300";
                    }}
                  />
                ) : (
                  <div className="h-20 w-14 bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                    <Film size={20} className="text-gray-500" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white truncate">{movie.title}</h3>
                  <p className="text-sm text-gray-400">{movie.country}</p>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${movie.status === 'completed'
                      ? 'bg-green-900 text-green-300'
                      : 'bg-yellow-900 text-yellow-300'
                      }`}>
                      {movie.status === 'completed' ? 'Hoàn thành' : 'Đang cập nhật'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {movie.categories && movie.categories.length > 0 ? (
                      <>
                        {movie.categories.slice(0, 2).map((categoryItem, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs bg-purple-900 text-purple-300 rounded"
                          >
                            {categoryItem.category?.name ?? "N/A"}
                          </span>
                        ))}
                        {movie.categories.length > 2 && (
                          <span className="px-2 py-1 text-xs bg-gray-600 text-gray-400 rounded">
                            +{movie.categories.length - 2}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="px-2 py-1 text-xs bg-gray-600 text-gray-400 rounded">
                        Chưa có danh mục
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {movie.genres?.slice(0, 3).map((genreItem, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs bg-blue-900 text-blue-300 rounded"
                      >
                        {genreItem.genre?.name ?? "N/A"}
                      </span>
                    ))}
                    {movie.genres?.length > 3 && (
                      <span className="px-2 py-1 text-xs bg-gray-600 text-gray-400 rounded">
                        +{movie.genres.length - 3}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <span>{movie.releaseYear || 'N/A'}</span>
                      <span>{movie.views?.toLocaleString() ?? '0'} lượt xem</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${movie.isHidden
                        ? 'bg-red-900 text-red-300'
                        : 'bg-green-900 text-green-300'
                        }`}>
                        {movie.isHidden ? 'Đã ẩn' : 'Hiển thị'}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleView(movie)}
                        className="text-blue-400 hover:text-blue-300 transition-colors p-1"
                        title="Xem chi tiết"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleEdit(movie)}
                        className="text-green-400 hover:text-green-300 transition-colors p-1"
                        title="Chỉnh sửa"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleToggleHidden(movie.id)}
                        className={`transition-colors p-1 ${movie.isHidden 
                          ? 'text-yellow-400 hover:text-yellow-300' 
                          : 'text-orange-400 hover:text-orange-300'
                        }`}
                        title={movie.isHidden ? 'Hiện phim' : 'Ẩn phim'}
                      >
                        {movie.isHidden ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      <button
                        onClick={() => handleCopyMovie(movie.id)}
                        className="text-purple-400 hover:text-purple-300 transition-colors p-1"
                        title="Copy phim"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(movie.id)}
                        className="text-red-400 hover:text-red-300 transition-colors p-1"
                        title="Xóa"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPageChange={handlePageChange}
        hasNextPage={pagination.hasNextPage}
        hasPrevPage={pagination.hasPrevPage}
      />

      {/* Modals */}
      {(showAddModal || showEditModal) && (
        <MovieForm
          isEdit={showEditModal}
          handleCloseModal={handleCloseModal}
          uploading={uploading}
          uploadProgress={uploadProgress}
          handleUpdate={handleUpdate}
          handleSubmit={handleSubmit}
          formData={formData}
          handleInputChange={handleInputChange}
          categories={categories}
          selectedCategories={selectedCategories}
          handleCategoryToggle={handleCategoryToggle}
          files={files}
          previewUrls={previewUrls}
          posterInputRef={posterInputRef}
          backgroundInputRef={backgroundInputRef}
          videoInputRef={videoInputRef}
          handleFileChange={handleFileChange}
          handleRemoveFile={handleRemoveFile}
          genres={genres}
          selectedGenres={selectedGenres}
          handleGenreToggle={handleGenreToggle}
          actors={actors}
          selectedActors={selectedActors}
          handleActorToggle={handleActorToggle}
          existingVideoUrl={editingMovie?.episodes?.[0]?.videoUrl}
        />
      )}

      {/* View Modal */}
      {showViewModal && viewingMovie && (
        <MovieViewModal
          movie={viewingMovie}
          onClose={() => handleCloseModal('view')}
        />
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
          <div className={`flex items-center space-x-3 px-4 py-3 rounded-lg shadow-lg ${
            toast.type === 'success' 
              ? 'bg-green-600 text-white' 
              : 'bg-red-600 text-white'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle size={20} />
            ) : (
              <XCircle size={20} />
            )}
            <span className="font-medium">{toast.message}</span>
            <button
              onClick={() => setToast(prev => ({ ...prev, show: false }))}
              className="ml-2 hover:opacity-70 transition-opacity"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovieManagement;
