import { useState, useCallback, useRef } from 'react';
import notificationService from '../services/notificationService.js';

const useRetryOperation = (options = {}) => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    backoffMultiplier = 2,
    onMaxRetriesReached,
    showNotifications = true
  } = options;

  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const retryTimeoutRef = useRef(null);

  const executeWithRetry = useCallback(async (operation, operationName = 'Operation') => {
    const attempt = async (attemptNumber = 0) => {
      try {
        setIsRetrying(attemptNumber > 0);
        const result = await operation();
        
        // Reset retry count on success
        setRetryCount(0);
        setIsRetrying(false);
        
        if (showNotifications && attemptNumber > 0) {
          notificationService.success(`${operationName} succeeded after ${attemptNumber} retry${attemptNumber > 1 ? 'ies' : 'y'}`);
        }
        
        return result;
      } catch (error) {
        const currentRetryCount = attemptNumber;
        setRetryCount(currentRetryCount);
        
        if (currentRetryCount < maxRetries) {
          const delay = retryDelay * Math.pow(backoffMultiplier, currentRetryCount);
          
          if (showNotifications) {
            notificationService.warning(
              `${operationName} failed. Retrying in ${delay / 1000} seconds... (${currentRetryCount + 1}/${maxRetries})`,
              { autoClose: delay }
            );
          }
          
          return new Promise((resolve, reject) => {
            retryTimeoutRef.current = setTimeout(async () => {
              try {
                const result = await attempt(currentRetryCount + 1);
                resolve(result);
              } catch (retryError) {
                reject(retryError);
              }
            }, delay);
          });
        } else {
          setIsRetrying(false);
          
          if (showNotifications) {
            notificationService.error(
              `${operationName} failed after ${maxRetries} attempts`,
              {
                onRetry: () => executeWithRetry(operation, operationName)
              }
            );
          }
          
          if (onMaxRetriesReached) {
            onMaxRetriesReached(error, currentRetryCount);
          }
          
          throw error;
        }
      }
    };

    return attempt();
  }, [maxRetries, retryDelay, backoffMultiplier, onMaxRetriesReached, showNotifications]);

  const cancelRetry = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
      setIsRetrying(false);
      setRetryCount(0);
    }
  }, []);

  const manualRetry = useCallback((operation, operationName) => {
    setRetryCount(0);
    return executeWithRetry(operation, operationName);
  }, [executeWithRetry]);

  return {
    executeWithRetry,
    cancelRetry,
    manualRetry,
    isRetrying,
    retryCount,
    hasReachedMaxRetries: retryCount >= maxRetries
  };
};

export default useRetryOperation;