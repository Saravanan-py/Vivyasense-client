import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import { getStreamUrl } from '../services/api';
import toast from 'react-hot-toast';

const LineCrossingDrawingModal = ({ camera, onClose, onSave, existingLine }) => {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [points, setPoints] = useState([]);
  const [lineName, setLineName] = useState(existingLine?.name || `Line-${camera.name}`);
  const [lineColor, setLineColor] = useState(existingLine?.color || '#00FF00');
  const [countDirection, setCountDirection] = useState(existingLine?.count_direction || 'both');
  const [alertEnabled, setAlertEnabled] = useState(existingLine?.alert_enabled ?? true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Draw canvas function
  const drawCanvas = React.useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;

    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    if (points.length > 0) {
      // Draw first point
      ctx.beginPath();
      ctx.arc(points[0][0], points[0][1], 6, 0, 2 * Math.PI);
      ctx.fillStyle = lineColor;
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw line if we have 2 points
      if (points.length === 2) {
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        ctx.lineTo(points[1][0], points[1][1]);
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw second point
        ctx.beginPath();
        ctx.arc(points[1][0], points[1][1], 6, 0, 2 * Math.PI);
        ctx.fillStyle = lineColor;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw arrow to show direction
        const dx = points[1][0] - points[0][0];
        const dy = points[1][1] - points[0][1];
        const angle = Math.atan2(dy, dx);
        const arrowSize = 15;

        ctx.beginPath();
        ctx.moveTo(points[1][0], points[1][1]);
        ctx.lineTo(
          points[1][0] - arrowSize * Math.cos(angle - Math.PI / 6),
          points[1][1] - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(points[1][0], points[1][1]);
        ctx.lineTo(
          points[1][0] - arrowSize * Math.cos(angle + Math.PI / 6),
          points[1][1] - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
  }, [points, lineColor]);

  useEffect(() => {
    const initializeStream = async () => {
      try {
        if (!camera.is_active) {
          const { startCamera } = await import('../services/api');
          await startCamera(camera.id);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Use a video element to capture MJPEG stream
        const rawStreamUrl = `${getStreamUrl(camera.id)}?raw=true`;
        const img = document.createElement('img');
        img.crossOrigin = 'anonymous';

        // Set up the image load handler before setting src
        img.onload = () => {
          imgRef.current = img;
          setImageLoaded(true);

          const maxWidth = 800;
          const maxHeight = 600;
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          // Default size if image dimensions are not available
          if (!width || !height) {
            width = 640;
            height = 480;
          }

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

        img.onerror = (error) => {
          console.error('Image load error:', error);
          toast.error('Failed to load camera stream. Make sure camera is active.');
        };

        // Set src after handlers are attached
        img.src = rawStreamUrl;
      } catch (error) {
        console.error('Error initializing stream:', error);
        toast.error('Failed to initialize camera stream: ' + error.message);
      }
    };

    initializeStream();
  }, [camera.id, camera.is_active]);

  // Continuous canvas update for live video
  useEffect(() => {
    if (!imageLoaded) return;

    const updateInterval = setInterval(() => {
      drawCanvas();
    }, 100); // Update every 100ms for smooth video

    return () => clearInterval(updateInterval);
  }, [imageLoaded, drawCanvas]);

  const handleCanvasClick = (e) => {
    if (!imageLoaded || !imgRef.current) {
      toast.error('Please wait for the camera stream to load');
      return;
    }

    if (points.length >= 2) {
      toast.info('Line already complete. Clear to draw a new line.');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      toast.error('Canvas not ready');
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert to original image coordinates
    const imgWidth = imgRef.current.naturalWidth || imgRef.current.width || 640;
    const imgHeight = imgRef.current.naturalHeight || imgRef.current.height || 480;
    const scaleX = imgWidth / canvas.width;
    const scaleY = imgHeight / canvas.height;

    const originalX = Math.round(x * scaleX);
    const originalY = Math.round(y * scaleY);

    setPoints([...points, [x, y]]);
    toast.success(`Point ${points.length + 1} placed`);
  };

  const handleClear = () => {
    setPoints([]);
  };

  const handleSave = () => {
    if (points.length !== 2) {
      toast.error('Please draw a complete line (2 points)');
      return;
    }

    if (!lineName.trim()) {
      toast.error('Please enter a line name');
      return;
    }

    if (!imgRef.current || !canvasRef.current) {
      toast.error('Canvas not ready. Please try again.');
      return;
    }

    // Convert canvas coordinates to original image coordinates
    const imgWidth = imgRef.current.naturalWidth || imgRef.current.width || 640;
    const imgHeight = imgRef.current.naturalHeight || imgRef.current.height || 480;
    const scaleX = imgWidth / canvasRef.current.width;
    const scaleY = imgHeight / canvasRef.current.height;

    const lineCoordinates = points.map(([x, y]) => [
      Math.round(x * scaleX),
      Math.round(y * scaleY)
    ]);

    console.log('Saving line with coordinates:', lineCoordinates);
    console.log('Canvas size:', canvasRef.current.width, canvasRef.current.height);
    console.log('Image size:', imgWidth, imgHeight);

    onSave({
      name: lineName,
      line_coordinates: lineCoordinates,
      color: lineColor,
      count_direction: countDirection,
      alert_enabled: alertEnabled,
      is_active: true
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">
            {existingLine ? 'Edit' : 'Draw'} Line Crossing Zone
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Canvas */}
            <div className="lg:col-span-2">
              <div className="bg-gray-100 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">Draw Line (Click 2 Points)</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Click on the video to place the start and end points of your line crossing zone.
                </p>
                {imageLoaded ? (
                  <canvas
                    ref={canvasRef}
                    width={canvasSize.width}
                    height={canvasSize.height}
                    onClick={handleCanvasClick}
                    className="border-2 border-gray-300 rounded cursor-crosshair"
                  />
                ) : (
                  <div className="flex items-center justify-center h-96 bg-gray-200 rounded">
                    <p className="text-gray-500">Loading camera stream...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Settings */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Line Name
                </label>
                <input
                  type="text"
                  value={lineName}
                  onChange={(e) => setLineName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter line name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Line Color
                </label>
                <input
                  type="color"
                  value={lineColor}
                  onChange={(e) => setLineColor(e.target.value)}
                  className="w-full h-10 border border-gray-300 rounded-md cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Count Direction
                </label>
                <select
                  value={countDirection}
                  onChange={(e) => setCountDirection(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="both">Both Directions</option>
                  <option value="up">Up Only</option>
                  <option value="down">Down Only</option>
                  <option value="left">Left Only</option>
                  <option value="right">Right Only</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="alertEnabled"
                  checked={alertEnabled}
                  onChange={(e) => setAlertEnabled(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="alertEnabled" className="ml-2 block text-sm text-gray-700">
                  Enable Alerts
                </label>
              </div>

              <div className="pt-4 space-y-2">
                <button
                  onClick={handleSave}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Save Line
                </button>
                <button
                  onClick={handleClear}
                  className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                  Clear Line
                </button>
              </div>

              <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-800">
                <p className="font-semibold mb-1">Instructions:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Click to place start point</li>
                  <li>Click again for end point</li>
                  <li>Arrow shows crossing direction</li>
                  <li>Clear to start over</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LineCrossingDrawingModal;

