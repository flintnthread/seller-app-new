import { useState, useEffect } from 'react';
import { Platform } from 'react-native';

// Centralized session-level state for mock purposes
let globalProfileCompleted = false;

// Attempt to load initial state from localStorage on web
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  try {
    const saved = window.localStorage.getItem('isProfileCompleted');
    if (saved !== null) {
      globalProfileCompleted = saved === 'true';
    }
  } catch (e) {
    console.warn('Failed to read from localStorage:', e);
  }
}

const listeners = new Set<() => void>();

/**
 * Reusable React Hook that provides the centralized profile completion state.
 * Syncs instantly across all active components/views using a listener pattern.
 */
export function useProfileStatus() {
  const [isProfileCompleted, setIsProfileCompletedState] = useState(globalProfileCompleted);

  const setIsProfileCompleted = (val: boolean) => {
    globalProfileCompleted = val;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('isProfileCompleted', String(val));
      } catch (e) {
        console.warn('Failed to write to localStorage:', e);
      }
    }
    setIsProfileCompletedState(val);
    // Notify all active listeners to synchronize state immediately
    listeners.forEach((listener) => listener());
  };

  useEffect(() => {
    const handleUpdate = () => {
      setIsProfileCompletedState(globalProfileCompleted);
    };
    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  return {
    isProfileCompleted,
    setIsProfileCompleted,
  };
}
