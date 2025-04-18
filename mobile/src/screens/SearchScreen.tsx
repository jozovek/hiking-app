import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  ScrollView,
  Switch,
  Dimensions,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import DatabaseService from '../database/DatabaseService';
import { Trail } from '../models/types';
import TrailCard from '../components/TrailCard';
import { useLocation } from '../hooks/useLocation';
import { calculateDistance, formatDistance } from '../utils/locationUtils';

// Get screen dimensions
const { width, height } = Dimensions.get('window');

// Define filter state interface
interface FilterState {
  difficulties: string[];
  length: [number, number];
  elevation: [number, number];
  surfaceTypes: string[];
  routeTypes: string[];
  isAccessible: boolean | null;
  searchRadius: number;
}

// Define sort options
type SortOption = {
  label: string;
  value: string;
  icon: string;
};

// Sort options for results
const SORT_OPTIONS: SortOption[] = [
  { label: 'Name (A-Z)', value: 'name_asc', icon: 'text-outline' },
  { label: 'Name (Z-A)', value: 'name_desc', icon: 'text-outline' },
  { label: 'Length (Shortest)', value: 'length_asc', icon: 'resize-outline' },
  { label: 'Length (Longest)', value: 'length_desc', icon: 'resize-outline' },
  { label: 'Difficulty (Easiest)', value: 'difficulty_asc', icon: 'trending-up-outline' },
  { label: 'Difficulty (Hardest)', value: 'difficulty_desc', icon: 'trending-up-outline' },
  { label: 'Elevation (Lowest)', value: 'elevation_asc', icon: 'trending-up-outline' },
  { label: 'Elevation (Highest)', value: 'elevation_desc', icon: 'trending-up-outline' },
  { label: 'Distance (Nearest)', value: 'distance_asc', icon: 'navigate-outline' },
];

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

// Sort option component
const SortOptionItem = ({ 
  option, 
  selected, 
  onPress 
}: { 
  option: SortOption; 
  selected: boolean; 
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[
      styles.sortOptionItem,
      selected && styles.sortOptionItemSelected,
    ]}
    onPress={onPress}
  >
    <Ionicons 
      name={option.icon as any} 
      size={20} 
      color={selected ? '#fff' : '#666'} 
      style={styles.sortOptionIcon} 
    />
    <Text
      style={[
        styles.sortOptionText,
        selected && styles.sortOptionTextSelected,
      ]}
    >
      {option.label}
    </Text>
  </TouchableOpacity>
);

