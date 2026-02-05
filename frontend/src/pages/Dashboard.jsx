import React, { useState, useEffect } from 'react';
import { AlertTriangle, Video, Activity, TrendingUp, Clock, Flame, Eye } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getAnalyticsSummary, getAlertTypes, getZoneAlerts, getRecentDetections, getDetectionImageUrl } from '../services/api';
import { format } from 'date-fns';
import Loading from '../components/Loading';

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [alertTypes, setAlertTypes] = useState([]);
  const [zoneAlerts, setZoneAlerts] = useState([]);
  const [recentDetections, setRecentDetections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [summaryRes, alertTypesRes, zoneAlertsRes, recentRes] = await Promise.all([
        getAnalyticsSummary(),
        getAlertTypes(7),
        getZoneAlerts(7),
        getRecentDetections(5)
      ]);
      
      setSummary(summaryRes.data);
      setAlertTypes(alertTypesRes.data);
      setZoneAlerts(zoneAlertsRes.data);
      setRecentDetections(recentRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const COLORS = ['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc'];

  if (loading) {
    return <Loading message="Loading dashboard" />;
  }

  return (
    <div className="space-y-6">
      {/* Simple Header */}
      <div className="bg-gray-800 rounded-xl shadow-lg p-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Dashboard
            </h1>
            <p className="text-gray-400 mt-1">
              Real-time AI Video Analytics & Monitoring
            </p>
          </div>
          <div className="flex items-center space-x-2 bg-gray-700 px-4 py-2 rounded-lg">
            <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-gray-300 text-sm font-medium">Active</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Violations"
          value={summary?.total_violations || 0}
          icon={AlertTriangle}
          trend="+12%"
        />
        <StatCard
          title="Today's Alerts"
          value={summary?.violations_today || 0}
          icon={Activity}
          trend="+5%"
        />
        <StatCard
          title="Active Cameras"
          value={`${summary?.active_cameras || 0}/${summary?.total_cameras || 0}`}
          icon={Video}
        />
        <StatCard
          title="Detection Rate"
          value="98.5%"
          icon={TrendingUp}
          color="blue"
          trend="+2.1%"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alert Types Chart */}
        <div className="bg-gray-800 rounded-xl shadow-lg p-6 animate-fade-in">
          <h2 className="text-xl font-bold text-white mb-4">Frequent Alert Types</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={alertTypes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="violation_type" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
              <Bar dataKey="count" fill="#4f46e5" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Zone Alerts Chart */}
        <div className="bg-gray-800 rounded-xl shadow-lg p-6 animate-fade-in">
          <h2 className="text-xl font-bold text-white mb-4">Top Alert Zones</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={zoneAlerts}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ zone_name, percent }) => `${zone_name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#4f46e5"
                dataKey="count"
                nameKey="zone_name"
              >
                {zoneAlerts.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Detections */}
      <div className="bg-gray-800 rounded-xl shadow-lg p-6 animate-fade-in">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2 text-indigo-400" />
          Recent Detections
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Camera
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Violation Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {recentDetections.map((detection) => (
                <tr key={detection.id} className="hover:bg-gray-700 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white">
                    {detection.camera_name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-md bg-indigo-600 text-white">
                      {detection.violation_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                    {(detection.confidence * 100).toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                    {format(new Date(detection.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, trend }) => {
  return (
    <div className="group relative bg-gray-800 rounded-xl shadow-lg p-5 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-wide">{title}</p>
          <p className="text-3xl font-bold text-white mt-2">{value}</p>
          {trend && (
            <p className="text-sm font-medium mt-2 text-green-400 animate-slide-up">
              {trend}
            </p>
          )}
        </div>
        <div className="p-3 rounded-lg bg-indigo-600 shadow-md transform group-hover:scale-110 transition-all duration-300">
          <Icon className="w-8 h-8 text-white" />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

