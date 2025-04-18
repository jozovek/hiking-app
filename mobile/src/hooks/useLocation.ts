import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { requestLocationPermission, getCurrentLocation } from '../utils/locationUtils';

interface LocationState {
  location: { latitude: number; longitude: number } | null;
  error: string | null;
  loading: boolean;
  permissionGranted: boolean;
}

/**
 * Custom hook for handling location services
 * @param shouldTrack Whether to continuously track location
 * @returns Location state and refresh function
 */
export const useLocation = (shouldTrack: boolean = false) => {
  const [state, setState] = useState<LocationState>({
    location: null,
    error: null,
    loading: true,
    permissionGranted: false,
  });

  const [subscription, setSubscription] = useState<Location.LocationSubscription | null>(null);

  // Function to refresh location manually
  const refreshLocation = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const hasPermission = await requestLocationPermission();
      
      if (!hasPermission) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Location permission not granted',
          permissionGranted: false,
        }));
        return;
      }
      
      const location = await getCurrentLocation();
      
      setState(prev => ({
        ...prev,
        location,
        loading: false,
        error: location ? null : 'Could not get location',
        permissionGranted: true,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      }));
    }
  };

  // Start location tracking
  const startLocationTracking = async () => {
    const hasPermission = await requestLocationPermission();
    
    if (!hasPermission) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Location permission not granted',
        permissionGranted: false,
      }));
      return;
    }
    
    setState(prev => ({ ...prev, permissionGranted: true }));
    
    // Get initial location
    const location = await getCurrentLocation();
    setState(prev => ({
      ...prev,
      location,
      loading: false,
      error: location ? null : 'Could not get location',
    }));
    
    // Set up location subscription
    const locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 10, // Update every 10 meters
        timeInterval: 5000, // Or every 5 seconds
      },
      (newLocation) => {
        setState(prev => ({
          ...prev,
          location: {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
          },
          loading: false,
          error: null,
        }));
      }
    );
    
    setSubscription(locationSubscription);
  };

  // Stop location tracking
  const stopLocationTracking = () => {
    if (subscription) {
      subscription.remove();
      setSubscription(null);
    }
  };

  // Initialize location tracking or get location once
  useEffect(() => {
    if (shouldTrack) {
      startLocationTracking();
    } else {
      refreshLocation();
    }
    
    // Cleanup function
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [shouldTrack]);

  return {
    ...state,
    refreshLocation,
    startLocationTracking,
    stopLocationTracking,
  };
};
