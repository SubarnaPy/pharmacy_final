import React, { useState, useEffect } from 'react';
import { userAPI } from '../api/patientAPI';
import { toast } from 'react-toastify';
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes } from 'react-icons/fa';

const HealthHistory = () => {
  const [healthHistory, setHealthHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRecord, setNewRecord] = useState({
    condition: '',
    diagnosedDate: '',
    medication: '',
    doctor: '',
    notes: ''
  });

  useEffect(() => {
    fetchHealthHistory();
  }, []);

  const fetchHealthHistory = async () => {
    try {
      // Debug authentication status
      const token = localStorage.getItem('token');
      console.log('🔍 HealthHistory - Token available:', !!token);
      console.log('🔍 HealthHistory - Token value:', token ? token.substring(0, 20) + '...' : 'null');
      
      const response = await userAPI.getHealthHistory();
      if (response.data.success) {
        setHealthHistory(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching health history:', error);
      console.error('Error details:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        url: error.config?.url
      });
      
      if (error.response?.status === 401) {
        toast.error('Authentication required. Please login again.');
      } else {
        toast.error('Failed to load health history');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecord = async (e) => {
    e.preventDefault();
    try {
      const response = await userAPI.addHealthHistory(newRecord);
      if (response.data.success) {
        setHealthHistory(response.data.data);
        setNewRecord({
          condition: '',
          diagnosedDate: '',
          medication: '',
          doctor: '',
          notes: ''
        });
        setShowAddForm(false);
        toast.success('Health record added successfully');
      }
    } catch (error) {
      console.error('Error adding health record:', error);
      toast.error('Failed to add health record');
    }
  };

  const handleUpdateRecord = async (recordId, updates) => {
    try {
      const response = await userAPI.updateHealthHistory(recordId, updates);
      if (response.data.success) {
        setHealthHistory(response.data.data);
        setEditingId(null);
        toast.success('Health record updated successfully');
      }
    } catch (error) {
      console.error('Error updating health record:', error);
      toast.error('Failed to update health record');
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (window.confirm('Are you sure you want to delete this health record?')) {
      try {
        const response = await userAPI.deleteHealthHistory(recordId);
        if (response.data.success) {
          setHealthHistory(response.data.data);
          toast.success('Health record deleted successfully');
        }
      } catch (error) {
        console.error('Error deleting health record:', error);
        toast.error('Failed to delete health record');
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Health History</h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <FaPlus /> Add Record
          </button>
        </div>

        {/* Add New Record Form */}
        {showAddForm && (
          <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
            <h3 className="text-lg font-semibold mb-4">Add New Health Record</h3>
            <form onSubmit={handleAddRecord} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Condition *
                  </label>
                  <input
                    type="text"
                    value={newRecord.condition}
                    onChange={(e) => setNewRecord(prev => ({ ...prev, condition: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Diagnosed Date
                  </label>
                  <input
                    type="date"
                    value={newRecord.diagnosedDate}
                    onChange={(e) => setNewRecord(prev => ({ ...prev, diagnosedDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medication
                  </label>
                  <input
                    type="text"
                    value={newRecord.medication}
                    onChange={(e) => setNewRecord(prev => ({ ...prev, medication: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Doctor
                  </label>
                  <input
                    type="text"
                    value={newRecord.doctor}
                    onChange={(e) => setNewRecord(prev => ({ ...prev, doctor: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={newRecord.notes}
                  onChange={(e) => setNewRecord(prev => ({ ...prev, notes: e.target.value }))}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <FaSave /> Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  <FaTimes /> Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Health History Records */}
        {healthHistory.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No health records found. Add your first record!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {healthHistory.map((record) => (
              <HealthRecord
                key={record._id}
                record={record}
                isEditing={editingId === record._id}
                onEdit={() => setEditingId(record._id)}
                onSave={(updates) => handleUpdateRecord(record._id, updates)}
                onCancel={() => setEditingId(null)}
                onDelete={() => handleDeleteRecord(record._id)}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const HealthRecord = ({ record, isEditing, onEdit, onSave, onCancel, onDelete, formatDate }) => {
  const [editData, setEditData] = useState({
    condition: record.condition,
    diagnosedDate: record.diagnosedDate ? record.diagnosedDate.split('T')[0] : '',
    medication: record.medication || '',
    doctor: record.doctor || '',
    notes: record.notes || ''
  });

  const handleSave = () => {
    onSave(editData);
  };

  if (isEditing) {
    return (
      <div className="border border-gray-200 rounded-md p-4 bg-blue-50">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
              <input
                type="text"
                value={editData.condition}
                onChange={(e) => setEditData(prev => ({ ...prev, condition: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosed Date</label>
              <input
                type="date"
                value={editData.diagnosedDate}
                onChange={(e) => setEditData(prev => ({ ...prev, diagnosedDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Medication</label>
              <input
                type="text"
                value={editData.medication}
                onChange={(e) => setEditData(prev => ({ ...prev, medication: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Doctor</label>
              <input
                type="text"
                value={editData.doctor}
                onChange={(e) => setEditData(prev => ({ ...prev, doctor: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={editData.notes}
              onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
            >
              <FaSave /> Save
            </button>
            <button
              onClick={onCancel}
              className="flex items-center gap-2 px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
            >
              <FaTimes /> Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-md p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800">{record.condition}</h3>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            {record.diagnosedDate && (
              <div>
                <span className="font-medium">Diagnosed:</span> {formatDate(record.diagnosedDate)}
              </div>
            )}
            {record.medication && (
              <div>
                <span className="font-medium">Medication:</span> {record.medication}
              </div>
            )}
            {record.doctor && (
              <div>
                <span className="font-medium">Doctor:</span> {record.doctor}
              </div>
            )}
          </div>
          {record.notes && (
            <div className="mt-2 text-sm text-gray-600">
              <span className="font-medium">Notes:</span> {record.notes}
            </div>
          )}
        </div>
        
        <div className="flex gap-2 ml-4">
          <button
            onClick={onEdit}
            className="p-2 text-blue-600 hover:bg-blue-100 rounded-md"
            title="Edit"
          >
            <FaEdit />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:bg-red-100 rounded-md"
            title="Delete"
          >
            <FaTrash />
          </button>
        </div>
      </div>
    </div>
  );
};

export default HealthHistory;
