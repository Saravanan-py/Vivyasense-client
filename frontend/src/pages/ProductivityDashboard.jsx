import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, TrendingDown, BarChart3, RefreshCw, Trash2, Target, Award, Sparkles, ChevronDown, Download, Calendar, Zap, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';
import toast from 'react-hot-toast';

// Premium CSS animations
const premiumStyles = `
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
  }

  @keyframes glow {
    0%, 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.3); }
    50% { box-shadow: 0 0 40px rgba(139, 92, 246, 0.6), 0 0 60px rgba(139, 92, 246, 0.4); }
  }

  @keyframes shimmer {
    0% { background-position: -1000px 0; }
    100% { background-position: 1000px 0; }
  }

  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(-30px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes pulse-glow {
    0%, 100% {
      opacity: 1;
      box-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
    }
    50% {
      opacity: 0.8;
      box-shadow: 0 0 40px rgba(139, 92, 246, 0.8), 0 0 60px rgba(139, 92, 246, 0.6);
    }
  }

  @keyframes gradient-shift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  .animate-float { animation: float 3s ease-in-out infinite; }
  .animate-glow { animation: glow 2s ease-in-out infinite; }
  .animate-shimmer {
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
    background-size: 1000px 100%;
    animation: shimmer 2s infinite;
  }
  .animate-slide-in-up { animation: slideInUp 0.6s ease-out forwards; }
  .animate-slide-in-right { animation: slideInRight 0.6s ease-out forwards; }
  .animate-scale-in { animation: scaleIn 0.5s ease-out forwards; }
  .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
  .animate-gradient {
    background-size: 200% 200%;
    animation: gradient-shift 3s ease infinite;
  }

  .glass-morphism {
    background: rgba(17, 24, 39, 0.7);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(139, 92, 246, 0.2);
  }

  .premium-gradient {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .premium-gradient-2 {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  }

  .premium-gradient-3 {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  }

  .premium-gradient-4 {
    background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  }

  .premium-text-gradient {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .hover-lift {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .hover-lift:hover {
    transform: translateY(-8px) scale(1.02);
    box-shadow: 0 20px 40px rgba(139, 92, 246, 0.3);
  }

  .stagger-animation {
    opacity: 0;
    animation: slideInUp 0.6s ease-out forwards;
  }

  .stagger-animation:nth-child(1) { animation-delay: 0.1s; }
  .stagger-animation:nth-child(2) { animation-delay: 0.2s; }
  .stagger-animation:nth-child(3) { animation-delay: 0.3s; }
  .stagger-animation:nth-child(4) { animation-delay: 0.4s; }

  /* Custom Scrollbar Styling */
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(139, 92, 246, 0.1);
    border-radius: 10px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 10px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
  }
`;

