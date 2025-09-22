import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface TokenExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
}

const TokenExpiredModal: React.FC<TokenExpiredModalProps> = ({ isOpen, onClose, onLogin }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-md relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
            <h2 className="text-xl font-bold text-white">
              Phiên đăng nhập đã hết hạn
            </h2>
          </div>
          
          <p className="text-gray-300 mb-6">
            Phiên đăng nhập của bạn đã hết hạn. Vui lòng đăng nhập lại để tiếp tục sử dụng.
          </p>
          
          <div className="flex space-x-3">
            <button
              onClick={onLogin}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
            >
              Đăng nhập lại
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenExpiredModal;
