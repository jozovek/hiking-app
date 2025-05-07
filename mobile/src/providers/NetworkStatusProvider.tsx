// src/providers/NetworkStatusProvider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Network from 'expo-network';
import { AppState, AppStateStatus } from 'react-native';

interface NetworkContextType {
  isConnected: boolean;
  isInternetReachable: boolean;
}

const NetworkContext = createContext<NetworkContextType>({
  isConnected: true,
  isInternetReachable: true,
});

export const useNetworkStatus = () => useContext(NetworkContext);

export const NetworkStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [networkStatus, setNetworkStatus] = useState<NetworkContextType>({
    isConnected: true,
    isInternetReachable: true,
  });

  const checkNetworkStatus = async () => {
    try {
      const networkState = await Network.getNetworkStateAsync();
      setNetworkStatus({
        isConnected: networkState.isConnected,
        isInternetReachable: networkState.isInternetReachable,
      });
    } catch (error) {
      console.error('Failed to get network state:', error);
      setNetworkStatus({
        isConnected: false,
        isInternetReachable: false,
      });
    }
  };

  // Check network status when app comes to foreground
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      checkNetworkStatus();
    }
  };

  useEffect(() => {
    // Initial check
    checkNetworkStatus();

    // Set up app state listener
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Set up network status listener
    const networkSubscription = Network.addNetworkStatusChangeListener(({ isConnected, isInternetReachable }) => {
      setNetworkStatus({ isConnected, isInternetReachable });
    });

    // Check periodically
    const interval = setInterval(checkNetworkStatus, 30000); // Every 30 seconds

    return () => {
      subscription.remove();
      if (networkSubscription?.remove) {
        networkSubscription.remove();
      }
      clearInterval(interval);
    };
  }, []);

  return (
    <NetworkContext.Provider value={networkStatus}>
      {children}
    </NetworkContext.Provider>
  );
};