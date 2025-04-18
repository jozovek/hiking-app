import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import DatabaseService from '../database/DatabaseService';
import { Trail, POI, Park } from '../models/types';
import { formatDistance } from '../utils/locationUtils';
import SavedTrailsService from '../services/SavedTrailsService';

// Define props for this screen
type TrailDetailsScreenProps = {
  route: RouteProp<RootStackParamList, 'TrailDetails'>;
  navigation: StackNavigationProp<RootStackParamList, 'TrailDetails'>;
};

// Component for displaying a trail statistic
const TrailStatistic = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <View style={styles.statisticContainer}>
    <Ionicons name={icon as any} size={24} color="#3f51b5" style={styles.statisticIcon} />
    <Text style={styles.statisticLabel}>{label}</Text>
    <Text style={styles.statisticValue}>{value}</Text>
  </View>
);

// Component for displaying difficulty badge
const DifficultyBadge = ({ difficulty }: { difficulty: string }) => {
  let color = '#4CAF50'; // Easy - green
  if (difficulty === 'Moderate') {
    color = '#FF9800'; // Moderate - orange
  } else if (difficulty === 'Difficult') {
    color = '#F44336'; // Difficult - red
  }

  return (
    <View style={[styles.difficultyBadge, { backgroundColor: color }]}>
      <Text style={styles.difficultyText}>{difficulty}</Text>
    </View>
  );
};

// Component for displaying a point of interest card
const POICard = ({ poi, onPress }: { poi: POI; onPress: () => void }) => (
  <TouchableOpacity style={styles.poiCard} onPress={onPress}>
    {poi.image_url ? (
      <Image source={{ uri: poi.image_url }} style={styles.poiImage} />
    ) : (
      <View style={[styles.poiImage, styles.poiImagePlaceholder]}>
        <Ionicons name="image-outline" size={24} color="#aaa" />
      </View>
    )}
    <Text style={styles.poiName} numberOfLines={1}>
      {poi.name}
    </Text>
    <Text style={styles.poiType}>{poi.type}</Text>
  </TouchableOpacity>
);

