import React, { useState, useRef, useEffect } from 'react';
import { Upload, Play, Square, Download, Factory, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const FactoryProductivity = () => {
  // Mode selection
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('factoryProductivity_mode') || 'video';
  });

  // Video upload mode
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);

  // RTSP mode
  const [rtspUrl, setRtspUrl] = useState(() => {
    return localStorage.getItem('factoryProductivity_rtspUrl') || '';
  });
  const [isRtspActive, setIsRtspActive] = useState(false);
  const [rtspSessionId, setRtspSessionId] = useState(null);
  const [liveStats, setLiveStats] = useState(null);
  const [rtspConnected, setRtspConnected] = useState(() => {
    return localStorage.getItem('factoryProductivity_rtspConnected') === 'true';
  });
  const [rtspFrame, setRtspFrame] = useState(() => {
    return localStorage.getItem('factoryProductivity_rtspFrame') || null;
  });

  // Common states
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('factoryProductivity_model') || 'best_asian1.pt';
  });
  const [rois, setRois] = useState(() => {
    const saved = localStorage.getItem('factoryProductivity_rois');
    return saved ? JSON.parse(saved) : [];
  });
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [currentROI, setCurrentROI] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedVideoUrl, setProcessedVideoUrl] = useState(null);
  const [productivityData, setProductivityData] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const liveImageRef = useRef(null);
  const statsIntervalRef = useRef(null);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('factoryProductivity_mode', mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('factoryProductivity_rtspUrl', rtspUrl);
  }, [rtspUrl]);

  useEffect(() => {
    localStorage.setItem('factoryProductivity_rtspConnected', rtspConnected);
  }, [rtspConnected]);

  useEffect(() => {
    if (rtspFrame) {
      localStorage.setItem('factoryProductivity_rtspFrame', rtspFrame);
    }
  }, [rtspFrame]);

  useEffect(() => {
    localStorage.setItem('factoryProductivity_model', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem('factoryProductivity_rois', JSON.stringify(rois));
  }, [rois]);

  // Draw ROIs on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw completed ROIs (red)
    rois.forEach((roi, index) => {
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 3;
      ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';

      ctx.beginPath();
      roi.forEach((point, i) => {
        if (i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw ROI label
      const centerX = roi.reduce((sum, p) => sum + p.x, 0) / roi.length;
      const centerY = roi.reduce((sum, p) => sum + p.y, 0) / roi.length;
      ctx.fillStyle = 'white';
      ctx.font = '20px Arial';
      ctx.fillText(`Machine ${index + 1}`, centerX - 40, centerY);
    });

    // Draw current ROI being drawn (yellow)
    if (currentROI.length > 0) {
      ctx.strokeStyle = 'yellow';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';

      ctx.beginPath();
      currentROI.forEach((point, i) => {
        if (i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);

        // Draw point markers
        ctx.fillStyle = 'yellow';
        ctx.fillRect(point.x - 3, point.y - 3, 6, 6);
      });

      if (currentROI.length > 2) {
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
        ctx.fill();
      }
      ctx.stroke();
    }
  }, [rois, currentROI]);

  const availableModels = [
    { value: 'best_asian1.pt', label: 'Steel Detection Model (best_asian1.pt)' },
    { value: 'yolov8n.pt', label: 'General Detection (yolov8n.pt)' }
  ];

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setRois([]);
      setProcessedVideoUrl(null);
      setProductivityData(null);
      toast.success('Video uploaded successfully');
    }
  };

  const handleCanvasClick = (e) => {
    if (!isDrawingMode) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const newPoint = { x: Math.round(x), y: Math.round(y) };
    setCurrentROI([...currentROI, newPoint]);
  };

  const completeROI = () => {
    if (currentROI.length < 3) {
      toast.error('ROI must have at least 3 points');
      return;
    }

    if (rois.length >= 3) {
      toast.error('Maximum 3 ROIs allowed');
      return;
    }

    setRois([...rois, currentROI]);
    setCurrentROI([]);
    setIsDrawingMode(false);
    toast.success(`ROI ${rois.length + 1} created`);
  };

  const startDrawing = () => {
    if (rois.length >= 3) {
      toast.error('Maximum 3 ROIs allowed');
      return;
    }
    setIsDrawingMode(true);
    setCurrentROI([]);
    toast.info('Click on video to draw ROI points. Click "Complete ROI" when done.');
  };

  const clearROIs = () => {
    setRois([]);
    setCurrentROI([]);
    setIsDrawingMode(false);
    toast.success('All ROIs cleared');
  };

  const processVideo = async () => {
    if (!videoFile) {
      toast.error('Please upload a video first');
      return;
    }

    if (rois.length === 0) {
      toast.error('Please draw at least one ROI');
      return;
    }

    setIsProcessing(true);
    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('model', selectedModel);
    formData.append('rois', JSON.stringify(rois));

    try {
      const response = await axios.post('/api/productivity/process', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 600000 // 10 minutes timeout
      });

      setProcessedVideoUrl(response.data.processed_video_url);
      setProductivityData(response.data.productivity_data);
      toast.success('Video processed successfully!');
    } catch (error) {
      console.error('Error processing video:', error);
      toast.error('Failed to process video');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadExcel = async () => {
    const sessionId = productivityData?.session_id || rtspSessionId;
    if (!sessionId) {
      toast.error('No productivity data available');
      return;
    }

    try {
      const response = await axios.get('/api/productivity/download-excel', {
        params: { session_id: sessionId },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `productivity_report_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Excel report downloaded');
    } catch (error) {
      console.error('Error downloading Excel:', error);
      toast.error('Failed to download Excel report');
    }
  };

  // RTSP Functions
  const connectToRtsp = async () => {
    if (!rtspUrl) {
      toast.error('Please enter RTSP URL');
      return;
    }

    try {
      toast.loading('Connecting to RTSP stream...');

      // Get first frame from RTSP stream
      const response = await axios.post('/api/productivity/rtsp/connect', {
        rtsp_url: rtspUrl
      });

      setRtspFrame(response.data.frame_url);
      setRtspConnected(true);
      toast.dismiss();
      toast.success('Connected! Now draw ROIs on the frame.');
    } catch (error) {
      console.error('Error connecting to RTSP:', error);
      toast.dismiss();
      toast.error(error.response?.data?.detail || 'Failed to connect to RTSP stream');
    }
  };

  const startRtspMonitoring = async () => {
    if (!rtspUrl) {
      toast.error('Please enter RTSP URL');
      return;
    }

    if (rois.length === 0) {
      toast.error('Please draw at least one ROI');
      return;
    }

    try {
      const response = await axios.post('/api/productivity/rtsp/start', {
        rtsp_url: rtspUrl,
        model: selectedModel,
        rois: rois
      });

      setRtspSessionId(response.data.session_id);
      setIsRtspActive(true);
      toast.success('RTSP monitoring started!');

      // Start polling for live stats
      statsIntervalRef.current = setInterval(fetchLiveStats, 1000);
    } catch (error) {
      console.error('Error starting RTSP:', error);
      toast.error(error.response?.data?.detail || 'Failed to start RTSP monitoring');
    }
  };

  const stopRtspMonitoring = async () => {
    if (!rtspSessionId) {
      toast.error('No active RTSP session');
      return;
    }

    try {
      const response = await axios.post(`/api/productivity/rtsp/stop/${rtspSessionId}`);

      setIsRtspActive(false);
      setProductivityData(response.data.productivity_data);

      // Stop polling
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }

      toast.success('RTSP monitoring stopped! Report ready.');
    } catch (error) {
      console.error('Error stopping RTSP:', error);
      toast.error('Failed to stop RTSP monitoring');
    }
  };

  const fetchLiveStats = async () => {
    if (!rtspSessionId) return;

    try {
      const response = await axios.get(`/api/productivity/rtsp/stats/${rtspSessionId}`);
      setLiveStats(response.data);
    } catch (error) {
      console.error('Error fetching live stats:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800 rounded-xl shadow-lg p-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-3 rounded-lg">
              <Factory className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Factory Productivity Monitor</h1>
              <p className="text-gray-400 mt-1">Track machine productivity and downtime</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Selection */}
      <div className="bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">1. Select Input Mode</h2>
        <div className="flex space-x-4">
          <button
            onClick={() => setMode('video')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
              mode === 'video'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            📹 Upload Video
          </button>
          <button
            onClick={() => setMode('rtsp')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
              mode === 'rtsp'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            📡 RTSP Stream
          </button>
        </div>
      </div>

      {/* Video Upload Section */}
      {mode === 'video' && (
        <div className="bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">2. Upload Video</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Video File
              </label>
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Detection Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              {availableModels.map(model => (
                <option key={model.value} value={model.value}>{model.label}</option>
              ))}
            </select>
          </div>
        </div>
        </div>
      )}

      {/* RTSP Section */}
      {mode === 'rtsp' && (
        <div className="bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">2. RTSP Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                RTSP URL
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={rtspUrl}
                  onChange={(e) => setRtspUrl(e.target.value)}
                  placeholder="rtsp://username:password@ip:port/stream"
                  disabled={rtspConnected || isRtspActive}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                />
                {!rtspConnected && !isRtspActive && (
                  <button
                    onClick={connectToRtsp}
                    disabled={!rtspUrl}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Connect
                  </button>
                )}
                {rtspConnected && !isRtspActive && (
                  <button
                    onClick={() => {
                      setRtspConnected(false);
                      setRtspFrame(null);
                      setRois([]);
                      setCurrentROI([]);
                      setIsDrawingMode(false);
                    }}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Detection Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={isRtspActive}
                className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {availableModels.map(model => (
                  <option key={model.value} value={model.value}>{model.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Video Preview and ROI Drawing (Video Mode) */}
      {mode === 'video' && videoUrl && (
        <div className="bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">3. Draw ROI for Machines</h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={startDrawing}
                disabled={isDrawingMode || rois.length >= 3}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDrawingMode ? 'Drawing...' : `Draw ROI ${rois.length + 1}`}
              </button>

              {isDrawingMode && (
                <button
                  onClick={completeROI}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Complete ROI
                </button>
              )}

              <button
                onClick={clearROIs}
                disabled={rois.length === 0}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear All ROIs
              </button>

              <div className="text-gray-300 text-sm">
                ROIs: {rois.length}/3 | Points: {currentROI.length}
              </div>
            </div>

            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full"
                controls
                onLoadedMetadata={(e) => {
                  const canvas = canvasRef.current;
                  canvas.width = e.target.videoWidth;
                  canvas.height = e.target.videoHeight;
                }}
              />
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                className="absolute top-0 left-0 w-full h-full cursor-crosshair"
                style={{ pointerEvents: isDrawingMode ? 'auto' : 'none' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* RTSP ROI Drawing and Live Feed */}
      {mode === 'rtsp' && rtspConnected && (
        <div className="bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">3. Draw ROI & Monitor Live Feed</h2>
          <div className="space-y-4">
            {/* ROI Drawing Controls */}
            {!isRtspActive && (
              <div className="flex items-center space-x-4">
                <button
                  onClick={startDrawing}
                  disabled={isDrawingMode || rois.length >= 3}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDrawingMode ? 'Drawing...' : `Draw ROI ${rois.length + 1}`}
                </button>

                {isDrawingMode && (
                  <button
                    onClick={completeROI}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Complete ROI
                  </button>
                )}

                <button
                  onClick={clearROIs}
                  disabled={rois.length === 0}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear All ROIs
                </button>

                <div className="text-gray-300 text-sm">
                  ROIs: {rois.length}/3
                  {isDrawingMode && ` | Points: ${currentROI.length}`}
                </div>
              </div>
            )}

            {/* Live Feed or ROI Drawing Canvas */}
            <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: '400px' }}>
              {isRtspActive ? (
                // Live feed with ROI overlay (same as Live Monitoring page)
                <img
                  src={`/api/productivity/rtsp/feed/${rtspSessionId}`}
                  alt="Live RTSP Feed"
                  className="w-full h-full object-contain"
                />
              ) : (
                // Static frame for ROI drawing
                <div className="relative">
                  <img
                    ref={videoRef}
                    src={rtspFrame}
                    alt="RTSP Frame"
                    className="w-full"
                    onLoad={(e) => {
                      const canvas = canvasRef.current;
                      canvas.width = e.target.naturalWidth;
                      canvas.height = e.target.naturalHeight;
                    }}
                  />
                  <canvas
                    ref={canvasRef}
                    onClick={handleCanvasClick}
                    className="absolute top-0 left-0 w-full h-full cursor-crosshair"
                    style={{ pointerEvents: isDrawingMode ? 'auto' : 'none' }}
                  />
                </div>
              )}
            </div>

            {/* RTSP Controls */}
            <div className="flex space-x-4">
              {!isRtspActive ? (
                <button
                  onClick={startRtspMonitoring}
                  disabled={rois.length === 0}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Play className="w-5 h-5" />
                  <span>Start Monitoring</span>
                </button>
              ) : (
                <button
                  onClick={stopRtspMonitoring}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center space-x-2"
                >
                  <Square className="w-5 h-5" />
                  <span>Stop Monitoring</span>
                </button>
              )}
            </div>

            {/* Live Statistics */}
            {isRtspActive && liveStats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {liveStats.roi_stats.map((stat, index) => (
                  <div key={index} className="bg-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-2">Machine {index + 1}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status:</span>
                        <span className={stat.is_red ? 'text-red-400 font-semibold' : 'text-green-400 font-semibold'}>
                          {stat.is_red ? '🔴 IDLE' : '🟢 ACTIVE'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Current Downtime:</span>
                        <span className="text-yellow-400 font-semibold">{stat.current_downtime}s</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Downtime:</span>
                        <span className="text-red-400 font-semibold">{stat.total_downtime}s</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Productive Time:</span>
                        <span className="text-green-400 font-semibold">{stat.productive_time}s</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Process Button (Video Mode) */}
      {mode === 'video' && videoUrl && rois.length > 0 && (
        <div className="bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">4. Process Video</h2>
          <button
            onClick={processVideo}
            disabled={isProcessing}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                <span>Start Processing</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Results */}
      {productivityData && (
        <div className="bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">
            {mode === 'video' ? '5. Results' : '4. Final Report'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {productivityData.roi_stats.map((stat, index) => (
              <div key={index} className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">Machine {index + 1}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Downtime:</span>
                    <span className="text-red-400 font-semibold">{stat.total_downtime}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Productive Time:</span>
                    <span className="text-green-400 font-semibold">{stat.productive_time}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Efficiency:</span>
                    <span className="text-indigo-400 font-semibold">{stat.efficiency}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Downtime Events:</span>
                    <span className="text-yellow-400 font-semibold">{stat.downtime_count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex space-x-4">
            <button
              onClick={downloadExcel}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center space-x-2"
            >
              <Download className="w-5 h-5" />
              <span>Download Excel Report</span>
            </button>

            {mode === 'video' && processedVideoUrl && (
              <a
                href={processedVideoUrl}
                download
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
              >
                <Download className="w-5 h-5" />
                <span>Download Processed Video</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FactoryProductivity;
