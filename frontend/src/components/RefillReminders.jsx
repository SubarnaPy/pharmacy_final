import React, { useState, useEffect } from 'react';
import { reminderAPI } from '../api/patientAPI';
import { toast } from 'react-toastify';
import { FaBell, FaPlus, FaEdit, FaTrash, FaClock, FaPills, FaTimes } from 'react-icons/fa';

const RefillReminders = () => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [formData, setFormData] = useState({
    medicationName: '',
    dosage: '',
    frequency: 'daily',
    reminderDays: 7,
    customSchedule: [],
    notes: '',
    isActive: true
  });

  const frequencyOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'twice_daily', label: 'Twice Daily' },
    { value: 'three_times_daily', label: 'Three Times Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'custom', label: 'Custom Schedule' }
  ];

  const reminderDaysOptions = [
    { value: 3, label: '3 days before' },
    { value: 5, label: '5 days before' },
    { value: 7, label: '1 week before' },
    { value: 14, label: '2 weeks before' },
    { value: 30, label: '1 month before' }
  ];

  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ];

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const response = await reminderAPI.getReminders();
      if (response.data.success) {
        setReminders(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching reminders:', error);
      toast.error('Failed to fetch reminders');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.medicationName.trim()) {
      toast.error('Please enter medication name');
      return;
    }

    setLoading(true);
    try {
      let response;
      if (editingReminder) {
        response = await reminderAPI.updateReminder(editingReminder._id, formData);
      } else {
        response = await reminderAPI.scheduleReminder(formData);
      }

      if (response.data.success) {
        toast.success(editingReminder ? 'Reminder updated successfully' : 'Reminder scheduled successfully');
        setShowForm(false);
        setEditingReminder(null);
        resetForm();
        fetchReminders();
      }
    } catch (error) {
      console.error('Error saving reminder:', error);
      toast.error(error.response?.data?.message || 'Failed to save reminder');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (reminder) => {
    setEditingReminder(reminder);
    setFormData({
      medicationName: reminder.medicationName,
      dosage: reminder.dosage || '',
      frequency: reminder.frequency,
      reminderDays: reminder.reminderDays,
      customSchedule: reminder.customSchedule || [],
      notes: reminder.notes || '',
      isActive: reminder.isActive
    });
    setShowForm(true);
  };

  const handleDelete = async (reminderId) => {
    if (!window.confirm('Are you sure you want to delete this reminder?')) {
      return;
    }

    try {
      const response = await reminderAPI.cancelReminder(reminderId);
      if (response.data.success) {
        toast.success('Reminder deleted successfully');
        fetchReminders();
      }
    } catch (error) {
      console.error('Error deleting reminder:', error);
      toast.error('Failed to delete reminder');
    }
  };

  const toggleReminderStatus = async (reminderId, currentStatus) => {
    try {
      const response = await reminderAPI.updateReminder(reminderId, {
        isActive: !currentStatus
      });
      
      if (response.data.success) {
        toast.success(`Reminder ${!currentStatus ? 'activated' : 'deactivated'}`);
        fetchReminders();
      }
    } catch (error) {
      console.error('Error updating reminder status:', error);
      toast.error('Failed to update reminder status');
    }
  };

  const resetForm = () => {
    setFormData({
      medicationName: '',
      dosage: '',
      frequency: 'daily',
      reminderDays: 7,
      customSchedule: [],
      notes: '',
      isActive: true
    });
  };

  const handleCustomScheduleChange = (day, checked) => {
    setFormData(prev => ({
      ...prev,
      customSchedule: checked
        ? [...prev.customSchedule, day]
        : prev.customSchedule.filter(d => d !== day)
    }));
  };

  const getNextRefillDate = (reminder) => {
    if (reminder.nextRefillDate) {
      return new Date(reminder.nextRefillDate).toLocaleDateString();
    }
    return 'Not calculated';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysUntilRefill = (nextRefillDate) => {
    if (!nextRefillDate) return null;
    const today = new Date();
    const refillDate = new Date(nextRefillDate);
    const diffTime = refillDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Refill Reminders</h2>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingReminder(null);
              resetForm();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <FaPlus />
            Add Reminder
          </button>
        </div>

        {/* Reminders List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading reminders...</p>
            </div>
          ) : reminders.length === 0 ? (
            <div className="text-center py-8">
              <FaBell className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">No reminders set. Create your first reminder!</p>
            </div>
          ) : (
            reminders.map(reminder => {
              const daysUntilRefill = getDaysUntilRefill(reminder.nextRefillDate);
              return (
                <div key={reminder._id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <FaPills className="text-blue-500" />
                            {reminder.medicationName}
                            {reminder.dosage && (
                              <span className="text-sm text-gray-600">({reminder.dosage})</span>
                            )}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(reminder.isActive ? 'active' : 'inactive')}`}>
                            {reminder.isActive ? 'Active' : 'Inactive'}
                          </span>
                          {daysUntilRefill !== null && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              daysUntilRefill <= 3 
                                ? 'bg-red-100 text-red-800' 
                                : daysUntilRefill <= 7 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {daysUntilRefill > 0 ? `${daysUntilRefill} days left` : 'Refill needed'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <FaClock className="text-green-500" />
                          <span>
                            {frequencyOptions.find(f => f.value === reminder.frequency)?.label || reminder.frequency}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Remind </span>
                          <span className="font-medium text-gray-800">
                            {reminder.reminderDays} days before
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Next refill: </span>
                          <span className="font-medium text-gray-800">
                            {getNextRefillDate(reminder)}
                          </span>
                        </div>
                      </div>

                      {reminder.frequency === 'custom' && reminder.customSchedule && reminder.customSchedule.length > 0 && (
                        <div className="mb-4">
                          <span className="text-gray-600">Custom schedule: </span>
                          <span className="font-medium text-gray-800">
                            {reminder.customSchedule.map(day => 
                              daysOfWeek.find(d => d.value === day)?.label
                            ).join(', ')}
                          </span>
                        </div>
                      )}

                      {reminder.notes && (
                        <div className="mb-4">
                          <span className="text-gray-600">Notes: </span>
                          <span className="text-gray-800">{reminder.notes}</span>
                        </div>
                      )}

                      <div className="text-sm text-gray-500">
                        Created: {new Date(reminder.createdAt).toLocaleDateString()}
                        {reminder.lastNotificationSent && (
                          <span className="ml-4">
                            Last notification: {new Date(reminder.lastNotificationSent).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 lg:ml-6 mt-4 lg:mt-0">
                      <button
                        onClick={() => toggleReminderStatus(reminder._id, reminder.isActive)}
                        className={`px-4 py-2 rounded-md flex items-center gap-2 whitespace-nowrap ${
                          reminder.isActive 
                            ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        <FaBell />
                        {reminder.isActive ? 'Deactivate' : 'Activate'}
                      </button>

                      <button
                        onClick={() => handleEdit(reminder)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 whitespace-nowrap"
                      >
                        <FaEdit />
                        Edit
                      </button>

                      <button
                        onClick={() => handleDelete(reminder._id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2 whitespace-nowrap"
                      >
                        <FaTrash />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add/Edit Reminder Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-800">
                  {editingReminder ? 'Edit Reminder' : 'Add New Reminder'}
                </h3>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingReminder(null);
                    resetForm();
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Medication Name *
                    </label>
                    <input
                      type="text"
                      value={formData.medicationName}
                      onChange={(e) => setFormData(prev => ({ ...prev, medicationName: e.target.value }))}
                      placeholder="Enter medication name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dosage
                    </label>
                    <input
                      type="text"
                      value={formData.dosage}
                      onChange={(e) => setFormData(prev => ({ ...prev, dosage: e.target.value }))}
                      placeholder="e.g., 10mg, 2 tablets"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frequency
                    </label>
                    <select
                      value={formData.frequency}
                      onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {frequencyOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reminder Timing
                    </label>
                    <select
                      value={formData.reminderDays}
                      onChange={(e) => setFormData(prev => ({ ...prev, reminderDays: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {reminderDaysOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {formData.frequency === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Schedule (Select Days)
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {daysOfWeek.map(day => (
                        <label key={day.value} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.customSchedule.includes(day.value)}
                            onChange={(e) => handleCustomScheduleChange(day.value, e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{day.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes about this medication"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Activate reminder immediately</span>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : editingReminder ? 'Update Reminder' : 'Create Reminder'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingReminder(null);
                      resetForm();
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefillReminders;
