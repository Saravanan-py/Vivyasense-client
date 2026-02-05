import React, { useState } from 'react';
import { X } from 'lucide-react';
import { createCamera } from '../services/api';
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

const AddCameraModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    rtsp_url: '',
    streaming_channel: '1',
    location: '',
    confidence_threshold: 0.31,
    custom_model: 'general_detection',
    allowed_classes: ['person']
  });

  const [loading, setLoading] = useState(false);
  const [useWebcam, setUseWebcam] = useState(false);

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
    setLoading(true);

    try {
      // If webcam is selected, set rtsp_url to "0"
      const submitData = {
        ...formData,
        rtsp_url: useWebcam ? '0' : formData.rtsp_url
      };
      await createCamera(submitData);
      toast.success('Camera added successfully');
      onSuccess();
    } catch (error) {
      console.error('Error adding camera:', error);
      toast.error('Failed to add camera');
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
          <h2 className="text-2xl font-bold text-gray-900">Add New Camera</h2>
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
                      <label key={className} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.allowed_classes.includes(className)}
                          onChange={() => handleClassToggle(className)}
                          className="rounded text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-700 capitalize">{className}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
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
              {loading ? 'Adding...' : 'Add Camera'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCameraModal;

