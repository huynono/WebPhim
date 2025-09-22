import React from 'react';
import { Film, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-black text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Film className="h-8 w-8 text-red-600" />
              <h3 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-400 bg-clip-text text-transparent">
                MovieStream
              </h3>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Nền tảng xem phim trực tuyến hàng đầu với kho phim phong phú, 
              chất lượng cao và trải nghiệm xem tuyệt vời.
            </p>
            <div className="flex space-x-4">
              <Facebook className="h-5 w-5 text-gray-400 hover:text-blue-500 cursor-pointer transition-colors" />
              <Twitter className="h-5 w-5 text-gray-400 hover:text-blue-400 cursor-pointer transition-colors" />
              <Instagram className="h-5 w-5 text-gray-400 hover:text-pink-500 cursor-pointer transition-colors" />
              <Youtube className="h-5 w-5 text-gray-400 hover:text-red-500 cursor-pointer transition-colors" />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Liên kết nhanh</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-red-400 transition-colors">Trang chủ</a></li>
              <li><a href="#" className="text-gray-400 hover:text-red-400 transition-colors">Phim mới</a></li>
              <li><a href="#" className="text-gray-400 hover:text-red-400 transition-colors">Top phim</a></li>
              <li><a href="#" className="text-gray-400 hover:text-red-400 transition-colors">Thể loại</a></li>
              <li><a href="#" className="text-gray-400 hover:text-red-400 transition-colors">Quốc gia</a></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Thể loại phim</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-red-400 transition-colors">Hành động</a></li>
              <li><a href="#" className="text-gray-400 hover:text-red-400 transition-colors">Hài hước</a></li>
              <li><a href="#" className="text-gray-400 hover:text-red-400 transition-colors">Kinh dị</a></li>
              <li><a href="#" className="text-gray-400 hover:text-red-400 transition-colors">Tình cảm</a></li>
              <li><a href="#" className="text-gray-400 hover:text-red-400 transition-colors">Khoa học viễn tưởng</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Liên hệ</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-red-400" />
                <span className="text-gray-400 text-sm">contact@moviestream.vn</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-red-400" />
                <span className="text-gray-400 text-sm">+84 123 456 789</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-red-400" />
                <span className="text-gray-400 text-sm">Hà Nội, Việt Nam</span>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400 text-sm">
            © 2025 MovieStream. Tất cả quyền được bảo lưu.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;