// Radius selector component
const RadiusSelector = ({ 
  value, 
  onChange 
}: { 
  value: number; 
  onChange: (value: number) => void;
}) => {
  const radiusOptions = [1, 5, 10, 25, 50];
  
  return (
    <View style={styles.radiusSelectorContainer}>
      <Text style={styles.radiusSelectorLabel}>Search Radius</Text>
      <View style={styles.radiusOptionsContainer}>
        {radiusOptions.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.radiusOption,
              value === option && styles.radiusOptionSelected,
            ]}
            onPress={() => onChange(option)}
          >
            <Text
              style={[
                styles.radiusOptionText,
                value === option && styles.radiusOptionTextSelected,
              ]}
            >
              {option} mi
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const SearchScreen = () => {
  // Navigation
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  
  // State variables
  const [searchQuery, setSearchQuery] = useState('');
  const [trails, setTrails] = useState<Trail[]>([]);
  const [filteredTrails, setFilteredTrails] = useState<Trail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [currentSortOption, setCurrentSortOption] = useState(SORT_OPTIONS[0]);
  const [useLocationSearch, setUseLocationSearch] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    difficulties: [],
    length: [0, 30],
    elevation: [0, 5000],
    surfaceTypes: [],
    routeTypes: [],
    isAccessible: null,
    searchRadius: 10,
  });
  
  // Use location hook
  const { 
    location, 
    error: locationError, 
    loading: locationLoading,
    refreshLocation,
  } = useLocation();
  
  // Handle search query submission
  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let searchResults: Trail[] = [];
      
      if (useLocationSearch && location) {
        // Search by location
        searchResults = await DatabaseService.getTrailsNearLocation(
          location.latitude,
          location.longitude,
          filters.searchRadius
        );
      } else {
        // Search by text query
        const allTrails = await DatabaseService.getTrails();
        
        if (searchQuery.trim() === '') {
          searchResults = allTrails;
        } else {
          const query = searchQuery.toLowerCase();
          searchResults = allTrails.filter(trail => 
            trail.name.toLowerCase().includes(query) ||
            trail.description.toLowerCase().includes(query)
          );
        }
      }
      
      setTrails(searchResults);
      applyFilters(searchResults);
    } catch (error) {
      setError('Failed to search trails');
      console.error(error);
      setFilteredTrails([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Apply filters to trails
  const applyFilters = (trailsToFilter: Trail[] = trails) => {
    const filtered = trailsToFilter.filter(trail => {
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
      
      // Filter by route type
      if (filters.routeTypes.length > 0 && 
          !filters.routeTypes.includes(trail.route_type)) {
        return false;
      }
      
      // Filter by accessibility
      if (filters.isAccessible !== null && 
          trail.is_accessible !== filters.isAccessible) {
        return false;
      }
      
      return true;
    });
    
    setFilteredTrails(sortTrails(filtered));
    setFilterModalVisible(false);
  };
  
  // Sort trails based on current sort option
  const sortTrails = (trailsToSort: Trail[] = filteredTrails): Trail[] => {
    const sortedTrails = [...trailsToSort];
    
    switch (currentSortOption.value) {
      case 'name_asc':
        sortedTrails.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name_desc':
        sortedTrails.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'length_asc':
        sortedTrails.sort((a, b) => a.length - b.length);
        break;
      case 'length_desc':
        sortedTrails.sort((a, b) => b.length - a.length);
        break;
      case 'difficulty_asc':
        sortedTrails.sort((a, b) => {
          const difficultyOrder = { 'Easy': 0, 'Moderate': 1, 'Difficult': 2 };
          return difficultyOrder[a.difficulty as keyof typeof difficultyOrder] - 
                 difficultyOrder[b.difficulty as keyof typeof difficultyOrder];
        });
        break;
      case 'difficulty_desc':
        sortedTrails.sort((a, b) => {
          const difficultyOrder = { 'Easy': 0, 'Moderate': 1, 'Difficult': 2 };
          return difficultyOrder[b.difficulty as keyof typeof difficultyOrder] - 
                 difficultyOrder[a.difficulty as keyof typeof difficultyOrder];
        });
        break;
      case 'elevation_asc':
        sortedTrails.sort((a, b) => a.elevation_gain - b.elevation_gain);
        break;
      case 'elevation_desc':
        sortedTrails.sort((a, b) => b.elevation_gain - a.elevation_gain);
        break;
      case 'distance_asc':
        if (location) {
          sortedTrails.sort((a, b) => {
            const distanceA = calculateDistance(
              location.latitude, location.longitude, a.latitude, a.longitude
            );
            const distanceB = calculateDistance(
              location.latitude, location.longitude, b.latitude, b.longitude
            );
            return distanceA - distanceB;
          });
        }
        break;
      default:
        break;
    }
    
    return sortedTrails;
  };
  
  // Reset filters
  const resetFilters = () => {
    setFilters({
      difficulties: [],
      length: [0, 30],
      elevation: [0, 5000],
      surfaceTypes: [],
      routeTypes: [],
      isAccessible: null,
      searchRadius: 10,
    });
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
  
  // Toggle route type filter
  const toggleRouteTypeFilter = (routeType: string) => {
    setFilters(prev => {
      const routeTypes = [...prev.routeTypes];
      const index = routeTypes.indexOf(routeType);
      
      if (index === -1) {
        routeTypes.push(routeType);
      } else {
        routeTypes.splice(index, 1);
      }
      
      return {
        ...prev,
        routeTypes,
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
  
  // Update search radius
  const updateSearchRadius = (radius: number) => {
    setFilters(prev => ({
      ...prev,
      searchRadius: radius,
    }));
  };
  
  // Toggle accessibility filter
  const toggleAccessibilityFilter = (value: boolean | null) => {
    setFilters(prev => ({
      ...prev,
      isAccessible: value,
    }));
  };
  
  // Toggle location search
  const toggleLocationSearch = async () => {
    const newValue = !useLocationSearch;
    setUseLocationSearch(newValue);
    
    if (newValue && !location) {
      await refreshLocation();
    }
  };
  
  // Handle sort option selection
  const handleSortOptionSelect = (option: SortOption) => {
    setCurrentSortOption(option);
    setSortModalVisible(false);
    setFilteredTrails(sortTrails());
  };
  
  // Navigate to trail details
  const navigateToTrailDetails = (trailId: number) => {
    navigation.navigate('TrailDetails', { trailId });
  };
  
  // Apply sort when sort option changes
  useEffect(() => {
    if (filteredTrails.length > 0) {
      setFilteredTrails(sortTrails());
    }
  }, [currentSortOption]);
  
  // Render trail item with distance if location is available
  const renderTrailItem = ({ item }: { item: Trail }) => {
    let distanceText = '';
    
    if (location) {
      const distance = calculateDistance(
        location.latitude, location.longitude, item.latitude, item.longitude
      );
      distanceText = formatDistance(distance);
    }
    
    return (
      <View style={styles.trailItemContainer}>
        <TrailCard
          id={item.id}
          name={item.name}
          length={item.length}
          difficulty={item.difficulty}
          imageUrl={item.image_url || undefined}
          onPress={navigateToTrailDetails}
        />
        {distanceText && (
          <View style={styles.distanceBadge}>
            <Ionicons name="location" size={12} color="#fff" />
            <Text style={styles.distanceText}>{distanceText}</Text>
          </View>
        )}
      </View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingContainer}
      >
        {/* Search Header */}
        <View style={styles.searchHeader}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search trails by name or description"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>
          
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setFilterModalVisible(true)}
          >
            <Ionicons name="options-outline" size={24} color="#3f51b5" />
          </TouchableOpacity>
        </View>
        
        {/* Location Search Toggle */}
        <View style={styles.locationToggleContainer}>
          <Text style={styles.locationToggleLabel}>
            Search near my location
          </Text>
          <Switch
            value={useLocationSearch}
            onValueChange={toggleLocationSearch}
            trackColor={{ false: '#d1d1d1', true: '#a4addf' }}
            thumbColor={useLocationSearch ? '#3f51b5' : '#f4f3f4'}
          />
        </View>
        
        {/* Search Button */}
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
        >
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
        
        {/* Results Header */}
        {filteredTrails.length > 0 && (
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsCount}>
              {filteredTrails.length} {filteredTrails.length === 1 ? 'trail' : 'trails'} found
            </Text>
            <TouchableOpacity
              style={styles.sortButton}
              onPress={() => setSortModalVisible(true)}
            >
              <Ionicons name="funnel-outline" size={18} color="#3f51b5" />
              <Text style={styles.sortButtonText}>Sort</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3f51b5" />
            <Text style={styles.loadingText}>Searching trails...</Text>
          </View>
        )}
        
        {/* Error State */}
        {error && !loading && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#F44336" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.errorButton}
              onPress={handleSearch}
            >
              <Text style={styles.errorButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Empty State */}
        {!loading && !error && filteredTrails.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="trail-sign-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Trails Found</Text>
            <Text style={styles.emptyText}>
              Try adjusting your search or filters to find trails.
            </Text>
          </View>
        )}
        
        {/* Results List */}
        {!loading && !error && filteredTrails.length > 0 && (
          <FlatList
            data={filteredTrails}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderTrailItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
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
                
                {/* Route Type Filters */}
                <Text style={styles.filterSectionTitle}>Route Type</Text>
                <View style={styles.filterChipsContainer}>
                  <FilterChip
                    label="Loop"
                    selected={filters.routeTypes.includes('Loop')}
                    onPress={() => toggleRouteTypeFilter('Loop')}
                  />
                  <FilterChip
                    label="Out & Back"
                    selected={filters.routeTypes.includes('Out & Back')}
                    onPress={() => toggleRouteTypeFilter('Out & Back')}
                  />
                  <FilterChip
                    label="Point to Point"
                    selected={filters.routeTypes.includes('Point to Point')}
                    onPress={() => toggleRouteTypeFilter('Point to Point')}
                  />
                </View>
                
                {/* Accessibility Filter */}
                <Text style={styles.filterSectionTitle}>Accessibility</Text>
                <View style={styles.filterChipsContainer}>
                  <FilterChip
                    label="Accessible"
                    selected={filters.isAccessible === true}
                    onPress={() => toggleAccessibilityFilter(
                      filters.isAccessible === true ? null : true
                    )}
                  />
                  <FilterChip
                    label="Not Accessible"
                    selected={filters.isAccessible === false}
                    onPress={() => toggleAccessibilityFilter(
                      filters.isAccessible === false ? null : false
                    )}
                  />
                </View>
                
                {/* Location Search Radius */}
                {useLocationSearch && (
                  <>
                    <Text style={styles.filterSectionTitle}>Search Radius</Text>
                    <RadiusSelector
                      value={filters.searchRadius}
                      onChange={updateSearchRadius}
                    />
                  </>
                )}
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
                  onPress={() => applyFilters()}
                >
                  <Text style={styles.applyButtonText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        
        {/* Sort Modal */}
        <Modal
          visible={sortModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSortModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Sort Trails</Text>
                <TouchableOpacity
                  onPress={() => setSortModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalBody}>
                {SORT_OPTIONS.map((option) => (
                  <SortOptionItem
                    key={option.value}
                    option={option}
                    selected={currentSortOption.value === option.value}
                    onPress={() => handleSortOptionSelect(option)}
                  />
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  filterButton: {
    marginLeft: 12,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  locationToggleLabel: {
    fontSize: 16,
    color: '#333',
  },
  searchButton: {
    backgroundColor: '#3f51b5',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortButtonText: {
    marginLeft: 4,
    color: '#3f51b5',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  trailItemContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  distanceBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(63, 81, 181, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 2,
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
  sortOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sortOptionItemSelected: {
    backgroundColor: '#3f51b5',
  },
  sortOptionIcon: {
    marginRight: 12,
  },
  sortOptionText: {
    fontSize: 16,
    color: '#333',
  },
  sortOptionTextSelected: {
    color: '#fff',
  },
  radiusSelectorContainer: {
    marginBottom: 16,
  },
  radiusSelectorLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  radiusOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  radiusOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
  },
  radiusOptionSelected: {
    backgroundColor: '#3f51b5',
  },
  radiusOptionText: {
    fontSize: 14,
    color: '#666',
  },
  radiusOptionTextSelected: {
    color: '#fff',
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
});

export default SearchScreen;
