import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Switch,
  Platform,
} from 'react-native';
import { 
  Marker, 
  Polyline,
  Region,
  MapType,
} from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import DatabaseService from '../database/DatabaseService';
import { Trail } from '../models/types';
import { useLocation } from '../hooks/useLocation';
import { calculateDistance } from '../utils/locationUtils';
import CachedMapView, { CachedMapViewRef } from '../components/CachedMapView';
import { useNetworkStatus } from '../providers/NetworkStatusProvider';

// Get screen dimensions
const { width, height } = Dimensions.get('window');

// Define filter state interface
interface FilterState {
  difficulties: string[];
  length: [number, number];
  elevation: [number, number];
  surfaceTypes: string[];
}

// Map control button component
const MapControlButton = ({ 
  icon, 
  onPress, 
  style = {} 
}: { 
  icon: string; 
  onPress: () => void; 
  style?: object;
}) => (
  <TouchableOpacity
    style={[styles.mapControlButton, style]}
    onPress={onPress}
  >
    <Ionicons name={icon as any} size={24} color="#3f51b5" />
  </TouchableOpacity>
);

// Filter chip component
const FilterChip = ({ 
  label, 
  selected, 
  onPress 
}: { 
  label: string; 
  selected: boolean; 
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[
      styles.filterChip,
      selected && styles.filterChipSelected,
    ]}
    onPress={onPress}
  >
    <Text
      style={[
        styles.filterChipText,
        selected && styles.filterChipTextSelected,
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

// Range slider component (simplified version)
const RangeSlider = ({ 
  label, 
  value, 
  min, 
  max, 
  onChange,
  unit,
}: { 
  label: string; 
  value: [number, number]; 
  min: number; 
  max: number; 
  onChange: (value: [number, number]) => void;
  unit: string;
}) => {
  // This is a simplified version without actual slider UI
  // In a real app, you would use a proper slider component
  return (
    <View style={styles.rangeSliderContainer}>
      <Text style={styles.rangeSliderLabel}>{label}</Text>
      <View style={styles.rangeSliderValues}>
        <Text>{value[0]} {unit}</Text>
        <Text>to</Text>
        <Text>{value[1]} {unit}</Text>
      </View>
      <Text style={styles.rangeSliderNote}>
        (Slider UI would be implemented with a proper slider component)
      </Text>
    </View>
  );
};

// Trail preview card component
const TrailPreviewCard = ({ 
  trail, 
  onPress 
}: { 
  trail: Trail; 
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.previewCard} onPress={onPress}>
    <View style={styles.previewContent}>
      <Text style={styles.previewName}>{trail.name}</Text>
      <View style={styles.previewDetails}>
        <Text style={styles.previewLength}>{trail.length.toFixed(1)} miles</Text>
        <View
          style={[
            styles.previewDifficulty,
            {
              backgroundColor:
                trail.difficulty === 'Easy'
                  ? '#4CAF50'
                  : trail.difficulty === 'Moderate'
                  ? '#FF9800'
                  : '#F44336',
            },
          ]}
        >
          <Text style={styles.previewDifficultyText}>{trail.difficulty}</Text>
        </View>
      </View>
    </View>
    <View style={styles.previewButton}>
      <Text style={styles.previewButtonText}>View Details</Text>
      <Ionicons name="chevron-forward" size={16} color="#3f51b5" />
    </View>
  </TouchableOpacity>
);

// Main ExploreScreen component
const ExploreScreen = () => {
  // Navigation
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  
  // Map reference
  const mapRef = useRef<CachedMapViewRef>(null);
  
  // Network status
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const isOnline = isConnected && isInternetReachable;
  
  // State variables
  const [trails, setTrails] = useState<Trail[]>([]);
  const [filteredTrails, setFilteredTrails] = useState<Trail[]>([]);
  const [selectedTrail, setSelectedTrail] = useState<Trail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [mapType, setMapType] = useState<MapType>('standard');
  const [filters, setFilters] = useState<FilterState>({
    difficulties: [],
    length: [0, 30],
    elevation: [0, 5000],
    surfaceTypes: [],
  });
  
  // Use location hook
  const { 
    location, 
    error: locationError, 
    loading: locationLoading,
    refreshLocation,
  } = useLocation();
  
  // Get all trails from the database
  const getAllTrails = async () => {
    setLoading(true);
    try {
      const trails = await DatabaseService.getTrails();
      setTrails(trails);
      setFilteredTrails(trails);
      setError(null);
    } catch (error) {
      setError('Failed to load trails');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  // Apply filters to trails
  const applyFilters = () => {
    const filtered = trails.filter(trail => {
      // Filter by difficulty
      if (filters.difficulties.length > 0 && 
          !filters.difficulties.includes(trail.difficulty)) {
        return false;
      }
      
      // Filter by length
      if (trail.length < filters.length[0] || 
          trail.length > filters.length[1]) {
        return false;
      }
      
      // Filter by elevation
      if (trail.elevation_gain < filters.elevation[0] || 
          trail.elevation_gain > filters.elevation[1]) {
        return false;
      }
      
      // Filter by surface type
      if (filters.surfaceTypes.length > 0 && 
          !filters.surfaceTypes.includes(trail.surface_type)) {
        return false;
      }
      
      return true;
    });
    
    setFilteredTrails(filtered);
    setFilterModalVisible(false);
  };
  
  // Reset filters
  const resetFilters = () => {
    setFilters({
      difficulties: [],
      length: [0, 30],
      elevation: [0, 5000],
      surfaceTypes: [],
    });
  };
  
  // Handle trail marker press
  const handleTrailMarkerPress = (trail: Trail) => {
    setSelectedTrail(trail);
    // Animate map to center on the trail
    mapRef.current?.animateToRegion({
      latitude: trail.latitude,
      longitude: trail.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });
  };
  
  // Navigate to trail details
  const navigateToTrailDetails = (trailId: number) => {
    navigation.navigate('TrailDetails', { trailId });
  };
  
  // Center map on user location
  const centerOnUserLocation = async () => {
    if (location) {
      mapRef.current?.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    } else {
      await refreshLocation();
    }
  };
  
  // Toggle map type
  const toggleMapType = () => {
    setMapType(prev => 
      prev === 'standard' ? 'satellite' : 'standard'
    );
  };
  
  // Toggle difficulty filter
  const toggleDifficultyFilter = (difficulty: string) => {
    setFilters(prev => {
      const difficulties = [...prev.difficulties];
      const index = difficulties.indexOf(difficulty);
      
      if (index === -1) {
        difficulties.push(difficulty);
      } else {
        difficulties.splice(index, 1);
      }
      
      return {
        ...prev,
        difficulties,
      };
    });
  };
  
  // Toggle surface type filter
  const toggleSurfaceTypeFilter = (surfaceType: string) => {
    setFilters(prev => {
      const surfaceTypes = [...prev.surfaceTypes];
      const index = surfaceTypes.indexOf(surfaceType);
      
      if (index === -1) {
        surfaceTypes.push(surfaceType);
      } else {
        surfaceTypes.splice(index, 1);
      }
      
      return {
        ...prev,
        surfaceTypes,
      };
    });
  };
  
  // Update length range
  const updateLengthRange = (range: [number, number]) => {
    setFilters(prev => ({
      ...prev,
      length: range,
    }));
  };
  
  // Update elevation range
  const updateElevationRange = (range: [number, number]) => {
    setFilters(prev => ({
      ...prev,
      elevation: range,
    }));
  };
  
  // Handle region change complete
  const handleRegionChangeComplete = (region: Region) => {
    // This is where we could implement additional functionality
    // like loading trails for the visible region
  };
  
  // Load trails when component mounts
  useEffect(() => {
    getAllTrails();
  }, []);
  
  // Parse trail path from GeoJSON
  const parseTrailPath = (geoJsonString: string) => {
    try {
      const geoJson = JSON.parse(geoJsonString);
      // Convert GeoJSON to coordinates for React Native Maps
      return geoJson.coordinates.map((coord: number[]) => ({
        latitude: coord[1],
        longitude: coord[0]
      }));
    } catch (error) {
      console.error('Failed to parse trail path', error);
      return [];
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3f51b5" />
        <Text style={styles.loadingText}>Loading trails...</Text>
      </View>
    );
  }
  
  // Error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#F44336" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.errorButton}
          onPress={getAllTrails}
        >
          <Text style={styles.errorButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {/* Map - Using CachedMapView instead of MapView */}
      <CachedMapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: 39.9526,  // Philadelphia coordinates
          longitude: -75.1652,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation={true}
      >
        {/* Trail Markers */}
        {filteredTrails.map(trail => (
          <Marker
            key={trail.id}
            coordinate={{
              latitude: trail.latitude,
              longitude: trail.longitude,
            }}
            title={trail.name}
            description={`${trail.length.toFixed(1)} miles • ${trail.difficulty}`}
            onPress={() => handleTrailMarkerPress(trail)}
          >
            <View style={styles.markerContainer}>
              <Ionicons name="trail-sign" size={24} color="#3f51b5" />
            </View>
          </Marker>
        ))}
        
        {/* Trail Paths */}
        {filteredTrails.map(trail => {
          if (trail.geometry) {
            const coordinates = parseTrailPath(trail.geometry);
            if (coordinates.length > 0) {
              return (
                <Polyline
                  key={`path-${trail.id}`}
                  coordinates={coordinates}
                  strokeColor={
                    trail.difficulty === 'Easy'
                      ? '#4CAF50'
                      : trail.difficulty === 'Moderate'
                      ? '#FF9800'
                      : '#F44336'
                  }
                  strokeWidth={3}
                />
              );
            }
          }
          return null;
        })}
        
        {/* User Location Marker */}
        {location && (
          <Marker
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            title="Your Location"
          >
            <View style={styles.userLocationMarker}>
              <View style={styles.userLocationDot} />
            </View>
          </Marker>
        )}
      </CachedMapView>
      
      {/* Offline Mode Banner */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            Offline Mode - Using Cached Maps
          </Text>
        </View>
      )}
      
      {/* Map Controls */}
      <View style={styles.mapControls}>
        <MapControlButton
          icon="options-outline"
          onPress={() => setFilterModalVisible(true)}
        />
        <MapControlButton
          icon="locate-outline"
          onPress={centerOnUserLocation}
        />
        <MapControlButton
          icon={mapType === 'standard' ? 'map-outline' : 'earth-outline'}
          onPress={toggleMapType}
        />
      </View>
      
      {/* Trail Preview Card */}
      {selectedTrail && (
        <View style={styles.previewCardContainer}>
          <TrailPreviewCard
            trail={selectedTrail}
            onPress={() => navigateToTrailDetails(selectedTrail.id)}
          />
        </View>
      )}
      
      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Trails</Text>
              <TouchableOpacity
                onPress={() => setFilterModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {/* Difficulty Filters */}
              <Text style={styles.filterSectionTitle}>Difficulty</Text>
              <View style={styles.filterChipsContainer}>
                <FilterChip
                  label="Easy"
                  selected={filters.difficulties.includes('Easy')}
                  onPress={() => toggleDifficultyFilter('Easy')}
                />
                <FilterChip
                  label="Moderate"
                  selected={filters.difficulties.includes('Moderate')}
                  onPress={() => toggleDifficultyFilter('Moderate')}
                />
                <FilterChip
                  label="Difficult"
                  selected={filters.difficulties.includes('Difficult')}
                  onPress={() => toggleDifficultyFilter('Difficult')}
                />
              </View>
              
              {/* Length Range */}
              <Text style={styles.filterSectionTitle}>Length</Text>
              <RangeSlider
                label="Trail Length"
                value={filters.length}
                min={0}
                max={30}
                onChange={updateLengthRange}
                unit="miles"
              />
              
              {/* Elevation Range */}
              <Text style={styles.filterSectionTitle}>Elevation Gain</Text>
              <RangeSlider
                label="Elevation Gain"
                value={filters.elevation}
                min={0}
                max={5000}
                onChange={updateElevationRange}
                unit="ft"
              />
              
              {/* Surface Type Filters */}
              <Text style={styles.filterSectionTitle}>Surface Type</Text>
              <View style={styles.filterChipsContainer}>
                <FilterChip
                  label="Paved"
                  selected={filters.surfaceTypes.includes('Paved')}
                  onPress={() => toggleSurfaceTypeFilter('Paved')}
                />
                <FilterChip
                  label="Dirt"
                  selected={filters.surfaceTypes.includes('Dirt')}
                  onPress={() => toggleSurfaceTypeFilter('Dirt')}
                />
                <FilterChip
                  label="Gravel"
                  selected={filters.surfaceTypes.includes('Gravel')}
                  onPress={() => toggleSurfaceTypeFilter('Gravel')}
                />
                <FilterChip
                  label="Rocky"
                  selected={filters.surfaceTypes.includes('Rocky')}
                  onPress={() => toggleSurfaceTypeFilter('Rocky')}
                />
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetFilters}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={applyFilters}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#3f51b5',
    borderRadius: 4,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  mapControls: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'transparent',
  },
  mapControlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  markerContainer: {
    alignItems: 'center',
  },
  userLocationMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(63, 81, 181, 0.2)',
    borderWidth: 1,
    borderColor: '#3f51b5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3f51b5',
  },
  previewCardContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  previewCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    padding: 16,
  },
  previewContent: {
    flex: 1,
  },
  previewName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  previewDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewLength: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  previewDifficulty: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  previewDifficultyText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewButtonText: {
    color: '#3f51b5',
    fontWeight: '500',
    marginRight: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 16,
    maxHeight: height * 0.6,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  filterChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
  },
  filterChipSelected: {
    backgroundColor: '#3f51b5',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  filterChipTextSelected: {
    color: '#fff',
  },
  rangeSliderContainer: {
    marginBottom: 16,
  },
  rangeSliderLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  rangeSliderValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rangeSliderNote: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  resetButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#3f51b5',
  },
  resetButtonText: {
    color: '#3f51b5',
    fontWeight: '500',
  },
  applyButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 4,
    backgroundColor: '#3f51b5',
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  offlineBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(244, 67, 54, 0.8)',
    padding: 5,
    alignItems: 'center',
    zIndex: 1000,
  },
  offlineText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default ExploreScreen;
