import { useState, useEffect, useCallback, useRef } from 'react';
import notificationService from '../services/notificationService.js';

const useOfflineState = (options = {}) => {
  const {
    onOnline,
    onOffline,
    showNotifications = true,
    pingUrl = '/api/health',
    pingInterval = 30000, // 30 seconds
    maxQueueSize = 100
  } = options;

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queuedOperations, setQueuedOperations] = useState([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const pingIntervalRef = useRef(null);
  const hasShownOfflineNotification = useRef(false);

  // Queue an operation to be executed when online
  const queueOperation = useCallback((operation, operationName, priority = 0) => {
    if (queuedOperations.length >= maxQueueSize) {
      console.warn('Operation queue is full, removing oldest operation');
      setQueuedOperations(prev => prev.slice(1));
    }

    const queuedOp = {
      id: Date.now() + Math.random(),
      operation,
      operationName,
      priority,
      timestamp: Date.now(),
      retryCount: 0
    };

    setQueuedOperations(prev => {
      const newQueue = [...prev, queuedOp];
      // Sort by priority (higher first), then by timestamp (older first)
      return newQueue.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return a.timestamp - b.timestamp;
      });
    });

    return queuedOp.id;
  }, [queuedOperations.length, maxQueueSize]);

  // Remove operation from queue
  const removeFromQueue = useCallback((operationId) => {
    setQueuedOperations(prev => prev.filter(op => op.id !== operationId));
  }, []);

  // Process queued operations when coming back online
  const processQueue = useCallback(async () => {
    if (queuedOperations.length === 0 || isProcessingQueue) return;

    setIsProcessingQueue(true);
    const operations = [...queuedOperations];
    const results = [];

    for (const queuedOp of operations) {
      try {
        const result = await queuedOp.operation();
        results.push({ success: true, operationName: queuedOp.operationName, result });
        removeFromQueue(queuedOp.id);
      } catch (error) {
        console.error(`Failed to process queued operation: ${queuedOp.operationName}`, error);
        
        // Increment retry count
        setQueuedOperations(prev => 
          prev.map(op => 
            op.id === queuedOp.id 
              ? { ...op, retryCount: op.retryCount + 1 }
              : op
          )
        );

        // Remove from queue if max retries reached
        if (queuedOp.retryCount >= 2) {
          removeFromQueue(queuedOp.id);
          results.push({ success: false, operationName: queuedOp.operationName, error });
        }
      }
    }

    setIsProcessingQueue(false);

    // Show sync results
    if (showNotifications && results.length > 0) {
      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;

      if (successCount > 0) {
        notificationService.syncSuccess(successCount);
      }
      
      if (failedCount > 0) {
        notificationService.syncError(failedCount, () => processQueue());
      }
    }

    return results;
  }, [queuedOperations, isProcessingQueue, removeFromQueue, showNotifications]);

  // Ping server to check connectivity
  const pingServer = useCallback(async () => {
    try {
      const response = await fetch(pingUrl, {
        method: 'HEAD',
        cache: 'no-cache',
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }, [pingUrl]);

  // Handle online/offline state changes
  const handleOnline = useCallback(async () => {
    // Double-check with server ping
    const serverReachable = await pingServer();
    
    if (serverReachable) {
      setIsOnline(true);
      hasShownOfflineNotification.current = false;
      
      if (showNotifications) {
        notificationService.onlineMode();
      }
      
      // Process queued operations
      if (queuedOperations.length > 0) {
        await processQueue();
      }
      
      if (onOnline) {
        onOnline();
      }
    }
  }, [pingServer, showNotifications, queuedOperations.length, processQueue, onOnline]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    
    if (showNotifications && !hasShownOfflineNotification.current) {
      notificationService.offlineMode();
      hasShownOfflineNotification.current = true;
    }
    
    if (onOffline) {
      onOffline();
    }
  }, [showNotifications, onOffline]);

  // Set up event listeners and periodic ping
  useEffect(() => {
    const handleOnlineEvent = () => handleOnline();
    const handleOfflineEvent = () => handleOffline();

    window.addEventListener('online', handleOnlineEvent);
    window.addEventListener('offline', handleOfflineEvent);

    // Set up periodic ping when online
    if (isOnline) {
      pingIntervalRef.current = setInterval(async () => {
        const serverReachable = await pingServer();
        if (!serverReachable && isOnline) {
          handleOffline();
        }
      }, pingInterval);
    } else {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
    }

    return () => {
      window.removeEventListener('online', handleOnlineEvent);
      window.removeEventListener('offline', handleOfflineEvent);
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, [isOnline, handleOnline, handleOffline, pingServer, pingInterval]);

  // Execute operation with offline handling
  const executeWithOfflineHandling = useCallback(async (operation, operationName, priority = 0) => {
    if (isOnline) {
      try {
        return await operation();
      } catch (error) {
        // If operation fails and we might be offline, queue it
        if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
          const operationId = queueOperation(operation, operationName, priority);
          handleOffline();
          throw new Error(`Operation queued due to network error. Will retry when online.`);
        }
        throw error;
      }
    } else {
      // Queue operation for later execution
      const operationId = queueOperation(operation, operationName, priority);
      throw new Error(`Operation queued. Will execute when online.`);
    }
  }, [isOnline, queueOperation, handleOffline]);

  return {
    isOnline,
    queuedOperations,
    isProcessingQueue,
    queueOperation,
    removeFromQueue,
    processQueue,
    executeWithOfflineHandling,
    clearQueue: () => setQueuedOperations([]),
    queueSize: queuedOperations.length
  };
};

export default useOfflineState;