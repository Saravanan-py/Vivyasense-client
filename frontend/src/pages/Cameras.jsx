import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Video, MapPin, Trash2, Edit, Pencil } from 'lucide-react';
import { getCameras, deleteCamera } from '../services/api';
import toast from 'react-hot-toast';
import AddCameraModal from '../components/AddCameraModal';
import EditCameraModal from '../components/EditCameraModal';
import ROIDrawingModal from '../components/ROIDrawingModal';
import Loading from '../components/Loading';

const Cameras = () => {
  const navigate = useNavigate();
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showROIModal, setShowROIModal] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState(null);

  useEffect(() => {
    fetchCameras();
  }, []);

  const fetchCameras = async () => {
    try {
      const response = await getCameras();
      setCameras(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching cameras:', error);
      toast.error('Failed to fetch cameras');
      setLoading(false);
    }
  };



  const handleDeleteCamera = async (id) => {
    if (!window.confirm('Are you sure you want to delete this camera?')) return;

    try {
      await deleteCamera(id);
      toast.success('Camera deleted successfully');
      fetchCameras();
    } catch (error) {
      console.error('Error deleting camera:', error);
      toast.error('Failed to delete camera');
    }
  };

  const handleEditCamera = (camera) => {
    setSelectedCamera(camera);
    setShowEditModal(true);
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    setSelectedCamera(null);
    fetchCameras();
  };

  const handleEnableROI = (camera) => {
    setSelectedCamera(camera);
    setShowROIModal(true);
  };

  const handleROISave = async (roiData) => {
    try {
      // Import the necessary functions
      const { createROI, updateCameraSettings, stopCamera, startCamera, getROIs, deleteROI } = await import('../services/api');

      // Delete all existing ROIs for this camera to avoid overlapping
      try {
        const existingROIsResponse = await getROIs(selectedCamera.id);
        const existingROIs = existingROIsResponse.data;

        if (existingROIs && existingROIs.length > 0) {
          // Delete all old ROIs
          for (const oldROI of existingROIs) {
            await deleteROI(oldROI.id);
          }
          toast.info(`Removed ${existingROIs.length} old ROI(s)`);
        }
      } catch (error) {
        console.error('Error deleting old ROIs:', error);
        // Continue even if deletion fails
      }

      // Save new ROI
      await createROI({
        ...roiData,
        camera_id: selectedCamera.id
      });

      // Enable ROI in camera settings
      await updateCameraSettings(selectedCamera.id, {
        roi_enabled: true
      });

      // Restart camera if it's active to load the new ROI
      if (selectedCamera.is_active) {
        await stopCamera(selectedCamera.id);
        // Wait a bit before restarting
        await new Promise(resolve => setTimeout(resolve, 1000));
        await startCamera(selectedCamera.id);
        toast.success('New ROI saved and camera restarted');
      } else {
        toast.success('New ROI saved successfully');
      }

      setShowROIModal(false);
      setSelectedCamera(null);
      fetchCameras();
    } catch (error) {
      console.error('Error saving ROI:', error);
      toast.error('Failed to save ROI: ' + (error.response?.data?.detail || error.message));
    }
  };

  if (loading) {
    return <Loading message="Loading cameras" />;
  }

  return (
    <div className="space-y-6">
      {/* Simple Header */}
      <div className="bg-gray-800 rounded-xl shadow-lg p-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-3 rounded-lg">
              <Video className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Camera Management
              </h1>
              <p className="text-gray-400 mt-1">
                Configure and manage your IP cameras with AI detection
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-md text-sm font-medium"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Camera
          </button>
        </div>
      </div>

      {/* Cameras Table - Simple List View */}
      {cameras.length === 0 ? (
        <div className="bg-gray-800 rounded-xl shadow-lg p-12 text-center animate-fade-in">
          <Video className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-2">No cameras configured</h3>
          <p className="text-gray-400 text-sm mb-4">Add your first IP camera to get started</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all text-sm font-medium"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Camera
          </button>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden animate-fade-in">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Camera Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {cameras.map((camera) => (
                <tr key={camera.id} className="hover:bg-gray-700 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <Video className="w-4 h-4 text-indigo-400 mr-2" />
                      <span className="text-sm font-medium text-white">{camera.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-400">
                      <MapPin className="w-3.5 h-3.5 mr-1" />
                      {camera.location || 'Not set'}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-xs text-gray-300">
                      {camera.custom_model === 'raw_stream' && '📹 Raw'}
                      {camera.custom_model === 'general_detection' && '🎯 General'}
                      {camera.custom_model === 'fire_detection' && '🔥 Fire'}
                      {camera.custom_model === 'fall_detection' && '🚨 Fall'}
                      {camera.custom_model === 'ppe_detection' && '🦺 PPE'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {camera.is_active ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-600 text-white">
                        <div className="w-1.5 h-1.5 bg-white rounded-full mr-1.5 animate-pulse"></div>
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-600 text-gray-300">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-700 rounded-full h-1.5">
                        <div
                          className="bg-indigo-600 h-1.5 rounded-full"
                          style={{ width: `${camera.confidence_threshold * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-400">{(camera.confidence_threshold * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleEnableROI(camera)}
                        className="px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-all text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Enable ROI & Line Crossing"
                        disabled={!camera.is_active}
                      >
                        ROI
                      </button>
                      <button
                        onClick={() => handleEditCamera(camera)}
                        className="px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-all text-xs font-medium"
                        title="Edit Camera & Alert Settings"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCamera(camera.id)}
                        className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-all text-xs font-medium"
                        title="Delete"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Camera Modal */}
      {showAddModal && (
        <AddCameraModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchCameras();
          }}
        />
      )}

      {/* Edit Camera Modal */}
      {showEditModal && selectedCamera && (
        <EditCameraModal
          camera={selectedCamera}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCamera(null);
          }}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* ROI Drawing Modal */}
      {showROIModal && selectedCamera && (
        <ROIDrawingModal
          camera={selectedCamera}
          onClose={() => {
            setShowROIModal(false);
            setSelectedCamera(null);
          }}
          onSave={handleROISave}
          existingROI={selectedCamera.rois && selectedCamera.rois.length > 0 ? selectedCamera.rois[0] : null}
        />
      )}
    </div>
  );
};

export default Cameras;