// Component for expandable text
const ExpandableText = ({ text, maxLength = 150 }: { text: string; maxLength?: number }) => {
  const [expanded, setExpanded] = useState(false);
  
  if (text.length <= maxLength) {
    return <Text style={styles.descriptionText}>{text}</Text>;
  }
  
  return (
    <View>
      <Text style={styles.descriptionText}>
        {expanded ? text : `${text.substring(0, maxLength)}...`}
      </Text>
      <TouchableOpacity onPress={() => setExpanded(!expanded)}>
        <Text style={styles.readMoreText}>{expanded ? 'Read Less' : 'Read More'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const TrailDetailsScreen: React.FC<TrailDetailsScreenProps> = ({ route, navigation }) => {
  // State variables
  const [trail, setTrail] = useState<Trail | null>(null);
  const [pois, setPOIs] = useState<POI[]>([]);
  const [park, setPark] = useState<Park | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [trailPath, setTrailPath] = useState<any[]>([]);

  // Get trail details by ID
  const getTrailDetails = async (trailId: number) => {
    setLoading(true);
    try {
      const trail = await DatabaseService.getTrailById(trailId);
      
      if (!trail) {
        setError('Trail not found');
        setLoading(false);
        return;
      }
      
      const pois = await DatabaseService.getPOIsForTrail(trailId);
      
      if (trail.park_id) {
        try {
          const park = await DatabaseService.getParkById(trail.park_id);
          setPark(park);
        } catch (error) {
          console.error('Failed to load park details', error);
        }
      }
      
      // Parse trail path from GeoJSON
      if (trail.geometry) {
        const parsedPath = parseTrailPath(trail.geometry);
        setTrailPath(parsedPath);
      }
      
      setTrail(trail);
      setPOIs(pois);
      setError(null);
    } catch (error) {
      setError('Failed to load trail details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Parse GeoJSON trail path
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

  // Toggle save/unsave trail
  const toggleSaveTrail = async () => {
    if (!trail) return;
    
    try {
      if (isSaved) {
        await SavedTrailsService.removeTrail(trail.id);
      } else {
        await SavedTrailsService.saveTrail(trail.id);
      }
      setIsSaved(!isSaved);
    } catch (error) {
      console.error('Failed to save/unsave trail', error);
    }
  };

  // Open maps app for directions
  const getDirectionsToTrailhead = () => {
    if (!trail) return;
    
    const { latitude, longitude } = trail;
    const url = Platform.select({
      ios: `maps:0,0?q=${latitude},${longitude}`,
      android: `geo:0,0?q=${latitude},${longitude}`
    });
    
    if (url) {
      Linking.openURL(url);
    }
  };

  // Toggle map expanded/collapsed view
  const toggleMapExpanded = () => {
    setMapExpanded(!mapExpanded);
  };

  // Select a POI
  const selectPOI = (poi: POI) => {
    setSelectedPOI(poi);
    // If we had a map ref, we could center the map on the POI
  };

  // Check if trail is saved in favorites
  useEffect(() => {
    const checkIfSaved = async () => {
      if (trail) {
        const saved = await SavedTrailsService.isTrailSaved(trail.id);
        setIsSaved(saved);
      }
    };
    
    checkIfSaved();
  }, [trail]);

  // Load trail data when component mounts
  useEffect(() => {
    if (route.params?.trailId) {
      getTrailDetails(route.params.trailId);
    }
  }, [route.params?.trailId]);

  // Set navigation options dynamically
  useEffect(() => {
    if (trail) {
      navigation.setOptions({
        title: trail.name,
      });
    }
  }, [trail, navigation]);

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3f51b5" />
        <Text style={styles.loadingText}>Loading trail details...</Text>
      </View>
    );
  }

  // Error state
  if (error || !trail) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#F44336" />
        <Text style={styles.errorText}>{error || 'Trail not found'}</Text>
        <TouchableOpacity
          style={styles.errorButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Calculate map height based on expanded state
  const mapHeight = mapExpanded
    ? Dimensions.get('window').height * 0.6
    : 200;

  return (
    <ScrollView style={styles.container}>
      {/* Hero Image */}
      <View style={styles.heroContainer}>
        {trail.image_url ? (
          <Image
            source={{ uri: trail.image_url }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.heroImage, styles.heroImagePlaceholder]}>
            <Ionicons name="image-outline" size={48} color="#aaa" />
            <Text style={styles.placeholderText}>No Image Available</Text>
          </View>
        )}
        
        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={toggleSaveTrail}
        >
          <Ionicons
            name={isSaved ? 'heart' : 'heart-outline'}
            size={28}
            color={isSaved ? '#F44336' : '#fff'}
          />
        </TouchableOpacity>
      </View>

      {/* Trail Info Section */}
      <View style={styles.infoSection}>
        <Text style={styles.trailName}>{trail.name}</Text>
        <View style={styles.difficultyRow}>
          <DifficultyBadge difficulty={trail.difficulty} />
          {park && (
            <Text style={styles.parkName}>
              <Ionicons name="location" size={16} color="#3f51b5" /> {park.name}
            </Text>
          )}
        </View>

        {/* Trail Statistics */}
        <View style={styles.statisticsContainer}>
          <TrailStatistic
            icon="resize-outline"
            label="Length"
            value={`${trail.length.toFixed(1)} miles`}
          />
          <TrailStatistic
            icon="trending-up-outline"
            label="Elevation"
            value={`${trail.elevation_gain} ft`}
          />
          <TrailStatistic
            icon="time-outline"
            label="Time"
            value={`${Math.round(trail.estimated_time / 60)} hrs`}
          />
          <TrailStatistic
            icon="git-network-outline"
            label="Type"
            value={trail.route_type}
          />
        </View>

        {/* Description */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.sectionTitle}>Description</Text>
          <ExpandableText text={trail.description} maxLength={200} />
        </View>

        {/* Map Section */}
        <View style={styles.mapContainer}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Trail Map</Text>
            <TouchableOpacity onPress={toggleMapExpanded}>
              <Ionicons
                name={mapExpanded ? 'contract-outline' : 'expand-outline'}
                size={24}
                color="#3f51b5"
              />
            </TouchableOpacity>
          </View>
          
          <View style={[styles.mapWrapper, { height: mapHeight }]}>
            <MapView
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={{
                latitude: trail.latitude,
                longitude: trail.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
            >
              {/* Trailhead Marker */}
              <Marker
                coordinate={{
                  latitude: trail.latitude,
                  longitude: trail.longitude,
                }}
                title="Trailhead"
                description={trail.name}
              >
                <Ionicons name="flag" size={24} color="#3f51b5" />
              </Marker>
              
              {/* POI Markers */}
              {pois.map((poi) => (
                <Marker
                  key={poi.id}
                  coordinate={{
                    latitude: poi.latitude,
                    longitude: poi.longitude,
                  }}
                  title={poi.name}
                  description={poi.description}
                  pinColor={selectedPOI?.id === poi.id ? '#F44336' : '#4CAF50'}
                />
              ))}
              
              {/* Trail Path */}
              {trailPath.length > 0 && (
                <Polyline
                  coordinates={trailPath}
                  strokeColor="#3f51b5"
                  strokeWidth={3}
                />
              )}
            </MapView>
            
            {/* Map Buttons */}
            <View style={styles.mapButtonsContainer}>
              <TouchableOpacity
                style={styles.mapButton}
                onPress={getDirectionsToTrailhead}
              >
                <Ionicons name="navigate-circle-outline" size={24} color="#fff" />
                <Text style={styles.mapButtonText}>Directions</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Points of Interest Section */}
        {pois.length > 0 && (
          <View style={styles.poisContainer}>
            <Text style={styles.sectionTitle}>Points of Interest</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.poisScrollContent}
            >
              {pois.map((poi) => (
                <POICard
                  key={poi.id}
                  poi={poi}
                  onPress={() => selectPOI(poi)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Additional Information */}
        <View style={styles.additionalInfoContainer}>
          <Text style={styles.sectionTitle}>Additional Information</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="footsteps-outline" size={20} color="#3f51b5" />
            <Text style={styles.infoLabel}>Surface:</Text>
            <Text style={styles.infoValue}>{trail.surface_type}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="accessibility-outline" size={20} color="#3f51b5" />
            <Text style={styles.infoLabel}>Accessible:</Text>
            <Text style={styles.infoValue}>
              {trail.is_accessible ? 'Yes' : 'No'}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#3f51b5" />
            <Text style={styles.infoLabel}>Last Updated:</Text>
            <Text style={styles.infoValue}>
              {new Date(trail.updated_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  heroContainer: {
    position: 'relative',
    height: 250,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroImagePlaceholder: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 8,
    color: '#888',
    fontSize: 14,
  },
  saveButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    padding: 16,
  },
  trailName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  difficultyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 12,
  },
  difficultyText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
  parkName: {
    fontSize: 14,
    color: '#666',
  },
  statisticsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statisticContainer: {
    width: '48%',
    marginBottom: 12,
  },
  statisticIcon: {
    marginBottom: 4,
  },
  statisticLabel: {
    fontSize: 12,
    color: '#666',
  },
  statisticValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  descriptionContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  readMoreText: {
    color: '#3f51b5',
    marginTop: 4,
    fontWeight: '500',
  },
  mapContainer: {
    marginBottom: 16,
  },
  mapWrapper: {
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapButtonsContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  mapButton: {
    backgroundColor: '#3f51b5',
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapButtonText: {
    color: '#fff',
    marginLeft: 4,
    fontWeight: '500',
  },
  poisContainer: {
    marginBottom: 16,
  },
  poisScrollContent: {
    paddingBottom: 8,
  },
  poiCard: {
    width: 120,
    marginRight: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  poiImage: {
    width: '100%',
    height: 80,
  },
  poiImagePlaceholder: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  poiName: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    marginHorizontal: 8,
  },
  poiType: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    marginHorizontal: 8,
  },
  additionalInfoContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    marginRight: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#666',
  },
});

export default TrailDetailsScreen;
