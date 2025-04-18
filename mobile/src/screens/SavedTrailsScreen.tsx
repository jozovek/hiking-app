import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import SavedTrailsService from '../services/SavedTrailsService';
import { Trail } from '../models/types';
import TrailCard from '../components/TrailCard';

const SavedTrailsScreen = () => {
  // Navigation
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  
  // State variables
  const [savedTrails, setSavedTrails] = useState<Trail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load saved trails
  const loadSavedTrails = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const trails = await SavedTrailsService.getSavedTrails();
      setSavedTrails(trails);
    } catch (error) {
      setError('Failed to load saved trails');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle pull-to-refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSavedTrails();
    setRefreshing(false);
  };
  
  // Remove a trail from saved list
  const handleRemoveTrail = (trailId: number) => {
    Alert.alert(
      'Remove Trail',
      'Are you sure you want to remove this trail from your saved list?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await SavedTrailsService.removeTrail(trailId);
              setSavedTrails(prevTrails => 
                prevTrails.filter(trail => trail.id !== trailId)
              );
            } catch (error) {
              console.error('Failed to remove trail:', error);
              Alert.alert('Error', 'Failed to remove trail from saved list');
            }
          },
        },
      ]
    );
  };
  
  // Navigate to trail details
  const navigateToTrailDetails = (trailId: number) => {
    navigation.navigate('TrailDetails', { trailId });
  };
  
  // Clear all saved trails
  const handleClearAllTrails = () => {
    if (savedTrails.length === 0) return;
    
    Alert.alert(
      'Clear All Saved Trails',
      'Are you sure you want to remove all trails from your saved list?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await SavedTrailsService.clearSavedTrails();
              setSavedTrails([]);
            } catch (error) {
              console.error('Failed to clear saved trails:', error);
              Alert.alert('Error', 'Failed to clear saved trails');
            }
          },
        },
      ]
    );
  };
  
  // Render trail item with remove button
  const renderTrailItem = ({ item }: { item: Trail }) => (
    <View style={styles.trailItemContainer}>
      <TrailCard
        id={item.id}
        name={item.name}
        length={item.length}
        difficulty={item.difficulty}
        imageUrl={item.image_url || undefined}
        onPress={navigateToTrailDetails}
      />
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveTrail(item.id)}
      >
        <Ionicons name="trash-outline" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );
  
  // Load saved trails when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadSavedTrails();
    }, [])
  );
  
  // Loading state
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3f51b5" />
        <Text style={styles.loadingText}>Loading saved trails...</Text>
      </View>
    );
  }
  
  // Error state
  if (error && !refreshing) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#F44336" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.errorButton}
          onPress={loadSavedTrails}
        >
          <Text style={styles.errorButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved Trails</Text>
        {savedTrails.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearAllTrails}
          >
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Empty State */}
      {savedTrails.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No Saved Trails</Text>
          <Text style={styles.emptyText}>
            Save trails you like by tapping the heart icon on trail details.
          </Text>
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => {
              // Navigate to the Main screen (tab navigator) and then to the Explore tab
              navigation.navigate('Main', { screen: 'Explore' });
            }}
          >
            <Text style={styles.exploreButtonText}>Explore Trails</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Saved Trails List */}
      {savedTrails.length > 0 && (
        <FlatList
          data={savedTrails}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTrailItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#3f51b5']}
              tintColor="#3f51b5"
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  clearButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  clearButtonText: {
    color: '#F44336',
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
    marginBottom: 24,
  },
  exploreButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#3f51b5',
    borderRadius: 8,
  },
  exploreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
  },
  trailItemContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(244, 67, 54, 0.8)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SavedTrailsScreen;
