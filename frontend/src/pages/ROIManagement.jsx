import React, { useState, useEffect } from 'react';
import { Trash2, Eye, EyeOff, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { getCameras, getROIs, deleteROI, updateROI } from '../services/api';
import toast from 'react-hot-toast';
import Loading from '../components/Loading';

const ROIManagement = () => {
  const [cameras, setCameras] = useState([]);
  const [rois, setRois] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedROI, setExpandedROI] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const camerasResponse = await getCameras();
      setCameras(camerasResponse.data);

      // Fetch ROIs for all cameras
      const allRois = [];
      for (const camera of camerasResponse.data) {
        try {
          const roisResponse = await getROIs(camera.id);
          const cameraRois = roisResponse.data.map(roi => ({
            ...roi,
            cameraId: camera.id,
            cameraName: camera.name,
            cameraLocation: camera.location
          }));
          allRois.push(...cameraRois);
        } catch (error) {
          console.error(`Error fetching ROIs for camera ${camera.id}:`, error);
        }
      }
      setRois(allRois);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load ROI data');
      setLoading(false);
    }
  };

  const handleDeleteROI = async (roiId, cameraId) => {
    if (!window.confirm('Are you sure you want to delete this ROI?')) {
      return;
    }

    try {
      const { stopCamera, startCamera } = await import('../services/api');

      // Find the camera
      const camera = cameras.find(c => c.id === cameraId);
      const wasActive = camera?.is_active;

      // Stop camera if active
      if (wasActive) {
        await stopCamera(cameraId);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Delete ROI
      await deleteROI(roiId);
      toast.success('ROI deleted successfully');

      // Restart camera if it was active
      if (wasActive) {
        await new Promise(resolve => setTimeout(resolve, 500));
        await startCamera(cameraId);
        toast.info('Camera restarted');
      }

      fetchData();
    } catch (error) {
      console.error('Error deleting ROI:', error);
      toast.error('Failed to delete ROI: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleToggleActive = async (roi) => {
    try {
      await updateROI(roi.id, {
        is_active: !roi.is_active
      });
      toast.success(`ROI ${roi.is_active ? 'deactivated' : 'activated'}`);
      fetchData();
    } catch (error) {
      console.error('Error updating ROI:', error);
      toast.error('Failed to update ROI');
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">ROI Management</h1>
          <p className="text-gray-400 mt-1">Manage Region of Interest configurations</p>
        </div>
        <div className="text-sm text-gray-400">
          Total ROIs: <span className="text-white font-semibold">{rois.length}</span>
        </div>
      </div>

      {/* ROI List */}
      {rois.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-12 text-center">
          <MapPin className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No ROIs Configured</h3>
          <p className="text-gray-500">
            Go to Cameras page and click "Enable ROI" to create your first ROI
          </p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  ROI Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Camera
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Points
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Alert
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {rois.map((roi) => (
                <React.Fragment key={roi.id}>
                  <tr className="hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <button
                          onClick={() => setExpandedROI(expandedROI === roi.id ? null : roi.id)}
                          className="mr-2 text-gray-400 hover:text-white"
                        >
                          {expandedROI === roi.id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        <div
                          className="w-4 h-4 rounded-full mr-3"
                          style={{ backgroundColor: roi.color }}
                        ></div>
                        <span className="text-sm font-medium text-white">{roi.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-300">{roi.cameraName}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-400">{roi.cameraLocation || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-400">{roi.coordinates?.length || 0} points</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {roi.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-600 text-white">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-600 text-gray-300">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {roi.alert_enabled ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-600 text-white">
                          Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-600 text-gray-300">
                          Disabled
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleToggleActive(roi)}
                          className={`p-1.5 rounded transition-all ${
                            roi.is_active
                              ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                          title={roi.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {roi.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleDeleteROI(roi.id, roi.cameraId)}
                          className="p-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* Expanded ROI Points */}
                  {expandedROI === roi.id && (
                    <tr className="bg-gray-900">
                      <td colSpan="7" className="px-6 py-4">
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-white mb-3">ROI Coordinates:</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {roi.coordinates?.map((point, index) => (
                              <div
                                key={index}
                                className="bg-gray-800 rounded-lg p-3 border border-gray-600"
                              >
                                <div className="text-xs text-gray-400 mb-1">Point {index + 1}</div>
                                <div className="text-sm text-white font-mono">
                                  X: {Math.round(point[0])}, Y: {Math.round(point[1])}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ROIManagement;

