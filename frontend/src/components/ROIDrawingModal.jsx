import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Square, Trash2, Save } from 'lucide-react';
import { getStreamUrl } from '../services/api';
import toast from 'react-hot-toast';
import LineCrossingPanel from './LineCrossingPanel';

const ROIDrawingModal = ({ camera, onClose, onSave, existingROI }) => {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [activeTab, setActiveTab] = useState('roi'); // 'roi' or 'line-crossing'
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState([]); // Always start fresh, ignore existingROI
  const [roiName, setRoiName] = useState(`ROI-${camera.name}`);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    // Check if camera is active, if not start it temporarily
    const initializeStream = async () => {
      try {
        // If camera is not active, we need to start it first
        if (!camera.is_active) {
          const { startCamera } = await import('../services/api');
          await startCamera(camera.id);
          // Wait for stream to initialize
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Use raw stream (no AI overlays, detections, or ROI lines)
        const rawStreamUrl = `${getStreamUrl(camera.id)}?raw=true`;

        // Load camera stream image using img tag (works better with MJPEG streams)
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = rawStreamUrl;

        img.onload = () => {
          imgRef.current = img;
          setImageLoaded(true);

          // Set canvas size to match image
          const maxWidth = 800;
          const maxHeight = 600;
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (maxWidth / width) * height;
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = (maxHeight / height) * width;
            height = maxHeight;
          }

          setCanvasSize({ width, height });
        };

        img.onerror = () => {
          toast.error('Failed to load camera stream. Please make sure the camera is accessible.');
        };
      } catch (error) {
        console.error('Error initializing stream:', error);
        toast.error('Failed to initialize camera stream');
      }
    };

    initializeStream();
  }, [camera.id, camera.is_active]);

  useEffect(() => {
    if (imageLoaded && canvasRef.current && imgRef.current) {
      drawCanvas();
    }
  }, [imageLoaded, points, isDrawing]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imgRef.current;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    if (points.length > 0) {
      // Draw points
      points.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(point[0], point[1], 5, 0, 2 * Math.PI);
        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw lines between points
        if (index > 0) {
          ctx.beginPath();
          ctx.moveTo(points[index - 1][0], points[index - 1][1]);
          ctx.lineTo(point[0], point[1]);
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });

      // Close the polygon if we have more than 2 points
      if (points.length > 2) {
        ctx.beginPath();
        ctx.moveTo(points[points.length - 1][0], points[points.length - 1][1]);
        ctx.lineTo(points[0][0], points[0][1]);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Fill polygon with semi-transparent red
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        points.forEach(point => ctx.lineTo(point[0], point[1]));
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
        ctx.fill();
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
  };

  const handleCanvasClick = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Normalize coordinates to 0-1 range for storage
    const normalizedX = x / canvas.width;
    const normalizedY = y / canvas.height;

    setPoints([...points, [x, y]]);
  };

  const handleStartDrawing = () => {
    setIsDrawing(true);
    setPoints([]);
    toast.success('Click on the video to draw ROI points');
  };

  const handleStopDrawing = () => {
    if (points.length < 3) {
      toast.error('Please select at least 3 points to create an ROI');
      return;
    }
    setIsDrawing(false);
    toast.success('ROI drawing completed');
  };

  const handleReset = () => {
    setPoints([]);
    setIsDrawing(false);
  };

  const handleSave = () => {
    if (points.length < 3) {
      toast.error('Please draw an ROI with at least 3 points');
      return;
    }

    if (!roiName.trim()) {
      toast.error('Please enter an ROI name');
      return;
    }

    // Convert points to integer pixel coordinates
    const pixelPoints = points.map(([x, y]) => [
      Math.round(x),
      Math.round(y)
    ]);

    onSave({
      name: roiName,
      coordinates: pixelPoints,
      color: '#FF0000',
      alert_enabled: true,
      is_active: true
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 z-10 border-b border-gray-700">
          <div className="flex items-center justify-between p-6">
            <h2 className="text-2xl font-bold text-white">ROI & Line Crossing - {camera.name}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-4 px-6">
            <button
              onClick={() => setActiveTab('roi')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'roi'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              ROI Configuration
            </button>
            <button
              onClick={() => setActiveTab('line-crossing')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'line-crossing'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Line Crossing
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {activeTab === 'roi' ? (
            <>
          {/* ROI Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              ROI Name
            </label>
            <input
              type="text"
              value={roiName}
              onChange={(e) => setRoiName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter ROI name"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-4">
            {!isDrawing ? (
              <button
                onClick={handleStartDrawing}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
              >
                <Play className="w-4 h-4 mr-2" />
                Start ROI
              </button>
            ) : (
              <button
                onClick={handleStopDrawing}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
              >
                <Square className="w-4 h-4 mr-2" />
                Stop ROI
              </button>
            )}

            <button
              onClick={handleReset}
              className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Reset
            </button>

            <div className="flex-1"></div>

            <div className="text-sm text-gray-400">
              {isDrawing ? (
                <span className="text-green-400">Drawing mode active - Click to add points</span>
              ) : points.length > 0 ? (
                <span className="text-blue-400">{points.length} points selected</span>
              ) : (
                <span>Click "Start ROI" to begin</span>
              )}
            </div>
          </div>

          {/* Canvas */}
          <div className="bg-gray-900 rounded-lg p-4 flex items-center justify-center">
            {imageLoaded ? (
              <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                onClick={handleCanvasClick}
                className="border-2 border-gray-700 rounded cursor-crosshair"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            ) : (
              <div className="text-gray-400 py-20">Loading camera stream...</div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-white mb-2">Instructions:</h3>
            <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
              <li>Click "Start ROI" to begin drawing</li>
              <li>Click on the video to add points (minimum 3 points required)</li>
              <li>Points will be connected with light black lines</li>
              <li>Click "Stop ROI" when finished</li>
              <li>The ROI polygon will be displayed with a red outline</li>
              <li>Click "Reset" to clear and start over</li>
              <li>Click "Save ROI" to save the configuration</li>
            </ul>
          </div>

          {/* Footer for ROI Tab */}
          <div className="flex items-center justify-end space-x-4 pt-4">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={points.length < 3}
              className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 mr-2" />
              Save ROI
            </button>
          </div>
          </>
          ) : (
            /* Line Crossing Tab */
            <div className="min-h-[500px]">
              <LineCrossingPanel camera={camera} />

              {/* Footer for Line Crossing Tab */}
              <div className="flex items-center justify-end pt-4 mt-6 border-t border-gray-700">
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ROIDrawingModal;

