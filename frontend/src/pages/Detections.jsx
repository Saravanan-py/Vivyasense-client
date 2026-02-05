import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Eye, Trash2, AlertTriangle, Clock, MapPin, X } from 'lucide-react';
import { getDetections, deleteDetection, getDetectionImageUrl } from '../services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Loading from '../components/Loading';

const Detections = () => {
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    fetchDetections();
    const interval = setInterval(fetchDetections, 5000);
    return () => clearInterval(interval);
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (selectedImage) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedImage]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && selectedImage) {
        setSelectedImage(null);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [selectedImage]);

  const fetchDetections = async () => {
    try {
      const response = await getDetections({ limit: 100 });
      setDetections(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching detections:', error);
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this detection?')) return;
    
    try {
      await deleteDetection(id);
      toast.success('Detection deleted successfully');
      fetchDetections();
    } catch (error) {
      console.error('Error deleting detection:', error);
      toast.error('Failed to delete detection');
    }
  };

  const filteredDetections = detections.filter(d =>
    d.violation_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.object_class.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <Loading message="Loading detections" />;
  }

  return (
    <div className="space-y-6">
      {/* Simple Header */}
      <div className="bg-gray-800 rounded-xl shadow-lg p-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-3 rounded-lg">
              <AlertTriangle className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Detection Logs
              </h1>
              <p className="text-gray-400 mt-1 flex items-center text-sm">
                <Clock className="w-4 h-4 mr-1.5" />
                View and manage all security detections • {filteredDetections.length} Total Alerts
              </p>
            </div>
          </div>
          <button className="flex items-center px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-md text-sm font-medium">
            <Download className="w-4 h-4 mr-1.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-gray-800 rounded-xl shadow-lg p-5">
        <div className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by violation type or object class..."
              className="w-full pl-10 pr-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
            />
          </div>
          <button className="flex items-center px-3 py-2.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all text-sm font-medium">
            <Filter className="w-4 h-4 mr-1.5" />
            Filters
          </button>
        </div>
      </div>

      {/* All Detections Table */}
      <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden animate-fade-in">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-indigo-600">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Snapshot
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Violation Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Object Class
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Zone
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredDetections.map((detection) => (
                <tr key={detection.id} className="hover:bg-gray-700 transition-colors">
                  {/* Snapshot */}
                  <td className="px-4 py-3">
                    {detection.image_path ? (
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setSelectedImage(getDetectionImageUrl(detection.image_path))}>
                        <img
                          src={getDetectionImageUrl(detection.image_path)}
                          alt="Detection"
                          className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black opacity-0 hover:opacity-30 transition-opacity flex items-center justify-center">
                          <Eye className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-gray-500" />
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm font-medium text-white">#{detection.id}</span>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs font-medium rounded-lg ${
                      detection.violation_type === 'Fire Detection' || detection.violation_type === 'Smoke Detection'
                        ? 'bg-red-600 text-white animate-pulse'
                        : 'bg-indigo-600 text-white'
                    }`}>
                      {detection.violation_type}
                    </span>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-300 capitalize">{detection.object_class}</span>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${detection.confidence * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-white">
                        {(detection.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-300">
                      <MapPin className="w-4 h-4 mr-1 text-indigo-400" />
                      {detection.camera_location || 'Unknown Location'}
                    </div>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-400">
                      <Clock className="w-4 h-4 mr-1" />
                      {format(new Date(detection.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                    </div>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {detection.image_path && (
                        <button
                          onClick={() => setSelectedImage(getDetectionImageUrl(detection.image_path))}
                          className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-sm"
                          title="View Snapshot"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(detection.id)}
                        className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-sm"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedImage(null);
          }}
        >
          <div className="relative max-w-6xl w-full" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImage(null);
              }}
              className="absolute -top-12 right-0 p-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all shadow-md z-10"
              title="Close (ESC)"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Image */}
            <div className="bg-gray-900 rounded-xl overflow-hidden shadow-2xl">
              <img
                src={selectedImage}
                alt="Detection snapshot"
                className="w-full h-auto max-h-[80vh] object-contain"
                onError={(e) => {
                  console.error('Failed to load image:', selectedImage);
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23374151" width="400" height="300"/%3E%3Ctext fill="%23fff" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage not found%3C/text%3E%3C/svg%3E';
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Detections;
