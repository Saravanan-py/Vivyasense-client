import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line, Circle, Image as KonvaImage } from 'react-konva';
import { Save, Trash2 } from 'lucide-react';
import { getSnapshotUrl } from '../services/api';

const ROIDrawer = ({ cameraId, rois, onSaveROI }) => {
  const [points, setPoints] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [roiName, setRoiName] = useState('');
  const [roiColor, setRoiColor] = useState('#FF0000');
  const [image, setImage] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef(null);

  useEffect(() => {
    loadSnapshot();
    
    // Update dimensions on resize
    const handleResize = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setDimensions({ width, height: width * 0.75 });
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [cameraId]);

  const loadSnapshot = () => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = getSnapshotUrl(cameraId) + '?t=' + Date.now();
    img.onload = () => {
      setImage(img);
    };
  };

  const handleStageClick = (e) => {
    if (!isDrawing) return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    
    setPoints([...points, point.x, point.y]);
  };

  const handleStartDrawing = () => {
    setIsDrawing(true);
    setPoints([]);
  };

  const handleCompleteDrawing = () => {
    if (points.length < 6) {
      alert('Please draw at least 3 points');
      return;
    }

    setIsDrawing(false);
  };

  const handleSave = () => {
    if (!roiName.trim()) {
      alert('Please enter a ROI name');
      return;
    }

    if (points.length < 6) {
      alert('Please draw a ROI first');
      return;
    }

    // Convert points array to coordinate pairs
    const coordinates = [];
    for (let i = 0; i < points.length; i += 2) {
      coordinates.push([points[i], points[i + 1]]);
    }

    onSaveROI({
      name: roiName,
      coordinates,
      color: roiColor,
      alert_enabled: true
    });

    // Reset
    setPoints([]);
    setRoiName('');
    setIsDrawing(false);
  };

  const handleClear = () => {
    setPoints([]);
    setIsDrawing(false);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center space-x-4">
        <input
          type="text"
          value={roiName}
          onChange={(e) => setRoiName(e.target.value)}
          placeholder="ROI Name (e.g., Restricted Area 1)"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Color:</label>
          <input
            type="color"
            value={roiColor}
            onChange={(e) => setRoiColor(e.target.value)}
            className="w-12 h-10 rounded cursor-pointer"
          />
        </div>
        {!isDrawing ? (
          <button
            onClick={handleStartDrawing}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Start Drawing
          </button>
        ) : (
          <button
            onClick={handleCompleteDrawing}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Complete
          </button>
        )}
        <button
          onClick={handleClear}
          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
        <button
          onClick={handleSave}
          disabled={points.length < 6}
          className="flex items-center px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50"
        >
          <Save className="w-5 h-5 mr-2" />
          Save ROI
        </button>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-900">
        <Stage
          width={dimensions.width}
          height={dimensions.height}
          onClick={handleStageClick}
        >
          <Layer>
            {/* Background Image */}
            {image && <KonvaImage image={image} width={dimensions.width} height={dimensions.height} />}
            
            {/* Existing ROIs */}
            {rois.map((roi) => {
              const roiPoints = roi.coordinates.flat();
              return (
                <Line
                  key={roi.id}
                  points={roiPoints}
                  stroke={roi.color}
                  strokeWidth={2}
                  closed
                  opacity={0.6}
                />
              );
            })}
            
            {/* Current Drawing */}
            {points.length > 0 && (
              <>
                <Line
                  points={points}
                  stroke={roiColor}
                  strokeWidth={3}
                  closed={!isDrawing}
                  fill={isDrawing ? undefined : roiColor}
                  opacity={0.3}
                />
                {points.map((_, index) => {
                  if (index % 2 === 0) {
                    return (
                      <Circle
                        key={index}
                        x={points[index]}
                        y={points[index + 1]}
                        radius={5}
                        fill={roiColor}
                        stroke="white"
                        strokeWidth={2}
                      />
                    );
                  }
                  return null;
                })}
              </>
            )}
          </Layer>
        </Stage>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Instructions:</strong> Click "Start Drawing" and click on the video to create points. 
          Click "Complete" when done, then "Save ROI" to save the restricted zone.
        </p>
      </div>
    </div>
  );
};

export default ROIDrawer;

