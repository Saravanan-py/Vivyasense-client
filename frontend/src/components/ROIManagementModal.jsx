import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Save, AlertTriangle, Play, Square } from 'lucide-react';
import { getROIs, createROI, deleteROI, updateROI, getRawStreamUrl, startCamera, stopCamera } from '../services/api';
import toast from 'react-hot-toast';

const ROIManagementModal = ({ camera, onClose, onSuccess }) => {
  const [rois, setROIs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const [points, setPoints] = useState([]);
  const [newROI, setNewROI] = useState({ name: '', color: '#FF0000', alert_enabled: true });
  const [cameraStarted, setCameraStarted] = useState(false);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    fetchROIs();
    // Don't auto-start camera - user must click Start button
    setCameraStarted(camera.is_active);
  }, [camera.id]);

  useEffect(() => {
    if (cameraStarted && canvasRef.current) {
      drawCanvas();
    }
  }, [rois, points, cameraStarted]);

  const fetchROIs = async () => {
    try {
      const response = await getROIs(camera.id);
      setROIs(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching ROIs:', error);
      toast.error('Failed to fetch ROIs');
      setLoading(false);
    }
  };

  const handleStartCamera = async () => {
    try {
      await startCamera(camera.id);
      setCameraStarted(true);
      toast.success('Camera started - Raw video feed enabled');
      // Wait a bit for stream to initialize
      setTimeout(() => {
        if (imageRef.current) {
          imageRef.current.src = getRawStreamUrl(camera.id) + '&t=' + Date.now();
        }
      }, 1500);
    } catch (error) {
      console.error('Error starting camera:', error);
      toast.error('Failed to start camera');
    }
  };

  const handleStopCamera = async () => {
    try {
      await stopCamera(camera.id);
      setCameraStarted(false);
      toast.success('Camera stopped');
    } catch (error) {
      console.error('Error stopping camera:', error);
      toast.error('Failed to stop camera');
    }
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw existing ROIs
    rois.forEach((roi) => {
      if (roi.coordinates && roi.coordinates.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = roi.color || '#FF0000';
        ctx.lineWidth = 3;
        ctx.fillStyle = (roi.color || '#FF0000') + '33'; // 20% opacity

        roi.coordinates.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point[0], point[1]);
          } else {
            ctx.lineTo(point[0], point[1]);
          }
        });
        ctx.closePath();
        ctx.stroke();
        ctx.fill();

        // Draw ROI name
        if (roi.coordinates.length > 0) {
          ctx.fillStyle = roi.color || '#FF0000';
          ctx.font = 'bold 16px Arial';
          ctx.fillText(roi.name, roi.coordinates[0][0], roi.coordinates[0][1] - 10);
        }
      }
    });

    // Draw current drawing
    if (points.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = newROI.color;
      ctx.lineWidth = 3;
      ctx.fillStyle = newROI.color + '33';

      points.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
        // Draw point circles
        ctx.fillStyle = newROI.color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
        ctx.fill();
      });

      if (points.length > 1) {
        ctx.closePath();
        ctx.strokeStyle = newROI.color;
        ctx.stroke();
      }
    }
  };

  const handleCanvasClick = (e) => {
    if (!drawing) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setPoints([...points, { x, y }]);
  };

  const handleStartDrawing = () => {
    if (!newROI.name.trim()) {
      toast.error('Please enter ROI name first');
      return;
    }
    setDrawing(true);
    setPoints([]);
  };

  const handleCompleteDrawing = () => {
    if (points.length < 3) {
      toast.error('Please draw at least 3 points');
      return;
    }
    setDrawing(false);
  };

  const handleSaveROI = async () => {
    if (points.length < 3) {
      toast.error('Please draw a ROI first');
      return;
    }

    try {
      const coordinates = points.map(p => [p.x, p.y]);
      await createROI({
        camera_id: camera.id,
        name: newROI.name,
        coordinates: coordinates,
        color: newROI.color,
        is_active: true,
        alert_enabled: newROI.alert_enabled
      });
      toast.success('ROI saved and added to live monitoring!');
      setPoints([]);
      setNewROI({ name: '', color: '#FF0000', alert_enabled: true });
      fetchROIs();

      // Notify parent to refresh camera config
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error saving ROI:', error);
      toast.error('Failed to save ROI');
    }
  };

  const handleDeleteROI = async (roiId) => {
    if (!window.confirm('Are you sure you want to delete this ROI?')) return;

    try {
      await deleteROI(roiId);
      toast.success('ROI deleted successfully');
      fetchROIs();
    } catch (error) {
      console.error('Error deleting ROI:', error);
      toast.error('Failed to delete ROI');
    }
  };

  const handleToggleROI = async (roi) => {
    try {
      await updateROI(roi.id, { is_active: !roi.is_active });
      toast.success(`ROI ${roi.is_active ? 'disabled' : 'enabled'}`);
      fetchROIs();
    } catch (error) {
      console.error('Error updating ROI:', error);
      toast.error('Failed to update ROI');
    }
  };

  const handleClearDrawing = () => {
    setPoints([]);
    setDrawing(false);
  };

  const handleImageLoad = () => {
    const img = imageRef.current;
    if (img && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = img.naturalWidth || 800;
      canvas.height = img.naturalHeight || 600;
      setDimensions({ width: canvas.width, height: canvas.height });
      drawCanvas();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">ROI Management</h2>
            <p className="text-sm text-gray-600 mt-1">{camera.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="p-6">
          {/* Camera Control Buttons */}
          <div className="mb-4 flex items-center justify-between bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              {!cameraStarted ? (
                <button
                  onClick={handleStartCamera}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Camera
                </button>
              ) : (
                <button
                  onClick={handleStopCamera}
                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop Camera
                </button>
              )}
              <div className="text-sm text-gray-600">
                {cameraStarted ? (
                  <span className="flex items-center text-green-600">
                    <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse mr-2"></div>
                    Raw video feed active (no AI annotations)
                  </span>
                ) : (
                  <span className="text-gray-500">Camera stopped - Click Start to begin drawing ROIs</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Canvas Area */}
            <div className="lg:col-span-2">
              <div className="bg-gray-900 rounded-lg overflow-hidden relative">
                {cameraStarted ? (
                  <>
                    <img
                      ref={imageRef}
                      src={getRawStreamUrl(camera.id)}
                      alt="Raw camera feed"
                      className="w-full h-auto"
                      onLoad={handleImageLoad}
                      style={{ display: 'block' }}
                    />
                    <canvas
                      ref={canvasRef}
                      onClick={handleCanvasClick}
                      className="absolute top-0 left-0 w-full h-full cursor-crosshair"
                      style={{ cursor: drawing ? 'crosshair' : 'default' }}
                    />
                  </>
                ) : (
                  <div className="flex items-center justify-center h-96 bg-gradient-to-br from-gray-800 to-gray-900">
                    <div className="text-center text-white">
                      <Play className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                      <p className="text-lg font-semibold mb-2">Camera Stopped</p>
                      <p className="text-sm text-gray-400">Click "Start Camera" to begin drawing ROIs</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Drawing Controls */}
              {cameraStarted && (
                <div className="mt-4 flex items-center space-x-3">
                  {!drawing ? (
                    <button
                      onClick={handleStartDrawing}
                      className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Start Drawing ROI
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleCompleteDrawing}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Complete Polygon
                      </button>
                      <button
                        onClick={handleClearDrawing}
                        className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Clear
                      </button>
                    </>
                  )}
                  {points.length > 0 && !drawing && (
                    <button
                      onClick={handleSaveROI}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save ROI
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ROI List & Settings */}
            <div className="space-y-6">
              {/* New ROI Form */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">New ROI</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ROI Name *
                    </label>
                    <input
                      type="text"
                      value={newROI.name}
                      onChange={(e) => setNewROI({ ...newROI, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="e.g., Restricted Zone 1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Color
                    </label>
                    <input
                      type="color"
                      value={newROI.color}
                      onChange={(e) => setNewROI({ ...newROI, color: e.target.value })}
                      className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newROI.alert_enabled}
                      onChange={(e) => setNewROI({ ...newROI, alert_enabled: e.target.checked })}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <label className="ml-2 text-sm text-gray-700">
                      Enable Intrusion Alerts
                    </label>
                  </div>
                </div>
              </div>

              {/* Existing ROIs */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Existing ROIs ({rois.length})</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {rois.map((roi) => (
                    <div
                      key={roi.id}
                      className="bg-white border border-gray-200 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: roi.color }}
                          ></div>
                          <span className="font-medium text-gray-900">{roi.name}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteROI(roi.id)}
                          className="p-1 hover:bg-red-100 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          {roi.alert_enabled ? (
                            <span className="flex items-center text-orange-600">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Alerts Enabled
                            </span>
                          ) : (
                            <span className="text-gray-500">Alerts Disabled</span>
                          )}
                        </span>
                        <button
                          onClick={() => handleToggleROI(roi)}
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            roi.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {roi.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                    </div>
                  ))}
                  {rois.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <p className="text-sm">No ROIs defined yet</p>
                      <p className="text-xs mt-1">Draw your first ROI to get started</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ROIManagementModal;

