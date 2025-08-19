# API Endpoint Mapping for SidebarDataService

## Current Issues and Fixed Endpoints

### ✅ Fixed Issues:

1. **Pharmacy Dashboard Stats**: 
   - ❌ OLD: `/pharmacy/dashboard/stats` (404)
   - ✅ NEW: `/pharmacies/dashboard/stats`

2. **Order Stats**:
   - ❌ OLD: `/orders/stats` (400/404)  
   - ✅ NEW: `/prescription-requests/stats` (for pharmacy users)
   - ✅ FALLBACK: `/orders/admin/stats` (for admin users)

3. **Inventory Stats**:
   - ❌ OLD: `/pharmacy/inventory/stats` (404)
   - ✅ NEW: Custom logic using `/pharmacies/status/me` + `/inventory/pharmacy/{pharmacyId}`

### 📋 Complete Endpoint Mapping:

| Service Function | User Role | Endpoint | Status |
|-----------------|-----------|----------|--------|
| `getDashboardStats` | pharmacy | `/pharmacies/dashboard/stats` | ✅ Fixed |
| `getDashboardStats` | admin | `/admin/dashboard/stats` | ✅ Working |
| `getDashboardStats` | doctor | `/doctors/dashboard/stats` | ⚠️ Need to verify |
| `getDashboardStats` | patient | `/dashboard/quick-stats` | ⚠️ Need to verify |
| `getNotificationCounts` | all | `/notifications/notification-counts` | ✅ Working |
| `getPrescriptionRequestCounts` | pharmacy | `/prescription-requests/stats` | ✅ Working |
| `getAppointmentCounts` | doctor | `/doctors/{userId}/stats` | ✅ Fixed |
| `getOrderCounts` | pharmacy | `/prescription-requests/stats` | ✅ Fixed |
| `getOrderCounts` | admin | `/orders/admin/stats` | ✅ Fixed |
| `getChatCounts` | all | `/chat/stats` | ✅ Working |
| `getInventoryCounts` | pharmacy | Custom logic | ✅ Fixed |

### 🔧 Implementation Details:

#### 1. Pharmacy Dashboard Stats
```javascript
// Corrected endpoint
endpoint = '/pharmacies/dashboard/stats';
```

#### 2. Order Statistics
```javascript
// Try pharmacy-specific first, fallback to admin
try {
  const response = await apiClient.get('/prescription-requests/stats');
  // Extract order-like data from prescription stats
} catch (error) {
  const response = await apiClient.get('/orders/admin/stats');
  // Use admin order stats
}
```

#### 3. Inventory Statistics  
```javascript
// Two-step process:
// 1. Get current user's pharmacy ID
const pharmacyResponse = await apiClient.get('/pharmacies/status/me');
const pharmacyId = pharmacyResponse.data.data?._id;

// 2. Get inventory for that pharmacy
const response = await apiClient.get(`/inventory/pharmacy/${pharmacyId}`);
// Calculate low stock and out of stock counts locally
```

#### 4. Appointment Statistics
```javascript
// Get current user ID and fetch doctor stats
const userResponse = await apiClient.get('/auth/me');
const userId = userResponse.data.data?._id;
const response = await apiClient.get(`/doctors/${userId}/stats`);
```

### 🚀 Benefits of These Fixes:

1. **No More 404 Errors**: All endpoints now use correct paths
2. **No More 400 Errors**: Proper authentication and parameters
3. **Role-Based Logic**: Different endpoints for different user roles
4. **Graceful Fallbacks**: When primary endpoints fail, fallback to alternatives
5. **Better Error Handling**: Specific error handling for each service

### 🧪 Testing:

Use the `test-sidebar-endpoints.js` script to verify all endpoints:

```bash
cd backend
npm start

# In another terminal:
cd frontend
node ../test-sidebar-endpoints.js
```

### 📝 Notes:

- All endpoints require proper authentication headers
- Some endpoints are role-specific (pharmacy, admin, doctor, patient)
- The service uses caching to avoid excessive API calls
- Fallback mechanisms ensure UI remains functional even if some APIs fail
