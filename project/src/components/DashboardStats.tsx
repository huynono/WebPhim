import React from 'react';
import { Film, Users, Play, Tag, TrendingUp } from 'lucide-react';

const DashboardStats = () => {
  const stats = [
    {
      title: 'Tổng số phim',
      value: '1,234',
      change: '+12%',
      icon: Film,
      color: 'bg-blue-600'
    },
    {
      title: 'Người dùng',
      value: '5,678',
      change: '+8%',
      icon: Users,
      color: 'bg-green-600'
    },
    {
      title: 'Tập phim',
      value: '12,456',
      change: '+15%',
      icon: Play,
      color: 'bg-purple-600'
    },
    {
      title: 'Thể loại',
      value: '24',
      change: '+2',
      icon: Tag,
      color: 'bg-orange-600'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <div className="text-gray-400">
          Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN')}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div
              key={index}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">{stat.title}</p>
                  <p className="text-2xl font-bold text-white mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <IconComponent size={24} className="text-white" />
                </div>
              </div>
              <div className="flex items-center mt-4">
                <TrendingUp size={16} className="text-green-500 mr-1" />
                <span className="text-green-500 text-sm font-medium">{stat.change}</span>
                <span className="text-gray-400 text-sm ml-2">so với tháng trước</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4">Phim mới nhất</h3>
          <div className="space-y-3">
            {['Phim A', 'Phim B', 'Phim C', 'Phim D'].map((movie, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <span className="text-gray-300">{movie}</span>
                <span className="text-sm text-gray-500">2 giờ trước</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4">Hoạt động gần đây</h3>
          <div className="space-y-3">
            {[
              'Đã thêm phim mới',
              'Cập nhật thông tin diễn viên',
              'Thêm tập phim mới',
              'Tạo thể loại mới'
            ].map((activity, index) => (
              <div key={index} className="flex items-center py-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-gray-300">{activity}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats