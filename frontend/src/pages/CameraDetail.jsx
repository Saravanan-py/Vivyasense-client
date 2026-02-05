import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, Mail } from 'lucide-react';
import { getCamera, updateCamera, getROIs, createROI, deleteROI, getCameraSettings, updateCameraSettings } from '../services/api';
import toast from 'react-hot-toast';
import ROIDrawer from '../components/ROIDrawer';
import LineCrossingPanel from '../components/LineCrossingPanel';

const CameraDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [camera, setCamera] = useState(null);
  const [rois, setROIs] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('roi');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [cameraRes, roisRes, settingsRes] = await Promise.all([
        getCamera(id),
        getROIs(id),
        getCameraSettings(id)
      ]);
      setCamera(cameraRes.data);
      setROIs(roisRes.data);
      setSettings(settingsRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching camera details:', error);
      toast.error('Failed to fetch camera details');
      setLoading(false);
    }
  };

  const handleUpdateCamera = async (updates) => {
    try {
      await updateCamera(id, updates);
      toast.success('Camera updated successfully');
      fetchData();
    } catch (error) {
      console.error('Error updating camera:', error);
      toast.error('Failed to update camera');
    }
  };

  const handleUpdateSettings = async (updates) => {
    try {
      await updateCameraSettings(id, updates);
      toast.success('Settings updated successfully');
      fetchData();
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    }
  };

  const handleSaveROI = async (roiData) => {
    try {
      await createROI({ ...roiData, camera_id: parseInt(id) });
      toast.success('ROI saved successfully');
      fetchData();
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
      fetchData();
    } catch (error) {
      console.error('Error deleting ROI:', error);
      toast.error('Failed to delete ROI');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/cameras')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{camera.name}</h1>
            <p className="text-gray-600 mt-1">{camera.location || 'No location set'}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('roi')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'roi'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ROI Configuration
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'settings'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              AI Settings
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'alerts'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Alert Settings
            </button>
            <button
              onClick={() => setActiveTab('linecrossing')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'linecrossing'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Line Crossing
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'roi' && (
            <ROITab camera={camera} rois={rois} onSaveROI={handleSaveROI} onDeleteROI={handleDeleteROI} />
          )}
          {activeTab === 'settings' && (
            <SettingsTab camera={camera} settings={settings} onUpdateCamera={handleUpdateCamera} onUpdateSettings={handleUpdateSettings} />
          )}
          {activeTab === 'alerts' && (
            <AlertsTab settings={settings} onUpdate={handleUpdateSettings} />
          )}
          {activeTab === 'linecrossing' && (
            <LineCrossingPanel camera={camera} />
          )}
        </div>
      </div>
    </div>
  );
};

const ROITab = ({ camera, rois, onSaveROI, onDeleteROI }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Draw Restricted Zones</h3>
        <p className="text-sm text-gray-600 mb-4">
          Click on the video feed to draw polygon shapes for restricted zones. Double-click to complete the shape.
        </p>
      </div>

      <ROIDrawer cameraId={camera.id} rois={rois} onSaveROI={onSaveROI} />

      {/* ROI List */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configured ROIs ({rois.length})</h3>
        <div className="space-y-2">
          {rois.map((roi) => (
            <div key={roi.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: roi.color }}
                ></div>
                <div>
                  <p className="font-medium text-gray-900">{roi.name}</p>
                  <p className="text-sm text-gray-600">{roi.coordinates.length} points</p>
                </div>
              </div>
              <button
                onClick={() => onDeleteROI(roi.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SettingsTab = ({ camera, settings, onUpdateCamera, onUpdateSettings }) => {
  const [confidence, setConfidence] = useState(camera.confidence_threshold);
  const [customModel, setCustomModel] = useState(camera.custom_model || 'general_detection');
  const [heatmapEnabled, setHeatmapEnabled] = useState(settings?.heatmap_enabled || false);

  // Update heatmapEnabled when settings change
  useEffect(() => {
    if (settings) {
      console.log('Settings loaded:', settings);
      setHeatmapEnabled(settings.heatmap_enabled || false);
    }
  }, [settings]);

  const handleSave = () => {
    // Update camera settings (confidence, model)
    onUpdateCamera({
      confidence_threshold: confidence,
      custom_model: customModel
    });

    // Update camera settings (heatmap)
    onUpdateSettings({
      heatmap_enabled: heatmapEnabled
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Confidence Threshold: {(confidence * 100).toFixed(0)}%
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={confidence}
          onChange={(e) => setConfidence(parseFloat(e.target.value))}
          className="w-full"
        />
        <p className="text-sm text-gray-600 mt-2">
          Lower values detect more objects but may increase false positives
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Detection Model
        </label>
        <select
          value={customModel}
          onChange={(e) => setCustomModel(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
        >
          <option value="general_detection">🎯 General Detection (Person, Vehicle, Objects)</option>
          <option value="ppe_detection">🦺 PPE Detection (Hardhat, Safety Vest, Mask)</option>
        </select>
        <p className="mt-2 text-xs text-gray-500">
          {customModel === 'general_detection' && '✓ Default model - Ready to use'}
          {customModel === 'ppe_detection' && '⚠️ Requires custom PPE model file in backend/models/'}
        </p>
      </div>

      {/* Heatmap Toggle Section */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Visualization Settings</h3>

        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">
              🔥 Heatmap Mode
            </label>
            <p className="text-xs text-gray-600">
              Visualize activity patterns and hotspots with a color-coded heatmap overlay
            </p>
          </div>
          <div className="flex items-center ml-4">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={heatmapEnabled}
                onChange={(e) => setHeatmapEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-orange-500 peer-checked:to-red-500"></div>
            </label>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all"
      >
        <Save className="w-5 h-5 mr-2" />
        Save Settings
      </button>
    </div>
  );
};

const AlertsTab = ({ settings, onUpdate }) => {
  const [emailEnabled, setEmailEnabled] = useState(settings?.email_alerts_enabled || false);
  const [emailRecipients, setEmailRecipients] = useState(settings?.email_recipients?.join(', ') || '');
  const [detectionInterval, setDetectionInterval] = useState(settings?.detection_interval || 5);

  const handleSave = () => {
    onUpdate({
      email_alerts_enabled: emailEnabled,
      email_recipients: emailRecipients.split(',').map(e => e.trim()).filter(e => e),
      detection_interval: detectionInterval
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
        <div className="flex items-center space-x-3">
          <Mail className="w-6 h-6 text-purple-600" />
          <div>
            <p className="font-medium text-gray-900">Email Alerts</p>
            <p className="text-sm text-gray-600">Receive instant notifications via email</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={emailEnabled}
            onChange={(e) => setEmailEnabled(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
        </label>
      </div>

      {emailEnabled && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Recipients (comma-separated)
            </label>
            <input
              type="text"
              value={emailRecipients}
              onChange={(e) => setEmailRecipients(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="email1@example.com, email2@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Detection Interval: {detectionInterval} seconds
            </label>
            <input
              type="range"
              min="1"
              max="60"
              value={detectionInterval}
              onChange={(e) => setDetectionInterval(parseInt(e.target.value))}
              className="w-full"
            />
            <p className="text-sm text-gray-600 mt-2">
              Minimum time between consecutive alerts for the same object
            </p>
          </div>
        </>
      )}

      <button
        onClick={handleSave}
        className="flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all"
      >
        <Save className="w-5 h-5 mr-2" />
        Save Alert Settings
      </button>
    </div>
  );
};

export default CameraDetail;