const ProductivityDashboard = () => {
  const [activeSessions, setActiveSessions] = useState([]);
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // New filter states
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCamera, setSelectedCamera] = useState('all');
  const [downloadType, setDownloadType] = useState('day-wise'); // 'day-wise' or 'combined'

  useEffect(() => {
    // Inject premium styles
    const styleSheet = document.createElement("style");
    styleSheet.innerText = premiumStyles;
    document.head.appendChild(styleSheet);

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 2000); // Refresh every 2 seconds
    return () => {
      clearInterval(interval);
      document.head.removeChild(styleSheet);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/api/productivity/dashboard/stats');
      setActiveSessions(response.data.active_sessions || []);
      setHistoricalData(response.data.historical_sessions || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId, isActive) => {
    if (!confirm('Are you sure you want to delete this session?')) {
      return;
    }

    try {
      await axios.delete(`/api/productivity/session/${sessionId}`);
      toast.success('Session deleted successfully');
      fetchDashboardData();
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete session');
    }
  };

  const downloadDayReport = async () => {
    try {
      const response = await axios.get('/api/productivity/download-excel-by-date', {
        params: { date: selectedDate },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `productivity_report_${selectedDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Day report downloaded');
    } catch (error) {
      console.error('Error downloading day report:', error);
      if (error.response?.status === 404) {
        toast.error('No sessions found for selected date');
      } else {
        toast.error('Failed to download day report');
      }
    }
  };

  const downloadFilteredReport = async () => {
    try {
      const params = {
        start_date: startDate,
        end_date: endDate,
        camera: selectedCamera !== 'all' ? selectedCamera : undefined,
        report_type: downloadType
      };

      const response = await axios.get('/api/productivity/download-excel-filtered', {
        params,
        responseType: 'blob'
      });

      const filename = downloadType === 'day-wise'
        ? `productivity_day_wise_${startDate}_to_${endDate}.xlsx`
        : `productivity_combined_${startDate}_to_${endDate}.xlsx`;

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`${downloadType === 'day-wise' ? 'Day-wise' : 'Combined'} report downloaded`);
    } catch (error) {
      console.error('Error downloading filtered report:', error);
      if (error.response?.status === 404) {
        toast.error('No sessions found for selected filters');
      } else {
        toast.error('Failed to download report');
      }
    }
  };

  // Format seconds to minutes or hours (0-60 minutes, then convert to hours)
  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return '0 min';
    const totalMinutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (totalMinutes >= 60) {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      if (minutes > 0) {
        return `${hours} hr ${minutes} min`;
      }
      return `${hours} hr`;
    }

    if (totalMinutes > 0 && remainingSeconds > 0) {
      return `${totalMinutes} min ${remainingSeconds} sec`;
    } else if (totalMinutes > 0) {
      return `${totalMinutes} min`;
    } else {
      return `${remainingSeconds} sec`;
    }
  };

  // Calculate overall statistics
  const calculateOverallStats = () => {
    const allSessions = [...activeSessions, ...historicalData];
    if (allSessions.length === 0) return { totalDowntime: '0 min', totalProductive: '0 min', avgEfficiency: 0, totalMachines: 0 };

    let totalDowntime = 0;
    let totalProductive = 0;
    let totalMachines = 0;

    allSessions.forEach(session => {
      session.roi_stats?.forEach(stat => {
        totalDowntime += stat.total_downtime || 0;
        totalProductive += stat.productive_time || 0;
        totalMachines++;
      });
    });

    const avgEfficiency = totalProductive + totalDowntime > 0
      ? (totalProductive / (totalProductive + totalDowntime)) * 100
      : 0;

    return {
      totalDowntime: formatDuration(totalDowntime),
      totalProductive: formatDuration(totalProductive),
      avgEfficiency: avgEfficiency.toFixed(2),
      totalMachines
    };
  };

  const stats = calculateOverallStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6 space-y-8">
      {/* Premium Animated Header */}
      <div className="glass-morphism rounded-3xl shadow-2xl p-8 animate-slide-in-up relative overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 opacity-20 animate-gradient premium-gradient"></div>

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500 rounded-2xl blur-xl opacity-50 animate-pulse-glow"></div>
              <div className="relative premium-gradient p-4 rounded-2xl animate-float">
                <BarChart3 className="w-10 h-10 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 animate-gradient">
                Productivity Dashboard
              </h1>
              <p className="text-purple-200 mt-2 text-lg font-medium flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                <span>Real-time monitoring with AI-powered insights</span>
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3 glass-morphism px-6 py-3 rounded-2xl animate-pulse-glow">
            <div className="relative">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-ping absolute"></div>
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            </div>
            <RefreshCw className="w-5 h-5 text-green-400 animate-spin" />
            <span className="text-white text-sm font-bold tracking-wide">LIVE</span>
          </div>
        </div>
      </div>

      {/* Premium Stats Cards with Stagger Animation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <PremiumStatCard
          title="Total Productive Time"
          value={stats.totalProductive}
          icon={TrendingUp}
          gradient="from-emerald-500 to-teal-500"
          delay="0.1s"
        />
        <PremiumStatCard
          title="Total Downtime"
          value={stats.totalDowntime}
          icon={TrendingDown}
          gradient="from-rose-500 to-pink-500"
          delay="0.2s"
        />
        <PremiumStatCard
          title="Average Efficiency"
          value={`${stats.avgEfficiency}%`}
          icon={Activity}
          gradient="from-blue-500 to-cyan-500"
          delay="0.3s"
        />
        <PremiumStatCard
          title="Machines Monitored"
          value={stats.totalMachines}
          icon={Target}
          gradient="from-amber-500 to-orange-500"
          delay="0.4s"
        />
      </div>

      {/* Premium Real-Time Active Sessions */}
      {activeSessions.length > 0 && (
        <div className="glass-morphism rounded-3xl shadow-2xl p-8 animate-slide-in-right relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-500 rounded-full blur-3xl opacity-10 animate-pulse"></div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-black text-white flex items-center space-x-3">
                <div className="relative">
                  <div className="w-4 h-4 bg-green-400 rounded-full animate-ping absolute"></div>
                  <div className="w-4 h-4 bg-green-400 rounded-full"></div>
                </div>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                  Live Monitoring
                </span>
                <span className="px-4 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-bold">
                  {activeSessions.length} Active
                </span>
              </h2>
            </div>
            <div className="space-y-4">
              {activeSessions.map((session, idx) => (
                <RealTimeSessionCard
                  key={idx}
                  session={session}
                  onDelete={() => handleDeleteSession(session.session_id, true)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Premium Download Reports Section - Enhanced with Filters */}
      <div className="glass-morphism rounded-3xl shadow-2xl p-8 animate-scale-in relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500 rounded-full blur-3xl opacity-10"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 rounded-full blur-3xl opacity-10"></div>

        <div className="relative z-10">
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 mb-6 flex items-center space-x-3">
            <Calendar className="w-8 h-8 text-blue-400" />
            <span>Download Reports</span>
          </h2>

          {/* Advanced Filters */}
          <div className="p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl border border-purple-500/20">
            <h3 className="text-lg font-bold text-purple-300 mb-4">Filter by Date Range & Camera</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Start Date */}
              <div>
                <label className="block text-sm text-purple-300 mb-2 font-semibold">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 glass-morphism text-white rounded-xl border-2 border-purple-500/30 focus:border-purple-500 focus:outline-none transition-all duration-300"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm text-purple-300 mb-2 font-semibold">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 glass-morphism text-white rounded-xl border-2 border-purple-500/30 focus:border-purple-500 focus:outline-none transition-all duration-300"
                />
              </div>

              {/* Camera Selection */}
              <div>
                <label className="block text-sm text-purple-300 mb-2 font-semibold">Camera/Machine</label>
                <select
                  value={selectedCamera}
                  onChange={(e) => setSelectedCamera(e.target.value)}
                  className="w-full px-4 py-3 glass-morphism text-white rounded-xl border-2 border-purple-500/30 focus:border-purple-500 focus:outline-none transition-all duration-300"
                >
                  <option value="all">All Cameras</option>
                  <option value="1">Machine 1</option>
                  <option value="2">Machine 2</option>
                  <option value="3">Machine 3</option>
                </select>
              </div>

              {/* Download Type */}
              <div>
                <label className="block text-sm text-purple-300 mb-2 font-semibold">Report Type</label>
                <select
                  value={downloadType}
                  onChange={(e) => setDownloadType(e.target.value)}
                  className="w-full px-4 py-3 glass-morphism text-white rounded-xl border-2 border-purple-500/30 focus:border-purple-500 focus:outline-none transition-all duration-300"
                >
                  <option value="day-wise">Day-wise Sheets</option>
                  <option value="combined">Combined Sheet</option>
                </select>
              </div>
            </div>

            {/* Download Button */}
            <div className="flex justify-end">
              <button
                onClick={downloadFilteredReport}
                className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl hover:shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 flex items-center space-x-2 font-bold hover-lift"
              >
                <Download className="w-5 h-5" />
                <span>Download {downloadType === 'day-wise' ? 'Day-wise' : 'Combined'} Report</span>
              </button>
            </div>

            {/* Info Text */}
            <div className="mt-4 text-xs text-purple-300/70 italic">
              {downloadType === 'day-wise'
                ? '📊 Day-wise: Separate sheet for each day in the date range'
                : '📋 Combined: All data in a single sheet'}
            </div>
          </div>
        </div>
      </div>

      {/* Premium Historical Data Section */}
      {historicalData.length > 0 && (
        <div className="glass-morphism rounded-3xl shadow-2xl p-8 animate-slide-in-up relative overflow-hidden">
          <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl opacity-10 animate-pulse"></div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 flex items-center space-x-3">
                <Award className="w-8 h-8 text-purple-400" />
                <span>Summarized Reports</span>
              </h2>
              <div className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-full text-sm font-bold">
                {historicalData.length} Sessions
              </div>
            </div>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {historicalData.map((session, idx) => (
                <HistoricalSessionCard
                  key={idx}
                  session={session}
                  onSelect={() => setSelectedSession(session)}
                  isSelected={selectedSession?.session_id === session.session_id}
                  onDelete={() => handleDeleteSession(session.session_id, false)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* No Data Message */}
      {activeSessions.length === 0 && historicalData.length === 0 && !loading && (
        <div className="bg-gray-800 rounded-xl shadow-lg p-12 text-center">
          <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400">No productivity data available</h3>
          <p className="text-gray-500 mt-2">Start monitoring from Factory Productivity page</p>
        </div>
      )}
    </div>
  );
};

// Premium Stat Card Component with Advanced Animations
const PremiumStatCard = ({ title, value, icon: Icon, gradient, delay = '0s' }) => {
  return (
    <div
      className="stagger-animation group relative glass-morphism rounded-3xl shadow-2xl p-6 hover-lift overflow-hidden"
      style={{ animationDelay: delay }}
    >
      {/* Animated background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-10 group-hover:opacity-20 transition-opacity duration-500`}></div>

      {/* Glow effect */}
      <div className={`absolute -inset-1 bg-gradient-to-r ${gradient} rounded-3xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500`}></div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-4 rounded-2xl bg-gradient-to-br ${gradient} shadow-lg transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
            <Icon className="w-8 h-8 text-white" />
          </div>
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-purple-300 animate-pulse" />
          </div>
        </div>

        <div>
          <p className="text-sm font-bold text-purple-200 uppercase tracking-wider mb-2">{title}</p>
          <p className="text-4xl font-black text-white group-hover:scale-105 transition-transform duration-300">{value}</p>
        </div>

        {/* Shimmer effect */}
        <div className="absolute inset-0 animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      </div>
    </div>
  );
};

// Real-Time Session Card Component
const RealTimeSessionCard = ({ session, onDelete }) => {
  // Format seconds to minutes or hours (0-60 minutes, then convert to hours)
  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return '0 min';
    const totalMinutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (totalMinutes >= 60) {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      if (minutes > 0) {
        return `${hours} hr ${minutes} min`;
      }
      return `${hours} hr`;
    }

    if (totalMinutes > 0 && remainingSeconds > 0) {
      return `${totalMinutes} min ${remainingSeconds} sec`;
    } else if (totalMinutes > 0) {
      return `${totalMinutes} min`;
    } else {
      return `${remainingSeconds} sec`;
    }
  };

  return (
    <div className="glass-morphism rounded-2xl p-6 border-l-4 border-green-400 hover-lift relative overflow-hidden group">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-4 h-4 bg-green-400 rounded-full animate-ping absolute"></div>
              <div className="w-4 h-4 bg-green-400 rounded-full"></div>
            </div>
            <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
              Live Session
            </h3>
          </div>
          <div className="flex items-center space-x-4">
            <div className="px-4 py-2 bg-green-500/20 rounded-xl">
              <span className="text-sm text-green-300 font-bold">
                ⏱️ {formatDuration(session.elapsed_time || 0)}
              </span>
            </div>
            <button
              onClick={onDelete}
              className="p-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:shadow-red-500/50 transition-all duration-300 hover:scale-110"
              title="Delete Session"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Premium Machine Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {session.roi_stats?.map((stat, index) => (
            <div key={index} className="glass-morphism rounded-2xl p-5 hover-lift">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-black text-white">Machine {index + 1}</h4>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${stat.is_red ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                  {stat.is_red ? '🔴 IDLE' : '🟢 ACTIVE'}
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center p-2 bg-yellow-500/10 rounded-lg">
                  <span className="text-yellow-200 font-semibold">Current Downtime:</span>
                  <span className="text-yellow-400 font-black">{formatDuration(stat.current_downtime)}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-red-500/10 rounded-lg">
                  <span className="text-red-200 font-semibold">Total Downtime:</span>
                  <span className="text-red-400 font-black">{formatDuration(stat.total_downtime)}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-green-500/10 rounded-lg">
                  <span className="text-green-200 font-semibold">Productive Time:</span>
                  <span className="text-green-400 font-black">{formatDuration(stat.productive_time)}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-blue-500/10 rounded-lg">
                  <span className="text-blue-200 font-semibold">Downtime Events:</span>
                  <span className="text-blue-400 font-black">{stat.downtime_count || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Historical Session Card Component
const HistoricalSessionCard = ({ session, onSelect, isSelected, onDelete }) => {
  // Format seconds to minutes or hours (0-60 minutes, then convert to hours)
  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return '0 min';
    const totalMinutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (totalMinutes >= 60) {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      if (minutes > 0) {
        return `${hours} hr ${minutes} min`;
      }
      return `${hours} hr`;
    }

    if (totalMinutes > 0 && remainingSeconds > 0) {
      return `${totalMinutes} min ${remainingSeconds} sec`;
    } else if (totalMinutes > 0) {
      return `${totalMinutes} min`;
    } else {
      return `${remainingSeconds} sec`;
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Calculate total downtime and productive time
  const calculateTotals = () => {
    if (!session.roi_stats || session.roi_stats.length === 0) return { downtime: 0, productive: 0, duration: 0 };
    const downtime = session.roi_stats.reduce((sum, stat) => sum + (stat.total_downtime || 0), 0);
    const productive = session.roi_stats.reduce((sum, stat) => sum + (stat.productive_time || 0), 0);
    const duration = downtime + productive;
    return { downtime, productive, duration };
  };

  const totals = calculateTotals();

  // Get start and end time from session
  const startTime = session.timestamp ? new Date(session.timestamp * 1000).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }) : 'N/A';

  const endTime = session.timestamp && totals.duration ? new Date((session.timestamp + totals.duration) * 1000).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }) : 'N/A';

  return (
    <div
      className={`glass-morphism rounded-2xl p-6 border-l-4 transition-all duration-500 hover-lift relative overflow-hidden group cursor-pointer ${
        isSelected ? 'border-purple-400 bg-purple-900/20' : 'border-gray-600'
      }`}
    >
      {/* Animated background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1" onClick={onSelect}>
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                Session Report
              </h3>
              {isSelected && (
                <ChevronDown className="w-5 h-5 text-purple-400 animate-bounce" />
              )}
            </div>
            <p className="text-sm text-purple-200 font-medium">{formatDate(session.timestamp)}</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Start Time */}
            <div className="text-right px-3 py-2 bg-blue-500/10 rounded-xl">
              <div className="text-xs text-blue-300 font-semibold">Start Time</div>
              <div className="text-sm font-black text-blue-400">{startTime}</div>
            </div>
            {/* End Time */}
            <div className="text-right px-3 py-2 bg-blue-500/10 rounded-xl">
              <div className="text-xs text-blue-300 font-semibold">End Time</div>
              <div className="text-sm font-black text-blue-400">{endTime}</div>
            </div>
            {/* Duration */}
            <div className="text-right px-3 py-2 bg-purple-500/10 rounded-xl">
              <div className="text-xs text-purple-300 font-semibold">Duration</div>
              <div className="text-sm font-black text-white">{formatDuration(totals.duration)}</div>
            </div>
            {/* Downtime */}
            <div className="text-right px-4 py-2 bg-red-500/20 rounded-xl">
              <div className="text-xs text-red-300 font-semibold">Downtime</div>
              <div className="text-lg font-black text-red-400">{formatDuration(totals.downtime)}</div>
            </div>
            {/* Productive */}
            <div className="text-right px-4 py-2 bg-green-500/20 rounded-xl">
              <div className="text-xs text-green-300 font-semibold">Productive</div>
              <div className="text-lg font-black text-green-400">{formatDuration(totals.productive)}</div>
            </div>
            {/* Delete Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:shadow-red-500/50 transition-all duration-300 hover:scale-110"
              title="Delete Session"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Premium Expandable Details */}
        {isSelected && (
          <div className="mt-6 pt-6 border-t border-purple-500/30 animate-slide-in-up">
            <h4 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-4 flex items-center space-x-2">
              <Zap className="w-5 h-5 text-purple-400" />
              <span>Machine Details</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {session.roi_stats?.map((stat, index) => (
                <div key={index} className="glass-morphism rounded-2xl p-5 hover-lift">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-md font-black text-white">Machine {index + 1}</h5>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center p-2 bg-red-500/10 rounded-lg">
                      <span className="text-red-200 font-semibold">Downtime:</span>
                      <span className="text-red-400 font-black">{formatDuration(stat.total_downtime)}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-green-500/10 rounded-lg">
                      <span className="text-green-200 font-semibold">Productive:</span>
                      <span className="text-green-400 font-black">{formatDuration(stat.productive_time)}</span>
                    </div>
                  </div>

                  {/* Visual Timeline - Idle (Red) and Active (Green) */}
                  {stat.downtime_periods && stat.downtime_periods.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-purple-500/20">
                      <div className="text-xs text-purple-300 mb-3 font-bold flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>Activity Timeline:</span>
                      </div>
                      {/* Timeline Bar */}
                      <div className="relative h-6 bg-green-500/20 rounded-lg overflow-hidden mb-4">
                        {stat.downtime_periods.map((period, pidx) => {
                          const totalDuration = stat.total_downtime + stat.productive_time;
                          const startPercent = (period.start / totalDuration) * 100;
                          const widthPercent = (period.duration / totalDuration) * 100;
                          return (
                            <div
                              key={pidx}
                              className="absolute h-full bg-red-500 hover:bg-red-400 transition-colors cursor-pointer"
                              style={{
                                left: `${startPercent}%`,
                                width: `${widthPercent}%`
                              }}
                              title={`Idle: ${period.start_time_ist || period.start.toFixed(1) + 's'} - ${period.end_time_ist || period.end.toFixed(1) + 's'} (${formatDuration(period.duration)})`}
                            />
                          );
                        })}
                        {/* Legend overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="text-[10px] font-bold text-white/80 flex items-center space-x-3">
                            <span className="flex items-center space-x-1">
                              <div className="w-3 h-3 bg-red-500 rounded"></div>
                              <span>Idle</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <div className="w-3 h-3 bg-green-500 rounded"></div>
                              <span>Active</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Downtime Periods with Video Links */}
                      <div className="text-xs text-purple-300 mb-2 font-bold">Downtime Periods:</div>
                      <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                        {stat.downtime_periods.map((period, pidx) => (
                          <div key={pidx} className="text-xs text-purple-100 bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-lg px-3 py-2 border border-purple-500/20">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-semibold">{period.start_time_ist || period.start.toFixed(1) + 's'} → {period.end_time_ist || period.end.toFixed(1) + 's'}</div>
                                <div className="text-purple-300 mt-1">Duration: {formatDuration(period.duration)}</div>
                              </div>
                              {/* Video Link with Timestamp */}
                              {period.video_path && (
                                <a
                                  href={`/api/productivity/video-player/${period.video_path.split('/').pop()}?t=${period.start || 0}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-2 px-2 py-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 hover:scale-110 flex items-center space-x-1"
                                  title={`View Recording at ${period.start_time_ist || period.start.toFixed(1) + 's'}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span>📹</span>
                                  <span className="text-[10px] font-bold">Play</span>
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductivityDashboard;

