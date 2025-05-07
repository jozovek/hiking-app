import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region, UrlTile, MapViewProps } from 'react-native-maps';
import MapCacheService from '../services/MapCacheService';
import { useNetworkStatus } from '../providers/NetworkStatusProvider';

// Define the methods we want to expose from our CachedMapView
export interface CachedMapViewRef {
  animateToRegion: (region: Region, duration?: number) => void;
  getCamera: () => Promise<any>;
  setCamera: (camera: any) => void;
}

export interface CachedMapViewProps extends Omit<MapViewProps, 'ref'> {
  initialRegion: Region;
  onRegionChangeComplete?: (region: Region) => void;
  style?: any;
  showsUserLocation?: boolean;
  children?: React.ReactNode;
}

const CachedMapView = forwardRef<CachedMapViewRef, CachedMapViewProps>(({
  initialRegion,
  onRegionChangeComplete,
  style,
  showsUserLocation = true,
  children,
  ...rest
}, ref) => {
  const mapRef = React.useRef<MapView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cacheStats, setCacheStats] = useState({ size: 0, count: 0 });
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const isOnline = isConnected && isInternetReachable;

  // Forward the ref to the parent component with only the methods we need
  useImperativeHandle(ref, () => ({
    animateToRegion: (region: Region, duration: number = 500) => {
      mapRef.current?.animateToRegion(region, duration);
    },
    getCamera: () => mapRef.current?.getCamera() || Promise.resolve({}),
    setCamera: (camera: any) => {
      if (mapRef.current) {
        mapRef.current.setCamera(camera);
      }
    },
  }));

  // Initialize cache and check network status
  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize map cache
        await MapCacheService.init();
        
        // Get cache stats
        const stats = await MapCacheService.getCacheStats();
        setCacheStats({ size: stats.size, count: stats.count });
        
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize map:', error);
        setIsLoading(false);
      }
    };
    
    initialize();
  }, []);

  // Cache the current region when it changes
  const handleRegionChangeComplete = (region: Region) => {
    if (isOnline) {
      // Cache the current region in the background
      MapCacheService.cacheRegion(region).catch(error => {
        console.error('Failed to cache region:', error);
      });
    }
    
    // Call the parent's onRegionChangeComplete if provided
    if (onRegionChangeComplete) {
      onRegionChangeComplete(region);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="large" color="#3f51b5" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation={showsUserLocation}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
        {...rest}
      >
        {/* Use UrlTile for custom tile handling */}
        <UrlTile
          urlTemplate="https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
          // This is where the caching would integrate in a full implementation
          // In a complete solution, we'd intercept these requests and serve from cache
        />
        {children}
      </MapView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});

export default CachedMapView;
