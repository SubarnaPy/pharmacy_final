import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import { DarkModeContext } from '../../app/DarkModeContext';
import apiClient from '../../api/apiClient';
import { uploadSingleProduct, uploadInventoryCsv } from '../../api/inventoryAPI';
import { authUtils } from '../../utils/authUtils';
import {
  ArchiveBoxIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  DocumentArrowUpIcon,
  DocumentArrowDownIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  FunnelIcon,
  Squares2X2Icon,
  TableCellsIcon
} from '@heroicons/react/24/outline';

function InventoryManagement() {
  const { isDarkMode } = useContext(DarkModeContext);
  const [error, setError] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCsvUploadModal, setShowCsvUploadModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Get current user and pharmacy ID
  const currentUser = authUtils.getUser();
  console.log(currentUser);
  const [pharmacyId, setPharmacyId] = useState(null);

  // CSV Upload States
  const [csvFile, setCsvFile] = useState(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResults, setCsvResults] = useState(null);
  const [showCsvResults, setShowCsvResults] = useState(false);
  const [pharmacyLoading, setPharmacyLoading] = useState(true);

  const [newItem, setNewItem] = useState({
    name: '',
    genericName: '',
    brandName: '',
    manufacturer: '',
    category: '',
    dosageForm: 'tablet',
    strength: '',
    unit: 'mg',
    packSize: 1,
    prescriptionRequired: true,
    controlledSubstance: false,
    activeIngredients: [],
    sideEffects: [],
    contraindications: [],
    instructions: '',
    barcode: '',
    reorderLevel: 10,
    maxStockLevel: 100,
    storageConditions: {
      temperature: { min: 15, max: 25 },
      humidity: { min: 30, max: 70 },
      lightSensitive: false,
      refrigerated: false
    },
    ndc: '',
    batchNumber: '',
    expiryDate: '',
    quantity: '',
    minThreshold: '',
    maxThreshold: '',
    unitPrice: '',
    wholesaleCost: '',
    location: '',
    description: ''
  });

  useEffect(() => {
    fetchPharmacyId();
  }, []);

  useEffect(() => {
    if (pharmacyId) {
      fetchInventory();
    }
  }, [pharmacyId]);

  useEffect(() => {
    filterAndSortInventory();
  }, [inventory, searchTerm, filterCategory, sortBy]);

  const fetchPharmacyId = async () => {
    setPharmacyLoading(true);
    try {
      if (!currentUser) {
        toast.error('User not found. Please log in again.');
        return;
      }

      // Fetch pharmacy owned by this user
      const response = await apiClient.get('/pharmacies/status/me');
      console.log(response);
      if (response.data.success && response.data.data && response.data.data.hasPharmacy) {
        setPharmacyId(response.data.data._id);
      } else {
        toast.error('No pharmacy found for this user. Please register your pharmacy first.');
      }
    } catch (error) {
      console.error('Error fetching pharmacy ID:', error);
      if (error.response?.status === 404) {
        toast.error('No pharmacy found for this user. Please register your pharmacy first.');
      } else {
        toast.error('Failed to fetch pharmacy information');
      }
    } finally {
      setPharmacyLoading(false);
    }
  };

  const fetchInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!pharmacyId) {
        toast.error('Pharmacy ID not found. Please ensure you are logged in as a pharmacy user.');
        setLoading(false);
        return;
      }
      const response = await apiClient.get(`/inventory/pharmacy/${pharmacyId}`);
      setInventory(response.data.data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setError('Failed to fetch inventory');
      toast.error('Failed to fetch inventory');
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortInventory = () => {
    if (!Array.isArray(inventory)) {
      setFilteredInventory([]);
      return;
    }
    
    let filtered = inventory.filter(item => {
      if (!item) return false;
      
      const name = item.name || item.medicineName || '';
      const manufacturer = item.manufacturer || '';
      const batchNumber = item.batchNumber || '';
      const category = item.category || '';
      
      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batchNumber.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = filterCategory === 'all' || category === filterCategory;

      return matchesSearch && matchesCategory;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          const nameA = a.name || a.medicineName || '';
          const nameB = b.name || b.medicineName || '';
          return nameA.localeCompare(nameB);
        case 'quantity':
          const qtyA = a.quantity || a.quantityAvailable || 0;
          const qtyB = b.quantity || b.quantityAvailable || 0;
          return qtyB - qtyA;
        case 'expiry':
          const dateA = a.expiryDate ? new Date(a.expiryDate) : new Date(0);
          const dateB = b.expiryDate ? new Date(b.expiryDate) : new Date(0);
          return dateA - dateB;
        case 'price':
          const priceA = a.unitPrice || a.pricePerUnit || 0;
          const priceB = b.unitPrice || b.pricePerUnit || 0;
          return priceB - priceA;
        default:
          return 0;
      }
    });

    setFilteredInventory(filtered);
  };

  const getStatusInfo = (item) => {
    if (!item) return { status: 'unknown', color: 'gray', text: 'Unknown' };
    
    const quantity = item.quantity || item.quantityAvailable || 0;
    const minThreshold = item.minThreshold || 10;
    const maxThreshold = item.maxThreshold || 100;
    const expiryDate = item.expiryDate;
    
    let daysToExpiry = Infinity;
    if (expiryDate) {
      daysToExpiry = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    }
    
    if (quantity <= minThreshold) {
      return { status: 'low_stock', color: 'red', text: 'Low Stock' };
    } else if (daysToExpiry <= 30) {
      return { status: 'expiring_soon', color: 'yellow', text: 'Expiring Soon' };
    } else if (quantity >= maxThreshold) {
      return { status: 'overstock', color: 'blue', text: 'Overstock' };
    } else {
      return { status: 'in_stock', color: 'green', text: 'In Stock' };
    }
  };

  const handleAddItem = async () => {
    try {
      if (!pharmacyId) {
        toast.error('Pharmacy ID not found. Please ensure you are logged in as a pharmacy user.');
        return;
      }

      // First, create/update entry in comprehensive Medicine schema
      const medicinePayload = {
        basicInfo: {
          name: newItem.name,
          genericName: newItem.genericName || newItem.name,
          brandNames: newItem.brandName ? [newItem.brandName] : [],
          manufacturer: newItem.manufacturer,
          ndc: newItem.ndc || '',
          barcode: newItem.barcode || ''
        },
        formulation: {
          dosageForm: newItem.dosageForm,
          strength: newItem.strength,
          unit: newItem.unit,
          packSize: newItem.packSize || 1,
          activeIngredients: newItem.activeIngredients || []
        },
        regulatory: {
          prescriptionRequired: newItem.prescriptionRequired,
          controlledSubstance: newItem.controlledSubstance || false
        },
        clinicalInfo: {
          therapeuticClass: newItem.category || 'General',
          instructions: newItem.instructions || ''
        },
        inventory: {
          reorderLevel: newItem.reorderLevel || 10,
          maxStockLevel: newItem.maxStockLevel || 100
        },
        pricing: {
          wholesaleCost: newItem.wholesaleCost || 0,
          retailPrice: newItem.unitPrice || 0
        },
        pharmacySpecific: {
          pharmacyId: pharmacyId,
          location: newItem.location || '',
          notes: newItem.description || ''
        }
      };

      // Create medicine entry first
      try {
        await apiClient.post('/medicines', medicinePayload);
        console.log('Medicine entry created successfully');
      } catch (medicineError) {
        console.log('Medicine entry creation failed, proceeding:', medicineError.message);
      }

      // Then create inventory entry
      const inventoryPayload = {
        medicineName: newItem.name,
        brandName: newItem.brandName,
        batchNumber: newItem.batchNumber,
        dosageForm: newItem.dosageForm,
        strength: newItem.strength,
        unitWeightOrVolume: newItem.unitWeightOrVolume,
        unitMeasurement: newItem.unit,
        quantityAvailable: newItem.quantity,
        pricePerUnit: newItem.unitPrice,
        expiryDate: newItem.expiryDate,
        manufacturer: newItem.manufacturer,
        requiresPrescription: newItem.prescriptionRequired,
        medicineImage: newItem.medicineImage
      };
      
      const response = await uploadSingleProduct(pharmacyId, inventoryPayload);
      if (response.data.success) {
        toast.success('Medicine added to comprehensive database and inventory!');
        setShowAddModal(false);
        setNewItem({
          name: '',
          genericName: '',
          brandName: '',
          manufacturer: '',
          category: '',
          dosageForm: 'tablet',
          strength: '',
          unit: 'mg',
          packSize: 1,
          prescriptionRequired: true,
          controlledSubstance: false,
          activeIngredients: [],
          sideEffects: [],
          contraindications: [],
          instructions: '',
          barcode: '',
          reorderLevel: 10,
          maxStockLevel: 100,
          storageConditions: {
            temperature: { min: 15, max: 25 },
            humidity: { min: 30, max: 70 },
            lightSensitive: false,
            refrigerated: false
          },
          ndc: '',
          batchNumber: '',
          expiryDate: '',
          quantity: '',
          minThreshold: '',
          maxThreshold: '',
          unitPrice: '',
          wholesaleCost: '',
          location: '',
          description: ''
        });
        fetchInventory();
      }
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error(error.response?.data?.message || 'Failed to add item');
    }
  };

  const handleEditItem = async () => {
    try {
      const response = await apiClient.put(`/inventory/medications/${selectedItem._id}`, selectedItem);

      if (response.data.success) {
        toast.success('Item updated successfully');
        setShowEditModal(false);
        setSelectedItem(null);
        fetchInventory();
      }
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error(error.response?.data?.message || 'Failed to update item');
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        const response = await apiClient.delete(`/inventory/medications/${itemId}`);

        if (response.data.success) {
          toast.success('Item deleted successfully');
          fetchInventory();
        }
      } catch (error) {
        console.error('Error deleting item:', error);
        toast.error(error.response?.data?.message || 'Failed to delete item');
      }
    }
  };

  // CSV Upload Functions
  const handleCsvFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      setCsvFile(file);
    } else {
      toast.error('Please select a valid CSV file');
    }
  };

  const handleCsvUpload = async () => {
    if (!csvFile) {
      toast.error('Please select a CSV file first');
      return;
    }
    if (!pharmacyId) {
      toast.error('Pharmacy ID not found. Please ensure you are logged in as a pharmacy user.');
      return;
    }
    setCsvUploading(true);
    const formData = new FormData();
    formData.append('csvFile', csvFile); // Note: backend expects 'csvFile', not 'file'
    try {
      const response = await uploadInventoryCsv(pharmacyId, formData);
      if (response.data.success) {
        setCsvResults(response.data.data);
        setShowCsvResults(true);
        setShowCsvUploadModal(false);
        setCsvFile(null);

        const { summary } = response.data.data;
        if (summary.errors > 0) {
          toast.warning(`CSV processed with ${summary.errors} errors. ${summary.created} created, ${summary.updated} updated.`);
        } else {
          toast.success(`CSV uploaded successfully! ${summary.created} items created, ${summary.updated} items updated.`);
        }
        fetchInventory();
      }
    } catch (error) {
      console.error('Error uploading CSV:', error);
      toast.error(error.response?.data?.message || 'Failed to upload CSV file');
    } finally {
      setCsvUploading(false);
    }
  };

  const downloadCsvTemplate = async () => {
    try {
      const response = await apiClient.get('/inventory/csv-template', {
        responseType: 'blob'
      });

      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'medication_upload_template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('CSV template downloaded');
    } catch (error) {
      console.error('Error downloading template:', error);
      toast.error(error.response?.data?.message || 'Failed to download template');
    }
  };

  const createTestPharmacy = async () => {
    try {
      const response = await apiClient.post('/pharmacies/dev/create-test-pharmacy');
      if (response.data.success) {
        toast.success('Test pharmacy created successfully!');
        setPharmacyId(response.data.data.pharmacyId);
      }
    } catch (error) {
      console.error('Error creating test pharmacy:', error);
      toast.error(error.response?.data?.message || 'Failed to create test pharmacy');
    }
  };

  const categories = [...new Set(inventory.map(item => item.category).filter(category => category && category.trim()))];

  const InventoryCard = ({ item }) => {
    const statusInfo = getStatusInfo(item);

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
              {item.name}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {item.manufacturer} • Batch: {item.batchNumber}
            </p>
          </div>

          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color === 'red' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
            statusInfo.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
              statusInfo.color === 'blue' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
            }`}>
            {statusInfo.text}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Quantity:</span>
            <p className="font-medium text-gray-900 dark:text-white">
              {item.quantity} units
            </p>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Location:</span>
            <p className="font-medium text-gray-900 dark:text-white">
              {item.location}
            </p>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Expiry:</span>
            <p className="font-medium text-gray-900 dark:text-white">
              {new Date(item.expiryDate).toLocaleDateString()}
            </p>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Price:</span>
            <p className="font-medium text-gray-900 dark:text-white">
              ${item.unitPrice}
            </p>
          </div>
        </div>

        {/* Stock Level Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>Stock Level</span>
            <span>{item.quantity}/{item.maxThreshold}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${statusInfo.color === 'red' ? 'bg-red-500' :
                statusInfo.color === 'yellow' ? 'bg-yellow-500' :
                  statusInfo.color === 'blue' ? 'bg-blue-500' :
                    'bg-green-500'
                }`}
              style={{ width: `${Math.min((item.quantity / item.maxThreshold) * 100, 100)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Category: {item.category}
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setSelectedItem(item);
                setShowEditModal(true);
              }}
              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDeleteItem(item._id)}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const InventoryTable = ({ items }) => {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Medication
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Expiry Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {items.map((item) => {
                const statusInfo = getStatusInfo(item);
                return (
                  <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {item.manufacturer} • {item.batchNumber}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {item.quantity} units
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                            <div
                              className={`h-1.5 rounded-full transition-all ${statusInfo.color === 'red' ? 'bg-red-500' :
                                statusInfo.color === 'yellow' ? 'bg-yellow-500' :
                                  statusInfo.color === 'blue' ? 'bg-blue-500' :
                                    'bg-green-500'
                                }`}
                              style={{ width: `${Math.min((item.quantity / item.maxThreshold) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {new Date(item.expiryDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                      ${item.unitPrice}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color === 'red' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                        statusInfo.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          statusInfo.color === 'blue' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                            'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                        {statusInfo.text}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setShowEditModal(true);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item._id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const ItemModal = ({ isOpen, onClose, item, isEdit = false }) => {
    const [formData, setFormData] = useState(item || newItem);

    useEffect(() => {
      setFormData(item || newItem);
    }, [item]);

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              {isEdit ? 'Edit Item' : 'Add New Item'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Medicine Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Paracetamol"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Generic Name
                </label>
                <input
                  type="text"
                  value={formData.genericName}
                  onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Acetaminophen"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Brand Name
                </label>
                <input
                  type="text"
                  value={formData.brandName}
                  onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Tylenol"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Therapeutic Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select Category</option>
                  <option value="Analgesics">Analgesics</option>
                  <option value="Antibiotics">Antibiotics</option>
                  <option value="Antihypertensives">Antihypertensives</option>
                  <option value="Cardiovascular">Cardiovascular</option>
                  <option value="Gastrointestinal">Gastrointestinal</option>
                  <option value="Neurological">Neurological</option>
                  <option value="Respiratory">Respiratory</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Manufacturer *
                </label>
                <input
                  type="text"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Johnson & Johnson"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  NDC Number
                </label>
                <input
                  type="text"
                  value={formData.ndc}
                  onChange={(e) => setFormData({ ...formData, ndc: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., 12345-678-90"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Barcode
                </label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., 123456789012"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Batch Number *
                </label>
                <input
                  type="text"
                  value={formData.batchNumber}
                  onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., BATCH001"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Min Threshold
                </label>
                <input
                  type="number"
                  value={formData.minThreshold}
                  onChange={(e) => setFormData({ ...formData, minThreshold: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Threshold
                </label>
                <input
                  type="number"
                  value={formData.maxThreshold}
                  onChange={(e) => setFormData({ ...formData, maxThreshold: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Dosage Form *
                </label>
                <select
                  value={formData.dosageForm}
                  onChange={(e) => setFormData({ ...formData, dosageForm: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  <option value="tablet">Tablet</option>
                  <option value="capsule">Capsule</option>
                  <option value="syrup">Syrup</option>
                  <option value="injection">Injection</option>
                  <option value="drops">Drops</option>
                  <option value="cream">Cream</option>
                  <option value="ointment">Ointment</option>
                  <option value="gel">Gel</option>
                  <option value="patch">Patch</option>
                  <option value="inhaler">Inhaler</option>
                  <option value="suppository">Suppository</option>
                  <option value="powder">Powder</option>
                  <option value="solution">Solution</option>
                  <option value="suspension">Suspension</option>
                  <option value="lotion">Lotion</option>
                  <option value="spray">Spray</option>
                  <option value="granules">Granules</option>
                  <option value="sachets">Sachets</option>
                  <option value="vial">Vial</option>
                  <option value="ampoule">Ampoule</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Strength
                </label>
                <input
                  type="text"
                  value={formData.strength}
                  onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., 500mg, 5ml"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Wholesale Cost ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.wholesaleCost}
                  onChange={(e) => setFormData({ ...formData, wholesaleCost: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Retail Price ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Storage Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Shelf A-1, Refrigerator"
                />
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.prescriptionRequired}
                    onChange={(e) => setFormData({ ...formData, prescriptionRequired: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Requires Prescription</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.controlledSubstance}
                    onChange={(e) => setFormData({ ...formData, controlledSubstance: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Controlled Substance</span>
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Clinical Instructions
                </label>
                <textarea
                  rows={2}
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Usage instructions, dosage guidelines, etc."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Additional Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Additional pharmacy-specific notes..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-4 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={isEdit ? handleEditItem : handleAddItem}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                {isEdit ? 'Update' : 'Add'} Item
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="text-red-500 mb-4">⚠️ Error</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Something went wrong
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        <button
          onClick={() => {
            setError(null);
            fetchInventory();
          }}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            📦 Inventory Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your pharmacy inventory and stock levels
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Enhanced Medicine Database Button */}
          <button
            onClick={() => toast.info('Enhanced medicine database integration active! All new medicines are added to both comprehensive Medicine schema and pharmacy inventory.')}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-lg font-medium transition-all transform hover:scale-105 shadow-lg"
          >
            <span className="text-sm">🧬</span>
            <span className="text-sm font-semibold">Enhanced DB</span>
          </button>

          {/* View Toggle Button */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'grid'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              <Squares2X2Icon className="h-4 w-4" />
              <span>Grid</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'table'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              <TableCellsIcon className="h-4 w-4" />
              <span>Table</span>
            </button>
          </div>

          {/* CSV Upload Button */}
          <button
            onClick={() => setShowCsvUploadModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
          >
            <CloudArrowUpIcon className="h-5 w-5" />
            <span>Bulk Upload</span>
          </button>

          {/* Download Template Button */}
          <button
            onClick={downloadCsvTemplate}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors"
          >
            <DocumentArrowDownIcon className="h-5 w-5" />
            <span>Template</span>
          </button>

          {/* Add Item Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ArchiveBoxIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Items</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {inventory.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Low Stock</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {inventory.filter(item => {
                  const qty = item.quantity || item.quantityAvailable || 0;
                  const minThreshold = item.minThreshold || 10;
                  return qty <= minThreshold;
                }).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <ArrowTrendingDownIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Expiring Soon</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {inventory.filter(item => {
                  if (!item.expiryDate) return false;
                  const daysToExpiry = Math.ceil((new Date(item.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                  return daysToExpiry <= 30;
                }).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <ArrowTrendingUpIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Value</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${inventory.reduce((total, item) => {
                  const qty = item.quantity || item.quantityAvailable || 0;
                  const price = item.unitPrice || item.pricePerUnit || 0;
                  return total + (qty * price);
                }, 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="name">Sort by Name</option>
            <option value="quantity">Sort by Quantity</option>
            <option value="expiry">Sort by Expiry</option>
            <option value="price">Sort by Price</option>
          </select>
        </div>
      </div>

      {/* Inventory Display */}
      {pharmacyLoading ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading pharmacy information...</p>
        </div>
      ) : !pharmacyId ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <ArchiveBoxIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Pharmacy Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Please register your pharmacy first to manage inventory
          </p>
          {import.meta.env.MODE === 'development' && (
            <button
              onClick={createTestPharmacy}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              Create Test Pharmacy (Dev)
            </button>
          )}
        </div>
      ) : loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      ) : filteredInventory.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <ArchiveBoxIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Items Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm ? 'Try adjusting your search criteria' : 'Start by adding your first inventory item'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <InventoryTable items={filteredInventory} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInventory.map((item) => (
            <InventoryCard key={item._id} item={item} />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <ItemModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        item={newItem}
      />

      <ItemModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        item={selectedItem}
        isEdit={true}
      />

      {/* CSV Upload Modal */}
      {showCsvUploadModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCsvUploadModal(false)} />

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 sm:mx-0 sm:h-10 sm:w-10">
                    <CloudArrowUpIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                      Bulk Upload Medications
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Upload a CSV file to add multiple medications at once. Download the template first to see the required format.
                      </p>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Select CSV File
                      </label>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleCsvFileSelect}
                        className="block w-full text-sm text-gray-500 dark:text-gray-400
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-lg file:border-0
                          file:text-sm file:font-medium
                          file:bg-blue-50 file:text-blue-700
                          hover:file:bg-blue-100
                          dark:file:bg-gray-700 dark:file:text-gray-300"
                      />
                      {csvFile && (
                        <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                          Selected: {csvFile.name}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                        📋 Upload Instructions:
                      </h4>
                      <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                        <li>• Download the CSV template first (includes sample data and valid values)</li>
                        <li>• Fill in all required fields (medicineName, batchNumber, dosageForm, etc.)</li>
                        <li>• Use proper formats for dates (YYYY-MM-DD)</li>
                        <li>• Boolean fields: use 'true' or 'false'</li>
                        <li>• dosageForm: tablet, capsule, syrup, injection, drops, cream, ointment, gel, patch, inhaler, suppository, powder, solution, suspension, lotion, spray, granules, sachets, vial, ampoule</li>
                        <li>• unitMeasurement: mg, g, mcg, ml, l, iu, units, %</li>
                        <li>• Existing medications will be updated</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleCsvUpload}
                  disabled={!csvFile || csvUploading}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {csvUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    'Upload CSV'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCsvUploadModal(false);
                    setCsvFile(null);
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-500 shadow-sm px-4 py-2 bg-white dark:bg-gray-600 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV Results Modal */}
      {showCsvResults && csvResults && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCsvResults(false)} />

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 sm:mx-0 sm:h-10 sm:w-10">
                    <DocumentArrowUpIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                      CSV Upload Results
                    </h3>

                    {/* Summary */}
                    <div className="mt-4 grid grid-cols-4 gap-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {csvResults.totalProcessed}
                        </div>
                        <div className="text-sm text-blue-800 dark:text-blue-200">Total Processed</div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {csvResults.summary.created}
                        </div>
                        <div className="text-sm text-green-800 dark:text-green-200">Created</div>
                      </div>
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                          {csvResults.summary.updated}
                        </div>
                        <div className="text-sm text-yellow-800 dark:text-yellow-200">Updated</div>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {csvResults.summary.errors}
                        </div>
                        <div className="text-sm text-red-800 dark:text-red-200">Errors</div>
                      </div>
                    </div>

                    {/* Successful Items */}
                    {csvResults.successful && csvResults.successful.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2 flex items-center">
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          Successful ({csvResults.successful.length})
                        </h4>
                        <div className="max-h-32 overflow-y-auto border border-green-200 dark:border-green-700 rounded">
                          {csvResults.successful.map((item, index) => (
                            <div key={index} className="px-3 py-2 text-sm border-b border-green-100 dark:border-green-800 last:border-b-0">
                              <span className="font-medium">{item.medication?.name || item.name}</span>
                              <span className="text-green-600 dark:text-green-400 ml-2">({item.action || 'processed'})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Failed Items */}
                    {csvResults.failed && csvResults.failed.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2 flex items-center">
                          <XCircleIcon className="h-4 w-4 mr-1" />
                          Failed ({csvResults.failed.length})
                        </h4>
                        <div className="max-h-32 overflow-y-auto border border-red-200 dark:border-red-700 rounded">
                          {csvResults.failed.map((item, index) => (
                            <div key={index} className="px-3 py-2 text-sm border-b border-red-100 dark:border-red-800 last:border-b-0">
                              <div className="font-medium text-red-800 dark:text-red-200">Row {item.row}</div>
                              <div className="text-red-600 dark:text-red-400 text-xs">{item.error}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setShowCsvResults(false)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryManagement;
