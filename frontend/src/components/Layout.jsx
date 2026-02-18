import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Video,
  Monitor,
  AlertTriangle,
  Factory,
  BarChart3,
  Menu,
  X
} from 'lucide-react';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Cameras', href: '/cameras', icon: Video },
    { name: 'Live Monitoring', href: '/monitoring', icon: Monitor },
    { name: 'Detections', href: '/detections', icon: AlertTriangle },
    { name: 'Factory Productivity', href: '/productivity', icon: Factory },
    { name: 'Productivity Dashboard', href: '/productivity-dashboard', icon: BarChart3 },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } bg-gray-900 shadow-xl`}
        style={{ width: '260px' }}
      >
        <div className="h-full px-3 py-4 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center justify-between mb-8 px-3">
            <div className="flex items-center space-x-2">
              <div className="bg-indigo-600 px-3 py-2 rounded-lg">
                <span className="text-2xl font-black text-white">VS</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">VivyaSense</h1>
                <p className="text-xs text-gray-300">AI Analytics</p>
              </div>
            </div>
            {/* Close Sidebar Button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
              title="Close Sidebar"
            >
              <X className="w-5 h-5 text-gray-300 hover:text-white" />
            </button>
          </div>

          {/* Navigation */}
          <ul className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 ${
                      active
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="ml-3 font-medium text-sm">{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Footer */}
          <div className="absolute bottom-4 left-0 right-0 px-6">
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-400">
                © 2026 VivyaSense
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-[260px]' : 'ml-0'}`}>
        {/* Top Bar - Only Menu Button */}
        {!sidebarOpen && (
          <div className="fixed top-4 left-4 z-30">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all shadow-lg"
              title="Open Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;

