import { toast } from 'react-toastify';

// Toast configuration
export const toastConfig = {
  position: "top-right",
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
};

// Custom toast functions
export const showSuccess = (message) => {
  toast.success(message, toastConfig);
};

export const showError = (message) => {
  toast.error(message, toastConfig);
};

export const showInfo = (message) => {
  toast.info(message, toastConfig);
};

export const showWarning = (message) => {
  toast.warning(message, toastConfig);
};

export default toast;
