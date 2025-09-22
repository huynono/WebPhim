import React, { useState } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import MovieManagement from '../components/MovieManagement';
import CategoryManagement from '../components/CategoryManagement';
import GenreManagement from '../components/GenreManagement';
import EpisodeManagement from '../components/EpisodeManagement';
import ActorManagement from '../components/ActorManagement';
import UserManagement from '../components/UserManagement';
import UserUploadManagement from '../components/UserUploadManagement';
import DashboardStats from '../components/DashboardStats';
import HomeBannerManagement from '../components/HomeBannerManagement';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardStats />;
      case 'movies':
        return <MovieManagement />;
      case 'episodes':
        return <EpisodeManagement />;
      case 'user-uploads':
        return <UserUploadManagement />;
      case 'categories':
        return <CategoryManagement />;
      case 'genres':
        return <GenreManagement />;
      case 'actors':
        return <ActorManagement />;
      case 'users':
        return <UserManagement />;
      case 'home-banners':
        return <HomeBannerManagement />;
      default:
        return <DashboardStats />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 ml-64">
        <div className="p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Admin;