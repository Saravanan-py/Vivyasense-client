import React, { useState, useEffect } from 'react';
import { X, Users, Trash2, Mail, Bell } from 'lucide-react';
import { updateCamera, getCameraSettings, updateCameraSettings, getROIs, deleteROI, stopCamera, startCamera } from '../services/api';
import toast from 'react-hot-toast';

// Model-specific classes
const MODEL_CLASSES = {
  'general_detection': [
    'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck',
    'boat', 'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench',
    'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe',
    'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard',
    'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard',
    'tennis racket', 'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl',
    'banana', 'apple', 'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza',
    'donut', 'cake', 'chair', 'couch', 'potted plant', 'bed', 'dining table', 'toilet',
    'tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven',
    'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear',
    'hair drier', 'toothbrush'
  ],
  'ppe_detection': ['person', 'ear', 'ear-mufs', 'face', 'face-guard', 'face-mask', 'foot', 'tool', 'glasses', 'gloves', 'helmet', 'hands', 'head', 'medical-suit', 'shoes', 'safety-suit', 'safety-vest'],
  'raw_stream': []  // No AI processing - just raw video stream
};

const EditCameraModal = ({ camera, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: camera.name || '',
    rtsp_url: camera.rtsp_url || '',
    streaming_channel: camera.streaming_channel || '1',
    location: camera.location || '',
    confidence_threshold: camera.confidence_threshold || 0.31,
    custom_model: camera.custom_model || 'general_detection',
    allowed_classes: camera.allowed_classes || ['person']
  });

  const [loading, setLoading] = useState(false);
  const [useWebcam, setUseWebcam] = useState(camera.rtsp_url === '0');
  const [cameraSettings, setCameraSettings] = useState({
    enable_people_counting: false,
    roi_enabled: false,
    email_alerts_enabled: false,
    email_recipients: [],
    detection_interval: 5,
    save_images: true,
    heatmap_enabled: false
  });
  const [hasROI, setHasROI] = useState(false);

  // Load camera settings and ROI status
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsResponse = await getCameraSettings(camera.id);
        setCameraSettings({
          enable_people_counting: settingsResponse.data.enable_people_counting || false,
          roi_enabled: settingsResponse.data.roi_enabled || false,
          email_alerts_enabled: settingsResponse.data.email_alerts_enabled || false,
          email_recipients: settingsResponse.data.email_recipients || [],
          detection_interval: settingsResponse.data.detection_interval || 5,
          save_images: settingsResponse.data.save_images !== undefined ? settingsResponse.data.save_images : true,
          heatmap_enabled: settingsResponse.data.heatmap_enabled || false
        });

        // Check if camera has ROI
        const roisResponse = await getROIs(camera.id);
        setHasROI(roisResponse.data && roisResponse.data.length > 0);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
  }, [camera.id]);

  // Delete all ROIs for this camera
  const handleDeleteCameraROI = async () => {
    if (!window.confirm('Are you sure you want to delete all ROIs for this camera?')) {
      return;
    }

    try {
      // Get all ROIs for this camera
      const roisResponse = await getROIs(camera.id);
      const rois = roisResponse.data;

      if (!rois || rois.length === 0) {
        toast.info('No ROIs to delete');
        return;
      }

      const wasActive = camera.is_active;

      // Stop camera if active
      if (wasActive) {
        await stopCamera(camera.id);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Delete all ROIs
      for (const roi of rois) {
        await deleteROI(roi.id);
      }

      // Update state
      setHasROI(false);
      setCameraSettings({
        ...cameraSettings,
        enable_people_counting: false,
        roi_enabled: false
      });

      toast.success(`Deleted ${rois.length} ROI(s) successfully`);

      // Restart camera if it was active
      if (wasActive) {
        await new Promise(resolve => setTimeout(resolve, 500));
        await startCamera(camera.id);
        toast.info('Camera restarted');
      }
    } catch (error) {
      console.error('Error deleting ROIs:', error);
      toast.error('Failed to delete ROIs: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Get available classes for selected model
  const getAvailableClasses = () => {
    return MODEL_CLASSES[formData.custom_model] || MODEL_CLASSES['general_detection'];
  };

  // Update allowed classes when model changes
  const handleModelChange = (newModel) => {
    const modelClasses = MODEL_CLASSES[newModel] || MODEL_CLASSES['general_detection'];
    setFormData({
      ...formData,
      custom_model: newModel,
      allowed_classes: modelClasses.length > 0 ? [modelClasses[0]] : [] // Select first class by default, or empty for raw_stream
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate people counting settings
    if (cameraSettings.enable_people_counting && !hasROI) {
      toast.error('Please define ROI points before enabling person counting');
      return;
    }

    setLoading(true);

    try {
      // If webcam is selected, set rtsp_url to "0"
      const submitData = {
        ...formData,
        rtsp_url: useWebcam ? '0' : formData.rtsp_url
      };
      await updateCamera(camera.id, submitData);

      // Update camera settings
      await updateCameraSettings(camera.id, cameraSettings);

      toast.success('Camera updated successfully');
      onSuccess();
    } catch (error) {
      console.error('Error updating camera:', error);
      toast.error('Failed to update camera');
    } finally {
      setLoading(false);
    }
  };

  const handleClassToggle = (className) => {
    setFormData(prev => ({
      ...prev,
      allowed_classes: prev.allowed_classes.includes(className)
        ? prev.allowed_classes.filter(c => c !== className)
        : [...prev.allowed_classes, className]
    }));
  };

  const selectAllClasses = () => {
    setFormData(prev => ({ ...prev, allowed_classes: [...getAvailableClasses()] }));
  };

  const deselectAllClasses = () => {
    setFormData(prev => ({ ...prev, allowed_classes: [] }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-2xl font-bold text-gray-900">Edit Camera</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Camera Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="e.g., Front Gate Camera"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Video Source *
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useWebcam}
                    onChange={(e) => setUseWebcam(e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-600">Use Webcam</span>
                </label>
              </div>
              {!useWebcam ? (
                <input
                  type="text"
                  required={!useWebcam}
                  value={formData.rtsp_url}
                  onChange={(e) => setFormData({ ...formData, rtsp_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="rtsp://username:password@ip:port/stream or enter 0 for webcam"
                />
              ) : (
                <div className="w-full px-4 py-2 border border-green-300 bg-green-50 rounded-lg text-green-700 font-medium">
                  📹 Using Default Webcam (Camera 0)
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Streaming Channel
                </label>
                <input
                  type="text"
                  value={formData.streaming_channel}
                  onChange={(e) => setFormData({ ...formData, streaming_channel: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., Front Gate"
                />
              </div>
            </div>
          </div>

          {/* AI Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">AI Detection Settings</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confidence Threshold: {(formData.confidence_threshold * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={formData.confidence_threshold}
                onChange={(e) => setFormData({ ...formData, confidence_threshold: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Detection Model *
              </label>
              <select
                value={formData.custom_model}
                onChange={(e) => handleModelChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
              >
                <option value="raw_stream">📹 Raw Stream (No AI Detection - Low Latency)</option>
                <option value="general_detection">🎯 General Detection (Person, Vehicle, Objects)</option>
                <option value="ppe_detection">🦺 PPE Detection (Hardhat, Safety Vest, Mask)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {formData.custom_model === 'raw_stream' && '✓ Raw video stream without AI processing - Lowest latency (1-3 sec delay)'}
                {formData.custom_model === 'general_detection' && '✓ Default model - Ready to use'}
                {formData.custom_model === 'ppe_detection' && '⚠️ Requires custom PPE model file'}
              </p>
            </div>

            {formData.custom_model !== 'raw_stream' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Allowed Classes ({formData.allowed_classes.length} selected)
                  </label>
                  <div className="space-x-2">
                    <button
                      type="button"
                      onClick={selectAllClasses}
                      className="text-xs text-purple-600 hover:text-purple-700"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={deselectAllClasses}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <div className="grid grid-cols-3 gap-2">
                    {getAvailableClasses().map((className) => (
                      <label
                        key={className}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={formData.allowed_classes.includes(className)}
                          onChange={() => handleClassToggle(className)}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-700">{className}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* People Counter Section */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center space-x-2 mb-4">
                <Users className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">People Counter</h3>
              </div>

              <div className="space-y-4">
                {/* Enable People Counting Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700">
                      Enable Person Counting
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Count persons inside the ROI polygon
                    </p>
                    {!hasROI && (
                      <p className="text-xs text-red-600 mt-1">
                        ⚠️ Please define ROI points first using the "Enable ROI" button
                      </p>
                    )}
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cameraSettings.enable_people_counting}
                      onChange={(e) => {
                        if (e.target.checked && !hasROI) {
                          toast.error('Please define ROI points before enabling person counting');
                          return;
                        }
                        setCameraSettings({
                          ...cameraSettings,
                          enable_people_counting: e.target.checked
                        });
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {/* ROI Status */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-900">ROI Status</p>
                      <p className="text-xs text-blue-700 mt-1">
                        {hasROI ? '✓ ROI configured' : '✗ No ROI defined'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {hasROI && (
                        <>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                          <button
                            onClick={handleDeleteCameraROI}
                            className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-all"
                            title="Delete all ROIs for this camera"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            Delete ROI
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Alert Settings Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <Bell className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-900">Alert Settings</h3>
            </div>

            <div className="space-y-4">
              {/* Enable Email Alerts Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700">
                    Enable Email Alerts
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Send email notifications when detections occur
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cameraSettings.email_alerts_enabled}
                    onChange={(e) => setCameraSettings({
                      ...cameraSettings,
                      email_alerts_enabled: e.target.checked
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                </label>
              </div>

              {/* Email Recipients */}
              {cameraSettings.email_alerts_enabled && (
                <>
                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                      <Mail className="w-4 h-4 mr-1" />
                      Email Recipients
                    </label>
                    <input
                      type="text"
                      value={cameraSettings.email_recipients.join(', ')}
                      onChange={(e) => setCameraSettings({
                        ...cameraSettings,
                        email_recipients: e.target.value.split(',').map(email => email.trim()).filter(email => email)
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="email1@example.com, email2@example.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter email addresses separated by commas
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Detection Interval: {cameraSettings.detection_interval} seconds
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="60"
                      value={cameraSettings.detection_interval}
                      onChange={(e) => setCameraSettings({
                        ...cameraSettings,
                        detection_interval: parseInt(e.target.value)
                      })}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum time between consecutive alerts for the same detection
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-700">
                        Save Detection Images
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Save images of detected objects to disk
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cameraSettings.save_images}
                        onChange={(e) => setCameraSettings({
                          ...cameraSettings,
                          save_images: e.target.checked
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                    </label>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Heatmap Visualization Section */}
          <div className="space-y-4 mt-6">
            <div className="flex items-center space-x-2 mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Visualization Settings</h3>
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-900">
                  🔥 Heatmap Mode
                </label>
                <p className="text-xs text-gray-600 mt-1">
                  Visualize activity patterns and hotspots with a color-coded heatmap overlay
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={cameraSettings.heatmap_enabled}
                  onChange={(e) => setCameraSettings({
                    ...cameraSettings,
                    heatmap_enabled: e.target.checked
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-orange-500 peer-checked:to-red-500"></div>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Camera'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCameraModal;

