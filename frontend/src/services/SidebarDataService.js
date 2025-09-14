import apiClient from '../api/apiClient';

class SidebarDataService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get cached data or fetch from API
   */
  async getCachedData(key, fetchFunction) {
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.cacheTimeout) {
      console.log(`📦 Using cached data for ${key}`);
      return cached.data;
    }

    try {
      console.log(`🔍 Fetching fresh data for ${key}`);
      const data = await fetchFunction();
      this.cache.set(key, { data, timestamp: now });
      console.log(`✅ Successfully fetched ${key}:`, data);
      return data;
    } catch (error) {
      console.error(`❌ Failed to fetch ${key}:`, {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      
      // Return cached data if available, otherwise default values
      if (cached?.data) {
        console.log(`📦 Using stale cached data for ${key}`);
        return cached.data;
      }
      
      console.log(`🔄 Using default values for ${key}`);
      return this.getDefaultCounts();
    }
  }

  /**
   * Get default counts when API fails
   */
  getDefaultCounts() {
    return {
      notifications: 0,
      'prescription-requests': 0,
      appointments: 0,
      consultations: 0,
      orders: 0,
      'chat-messages': 0,
      'low-stock': 0,
      'pending-verifications': 0,
      'system-alerts': 0
    };
  }

  /**
   * Fetch notification counts for all categories
   */
  async getNotificationCounts() {
    return this.getCachedData('notification-counts', async () => {
      const response = await apiClient.get('/notifications/notification-counts');
      return response.data.data || this.getDefaultCounts();
    });
  }

  /**
   * Fetch dashboard statistics based on user role
   */
  async getDashboardStats(userRole) {
    return this.getCachedData(`dashboard-stats-${userRole}`, async () => {
      let endpoint;
      switch (userRole) {
        case 'admin':
          endpoint = '/admin/dashboard/stats';
          break;
        case 'pharmacy':
          endpoint = '/pharmacies/dashboard/stats';
          break;
        case 'doctor':
          endpoint = '/doctors/dashboard/stats';
          break;
        case 'patient':
          endpoint = '/dashboard/quick-stats';
          break;
        default:
          endpoint = '/dashboard/quick-stats';
      }

      const response = await apiClient.get(endpoint);
      return response.data.data || {};
    });
  }

  /**
   * Fetch prescription request counts for pharmacy
   */
  async getPrescriptionRequestCounts() {
    return this.getCachedData('prescription-requests', async () => {
      const response = await apiClient.get('/prescription-requests/stats');
      return {
        pending: response.data.data?.pending || 0,
        total: response.data.data?.total || 0
      };
    });
  }

  /**
   * Fetch appointment counts for doctors
   */
  async getAppointmentCounts() {
    return this.getCachedData('appointments', async () => {
      try {
        // Try to get current user's doctor stats
        const userResponse = await apiClient.get('/auth/me');
        const userId = userResponse.data.data?._id;
        
        if (!userId) {
          throw new Error('User ID not found');
        }
        
        const response = await apiClient.get(`/doctors/${userId}/stats`);
        return {
          upcoming: response.data.data?.upcomingAppointments || 0,
          today: response.data.data?.todayAppointments || 0,
          total: response.data.data?.totalAppointments || 0
        };
      } catch (error) {
        console.warn('Failed to fetch appointment stats:', error.message);
        return {
          upcoming: 0,
          today: 0,
          total: 0
        };
      }
    });
  }

  /**
   * Fetch order counts
   */
  async getOrderCounts() {
    return this.getCachedData('orders', async () => {
      try {
        // Try pharmacy-specific orders first
        const response = await apiClient.get('/prescription-requests/stats');
        return {
          active: response.data.data?.active || 0,
          pending: response.data.data?.pending || 0,
          inTransit: response.data.data?.inTransit || 0
        };
      } catch (error) {
        // Fallback for admin users
        try {
          const response = await apiClient.get('/orders/admin/stats');
          return {
            active: response.data.data?.active || 0,
            pending: response.data.data?.pending || 0,
            inTransit: response.data.data?.inTransit || 0
          };
        } catch (adminError) {
          console.warn('No order stats available for this user role');
          return { active: 0, pending: 0, inTransit: 0 };
        }
      }
    });
  }

  /**
   * Fetch chat/message counts
   */
  async getChatCounts() {
    return this.getCachedData('chat', async () => {
      const response = await apiClient.get('/chat/stats');
      return {
        unreadMessages: response.data.data?.unreadMessagesCount || 0,
        activeRooms: response.data.data?.userRoomsCount || 0
      };
    });
  }

  /**
   * Fetch inventory counts for pharmacy
   */
  async getInventoryCounts() {
    return this.getCachedData('inventory', async () => {
      try {
        // Get current user's pharmacy first
        const pharmacyResponse = await apiClient.get('/pharmacies/status/me');
        const pharmacyId = pharmacyResponse.data.data?._id;
        
        if (!pharmacyId) {
          throw new Error('No pharmacy found for current user');
        }
        
        // Get inventory for this pharmacy
        const response = await apiClient.get(`/inventory/pharmacy/${pharmacyId}`);
        const inventory = response.data.data || [];
        
        // Count low stock and out of stock items
        const lowStock = inventory.filter(item => 
          (item.quantity || item.quantityAvailable || 0) <= (item.minThreshold || item.reorderLevel || 10)
        ).length;
        
        const outOfStock = inventory.filter(item => 
          (item.quantity || item.quantityAvailable || 0) === 0
        ).length;
        
        return {
          lowStock,
          outOfStock,
          totalItems: inventory.length
        };
      } catch (error) {
        console.warn('Failed to fetch inventory stats:', error.message);
        return {
          lowStock: 0,
          outOfStock: 0,
          totalItems: 0
        };
      }
    });
  }

  /**
   * Get all sidebar badge counts for a specific user role
   */
  async getAllBadgeCounts(userRole) {
    try {
      // Fetch all data in parallel
      const [
        notificationCounts,
        dashboardStats,
        prescriptionRequests,
        appointments,
        orders,
        chatCounts,
        inventoryCounts
      ] = await Promise.allSettled([
        this.getNotificationCounts(),
        this.getDashboardStats(userRole),
        userRole === 'pharmacy' ? this.getPrescriptionRequestCounts() : Promise.resolve({}),
        userRole === 'doctor' ? this.getAppointmentCounts() : Promise.resolve({}),
        this.getOrderCounts(),
        this.getChatCounts(),
        userRole === 'pharmacy' ? this.getInventoryCounts() : Promise.resolve({})
      ]);

      // Combine all counts
      const counts = {
        // Notifications
        notifications: notificationCounts.status === 'fulfilled' ? notificationCounts.value.notifications : 0,
        
        // Prescription requests (pharmacy)
        'prescription-requests': prescriptionRequests.status === 'fulfilled' ? prescriptionRequests.value.pending : 0,
        'prescription-queue': prescriptionRequests.status === 'fulfilled' ? prescriptionRequests.value.pending : 0,
        
        // Appointments (doctor)
        appointments: appointments.status === 'fulfilled' ? appointments.value.upcoming : 0,
        consultations: appointments.status === 'fulfilled' ? appointments.value.today : 0,
        
        // Orders
        'order-management': orders.status === 'fulfilled' ? orders.value.active : 0,
        'order-tracking': orders.status === 'fulfilled' ? orders.value.inTransit : 0,
        'active-orders': orders.status === 'fulfilled' ? orders.value.active : 0,
        
        // Chat
        'chat-messages': chatCounts.status === 'fulfilled' ? chatCounts.value.unreadMessages : 0,
        chat: chatCounts.status === 'fulfilled' ? chatCounts.value.unreadMessages : 0,
        
        // Inventory (pharmacy)
        inventory: inventoryCounts.status === 'fulfilled' ? inventoryCounts.value.lowStock : 0,
        'low-stock': inventoryCounts.status === 'fulfilled' ? inventoryCounts.value.lowStock : 0,
        
        // Admin specific
        'pending-verifications': dashboardStats.status === 'fulfilled' ? (dashboardStats.value.pendingVerifications || 0) : 0,
        'system-alerts': dashboardStats.status === 'fulfilled' ? (dashboardStats.value.systemAlerts || 0) : 0,
        
        // Patient specific
        'my-requests': notificationCounts.status === 'fulfilled' ? (notificationCounts.value['prescription-responses'] || 0) : 0,
        'doctor-book': dashboardStats.status === 'fulfilled' ? (dashboardStats.value.availableSlots || 0) : 0,
        reminders: dashboardStats.status === 'fulfilled' ? (dashboardStats.value.dueReminders || 0) : 0,
      };

      return counts;
    } catch (error) {
      console.error('Failed to fetch all badge counts:', error);
      return this.getDefaultCounts();
    }
  }

  /**
   * Clear cache (useful for logout or role changes)
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Update specific cache entry
   */
  updateCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
}

export default new SidebarDataService();
