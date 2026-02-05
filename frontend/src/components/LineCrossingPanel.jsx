import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, RotateCcw, Eye, EyeOff } from 'lucide-react';
import LineCrossingDrawingModal from './LineCrossingDrawingModal';
import toast from 'react-hot-toast';

const LineCrossingPanel = ({ camera }) => {
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDrawingModal, setShowDrawingModal] = useState(false);
  const [editingLine, setEditingLine] = useState(null);

  useEffect(() => {
    if (camera) {
      fetchLines();
    }
  }, [camera]);

  const fetchLines = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/api/line-crossing/${camera.id}`);
      if (response.ok) {
        const data = await response.json();
        setLines(data);
      }
    } catch (error) {
      console.error('Error fetching lines:', error);
      toast.error('Failed to load line crossing zones');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLine = async (lineData) => {
    try {
      console.log('Creating line with data:', lineData);
      const response = await fetch(`http://localhost:8000/api/line-crossing/${camera.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lineData)
      });

      if (response.ok) {
        toast.success('Line crossing zone created successfully');
        setShowDrawingModal(false);
        fetchLines();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to create line crossing:', response.status, errorData);
        toast.error(`Failed to create line crossing zone: ${errorData.detail || response.statusText}`);
      }
    } catch (error) {
      console.error('Error creating line:', error);
      toast.error('Failed to create line crossing zone: ' + error.message);
    }
  };

  const handleUpdateLine = async (lineData) => {
    try {
      const response = await fetch(`http://localhost:8000/api/line-crossing/${editingLine.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lineData)
      });

      if (response.ok) {
        toast.success('Line crossing zone updated successfully');
        setShowDrawingModal(false);
        setEditingLine(null);
        fetchLines();
      } else {
        toast.error('Failed to update line crossing zone');
      }
    } catch (error) {
      console.error('Error updating line:', error);
      toast.error('Failed to update line crossing zone');
    }
  };

  const handleDeleteLine = async (lineId) => {
    if (!confirm('Are you sure you want to delete this line crossing zone?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/line-crossing/${lineId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Line crossing zone deleted successfully');
        fetchLines();
      } else {
        toast.error('Failed to delete line crossing zone');
      }
    } catch (error) {
      console.error('Error deleting line:', error);
      toast.error('Failed to delete line crossing zone');
    }
  };

  const handleToggleActive = async (line) => {
    try {
      const response = await fetch(`http://localhost:8000/api/line-crossing/${line.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...line, is_active: !line.is_active })
      });

      if (response.ok) {
        toast.success(`Line ${line.is_active ? 'disabled' : 'enabled'}`);
        fetchLines();
      } else {
        toast.error('Failed to toggle line status');
      }
    } catch (error) {
      console.error('Error toggling line:', error);
      toast.error('Failed to toggle line status');
    }
  };

  const handleResetCount = async (lineId) => {
    if (!confirm('Are you sure you want to reset the crossing count?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/line-crossing/${lineId}/reset-count`, {
        method: 'POST'
      });

      if (response.ok) {
        toast.success('Crossing count reset successfully');
        fetchLines();
      } else {
        toast.error('Failed to reset count');
      }
    } catch (error) {
      console.error('Error resetting count:', error);
      toast.error('Failed to reset count');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading line crossing zones...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-800">Line Crossing Zones</h3>
        <button
          onClick={() => {
            setEditingLine(null);
            setShowDrawingModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={18} />
          Add Line
        </button>
      </div>

      {lines.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">No line crossing zones configured</p>
          <button
            onClick={() => setShowDrawingModal(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Create First Line
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {lines.map((line) => (
            <div
              key={line.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: line.color }}
                    />
                    <h4 className="font-semibold text-gray-800">{line.name}</h4>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        line.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {line.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Direction:</span>{' '}
                      {line.count_direction === 'both' ? 'Both' : line.count_direction}
                    </div>
                    <div>
                      <span className="font-medium">Alerts:</span>{' '}
                      {line.alert_enabled ? 'Enabled' : 'Disabled'}
                    </div>
                    <div>
                      <span className="font-medium text-green-600">Count In:</span>{' '}
                      <span className="font-bold text-green-700">{line.count_in}</span>
                    </div>
                    <div>
                      <span className="font-medium text-red-600">Count Out:</span>{' '}
                      <span className="font-bold text-red-700">{line.count_out}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleActive(line)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                    title={line.is_active ? 'Disable' : 'Enable'}
                  >
                    {line.is_active ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  <button
                    onClick={() => handleResetCount(line.id)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    title="Reset Count"
                  >
                    <RotateCcw size={18} />
                  </button>
                  <button
                    onClick={() => {
                      setEditingLine(line);
                      setShowDrawingModal(true);
                    }}
                    className="p-2 text-yellow-600 hover:bg-yellow-50 rounded"
                    title="Edit"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteLine(line.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDrawingModal && (
        <LineCrossingDrawingModal
          camera={camera}
          existingLine={editingLine}
          onClose={() => {
            setShowDrawingModal(false);
            setEditingLine(null);
          }}
          onSave={editingLine ? handleUpdateLine : handleCreateLine}
        />
      )}
    </div>
  );
};

export default LineCrossingPanel;

