import { useSelector } from 'react-redux';

// Custom hook to access auth state
export function useAuth() {
  return useSelector((state) => state.auth);
}
