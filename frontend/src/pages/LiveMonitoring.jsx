import React, { useState, useEffect } from 'react';
import { Video, Play, Square, AlertCircle, Maximize2, X, Eye, Activity, Zap } from 'lucide-react';
import { getCameras, getStreamUrl, startCamera, stopCamera } from '../services/api';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import Loading from '../components/Loading';

const LiveMonitoring = () => {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [maximizedCameraId, setMaximizedCameraId] = useState(null);
  const location = useLocation();

  useEffect(() => {
    fetchCameras();
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchCameras, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Check if we should maximize a camera from navigation state
    if (location.state?.maximizeCameraId) {
      console.log('Maximizing camera:', location.state.maximizeCameraId);
      setMaximizedCameraId(location.state.maximizeCameraId);
      // Clear the state to prevent re-maximizing on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const fetchCameras = async () => {
    try {
      const response = await getCameras();
      // Show ALL cameras, not just active ones
      setCameras(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching cameras:', error);
      setLoading(false);
    }
  };

  const handleStartCamera = async (cameraId) => {
    try {
      await startCamera(cameraId);
      toast.success('Camera started successfully');
      fetchCameras();
    } catch (error) {
      console.error('Error starting camera:', error);
      toast.error('Failed to start camera');
    }
  };

  const handleStopCamera = async (cameraId) => {
    try {
      await stopCamera(cameraId);
      toast.success('Camera stopped successfully');
      fetchCameras();
    } catch (error) {
      console.error('Error stopping camera:', error);
      toast.error('Failed to stop camera');
    }
  };

  const handleMaximize = (cameraId) => {
    setMaximizedCameraId(cameraId);
  };

  const handleMinimize = () => {
    setMaximizedCameraId(null);
  };

  if (loading) {
    return <Loading message="Loading live streams" />;
  }

  if (cameras.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl shadow-lg p-12 text-center animate-fade-in">
        <Video className="w-16 h-16 text-gray-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">No Cameras Found</h3>
        <p className="text-gray-400">Add a camera from the Cameras page to start monitoring</p>
      </div>
    );
  }

  // If a camera is maximized, show only that camera
  if (maximizedCameraId) {
    const maximizedCamera = cameras.find(c => c.id === maximizedCameraId);
    console.log('Maximized camera found:', maximizedCamera);
    if (maximizedCamera) {
      return (
        <div className="space-y-6">
          {/* Maximized Header */}
          <div className="bg-gray-800 rounded-xl shadow-lg p-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-indigo-600 p-3 rounded-lg">
                  <Eye className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {maximizedCamera.name}
                  </h1>
                  <p className="text-gray-400 mt-1 flex items-center text-sm">
                    <Activity className="w-4 h-4 mr-1.5" />
                    {maximizedCamera.location || 'Live Feed'} • Full Screen Mode
                  </p>
                </div>
              </div>
              <button
                onClick={handleMinimize}
                className="flex items-center px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-md text-sm font-medium"
              >
                <X className="w-4 h-4 mr-1.5" />
                Show All
              </button>
            </div>
          </div>

          <CameraFeed
            camera={maximizedCamera}
            onStart={handleStartCamera}
            onStop={handleStopCamera}
            onMaximize={handleMaximize}
            onMinimize={handleMinimize}
            isMaximized={true}
          />
        </div>
      );
    } else {
      // Camera not found, show all cameras
      console.log('Camera not found, showing all cameras');
      setMaximizedCameraId(null);
    }
  }

  const gridCols = cameras.length === 1 ? 'grid-cols-1' : cameras.length <= 4 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div className="space-y-6">
      {/* Simple Header */}
      <div className="bg-gray-800 rounded-xl shadow-lg p-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-3 rounded-lg">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Live Monitoring
              </h1>
              <p className="text-gray-400 mt-1 flex items-center text-sm">
                <Zap className="w-4 h-4 mr-1.5" />
                Real-time video feeds from all cameras
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-gray-700 px-4 py-2 rounded-lg">
            <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-gray-300 text-sm font-medium">{cameras.filter(c => c.is_active).length} / {cameras.length} Active</span>
          </div>
        </div>
      </div>

      <div className={`grid ${gridCols} gap-6`}>
        {cameras.map((camera) => (
          <CameraFeed
            key={camera.id}
            camera={camera}
            onStart={handleStartCamera}
            onStop={handleStopCamera}
            onMaximize={handleMaximize}
            onMinimize={handleMinimize}
            isMaximized={false}
          />
        ))}
      </div>
    </div>
  );
};

const CameraFeed = ({ camera, onStart, onStop, onMaximize, onMinimize, isMaximized }) => {
  const [imageError, setImageError] = useState(false);

  return (
    <div className={`group relative bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 ${isMaximized ? 'h-[calc(100vh-200px)]' : 'transform hover:-translate-y-1'} animate-fade-in`}>
      <div className={`relative bg-gray-900 ${isMaximized ? 'h-full' : ''}`} style={!isMaximized ? { width: '100%', paddingBottom: '56.25%' } : { height: '100%' }}>
        {camera.is_active ? (
          <>
            {/* Video Stream */}
            <img
              src={getStreamUrl(camera.id)}
              alt={camera.name}
              className="absolute top-0 left-0 w-full h-full object-contain z-0"
              onError={() => setImageError(true)}
            />

            {imageError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-center text-white">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 text-indigo-400 animate-pulse" />
                  <p className="text-base font-medium">Stream Loading...</p>
                  <p className="text-sm text-gray-400 mt-1">Please wait while we connect</p>
                </div>
              </div>
            )}

            {/* Live Badge */}
            <div className="absolute top-3 left-3 flex items-center space-x-1.5 bg-red-600 px-3 py-1.5 rounded-lg shadow-md z-10 animate-pulse">
              <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
              <span className="text-xs font-medium text-white">LIVE</span>
            </div>

            {/* Model Badge */}
            <div className="absolute top-3 right-3 px-3 py-1.5 bg-indigo-600 rounded-lg shadow-md z-10">
              <span className="text-xs font-medium text-white">
                {camera.custom_model === 'raw_stream' && '📹 Raw'}
                {camera.custom_model === 'general_detection' && '🎯 General'}
                {camera.custom_model === 'ppe_detection' && '🦺 PPE'}
              </span>
            </div>

            {/* Maximize/Minimize Button - Top Right Corner with Light Shade */}
            {!isMaximized ? (
              <button
                onClick={() => onMaximize(camera.id)}
                className="absolute top-3 right-3 p-2 bg-gray-800 bg-opacity-50 hover:bg-opacity-70 text-white rounded-lg transition-all shadow-sm z-10 backdrop-blur-sm"
                title="Maximize"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onMinimize}
                className="absolute top-3 right-3 p-2 bg-gray-800 bg-opacity-50 hover:bg-opacity-70 text-white rounded-lg transition-all shadow-sm z-10 backdrop-blur-sm"
                title="Minimize"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Start/Stop Button - Bottom Center */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
              {camera.is_active ? (
                <button
                  onClick={() => onStop(camera.id)}
                  className="flex items-center px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all shadow-md text-sm font-medium"
                  title="Stop Camera"
                >
                  <Square className="w-4 h-4 mr-1.5" />
                  Stop
                </button>
              ) : (
                <button
                  onClick={() => onStart(camera.id)}
                  className="flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all shadow-md text-sm font-medium"
                  title="Start Camera"
                >
                  <Play className="w-4 h-4 mr-1.5" />
                  Start
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-center text-white">
                <Video className="w-16 h-16 mx-auto text-gray-600 mb-3 animate-pulse" />
                <p className="text-lg font-medium mb-1">Camera Offline</p>
              </div>
            </div>

            {/* Maximize Button - Top Right Corner with Light Shade */}
            {!isMaximized && (
              <button
                onClick={() => onMaximize(camera.id)}
                className="absolute top-3 right-3 p-2 bg-gray-800 bg-opacity-50 hover:bg-opacity-70 text-white rounded-lg transition-all shadow-sm z-10 backdrop-blur-sm"
                title="Maximize"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}

            {/* Start Button - Bottom Center */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
              <button
                onClick={() => onStart(camera.id)}
                className="flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all shadow-md text-sm font-medium"
                title="Start Camera"
              >
                <Play className="w-4 h-4 mr-1.5" />
                Start
              </button>
            </div>
          </>
        )}
      </div>

      {!isMaximized && (
        <div className="relative p-4 bg-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white">
                {camera.name}
              </h3>
              <p className="text-sm text-gray-400 mt-0.5">{camera.location || 'No location'}</p>
            </div>
            <div className={`px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm ${
              camera.is_active
                ? 'bg-green-600 text-white animate-pulse'
                : 'bg-gray-600 text-gray-300'
            }`}>
              {camera.is_active ? '● Active' : '○ Inactive'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveMonitoring;

