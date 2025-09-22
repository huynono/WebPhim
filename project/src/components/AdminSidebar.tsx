import React from 'react';
import { 
  Film, 
  Folder, 
  Tag, 
  Play, 
  Users, 
  UserCheck,
  BarChart3,
  LogOut,
  Upload,
  Home
} from 'lucide-react';

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'movies', label: 'Quản lý Phim', icon: Film },
    { id: 'episodes', label: 'Quảng cáo trong phim', icon: Play },
    { id: 'user-uploads', label: 'Video Upload', icon: Upload },
    { id: 'categories', label: 'Danh mục', icon: Folder },
    { id: 'genres', label: 'Tag', icon: Tag },
    { id: 'actors', label: 'Diễn viên', icon: Users },
      { id: 'users', label: 'Người dùng', icon: UserCheck },
      { id: 'home-banners', label: 'Banner trang chủ', icon: Home },
  ];

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-gray-800 border-r border-gray-700">
      <div className="p-6 border-b border-gray-700">
        <h2 className="text-xl font-bold text-white flex items-center">
          <Film className="mr-2" size={24} />
          Movie Admin
        </h2>
      </div>
      
      <nav className="mt-6">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center px-6 py-3 text-left transition-colors duration-200 ${
                activeTab === item.id
                  ? 'bg-blue-600 text-white border-r-2 border-blue-400'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <IconComponent size={20} className="mr-3" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="absolute bottom-0 w-full p-6 border-t border-gray-700">
        <button className="w-full flex items-center text-gray-300 hover:text-white transition-colors duration-200">
          <LogOut size={20} className="mr-3" />
          Đăng xuất
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar