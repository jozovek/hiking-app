import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView } from 'react-native';
import TrailCard from '../components/TrailCard';

// This would be replaced with actual data from the database
const MOCK_TRAILS = [
  {
    id: 1,
    name: 'Wissahickon Valley Trail',
    length: 5.8,
    difficulty: 'Moderate',
    imageUrl: 'https://example.com/wissahickon.jpg',
  },
  {
    id: 2,
    name: 'Pennypack Trail',
    length: 3.2,
    difficulty: 'Easy',
    imageUrl: 'https://example.com/pennypack.jpg',
  },
  {
    id: 3,
    name: 'Forbidden Drive',
    length: 7.5,
    difficulty: 'Easy',
    imageUrl: 'https://example.com/forbidden-drive.jpg',
  },
  {
    id: 4,
    name: 'Schuylkill River Trail',
    length: 10.2,
    difficulty: 'Moderate',
    imageUrl: 'https://example.com/schuylkill.jpg',
  },
];

interface HomeScreenProps {
  navigation: any; // This would be properly typed with React Navigation types
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [featuredTrails, setFeaturedTrails] = useState(MOCK_TRAILS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // In a real app, this would fetch data from the database
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setFeaturedTrails(MOCK_TRAILS);
      setLoading(false);
    }, 1000);
  }, []);

  const handleTrailPress = (trailId: number) => {
    // Navigate to trail details screen with the trail ID
    navigation.navigate('TrailDetails', { 
      trailId: trailId 
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Philadelphia Hiking Trails</Text>
      <Text style={styles.subtitle}>Featured Trails</Text>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text>Loading trails...</Text>
        </View>
      ) : (
        <FlatList
          data={featuredTrails}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TrailCard
              id={item.id}
              name={item.name}
              length={item.length}
              difficulty={item.difficulty}
              imageUrl={item.imageUrl}
              onPress={handleTrailPress}
            />
          )}
          contentContainerStyle={styles.listContent}
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 16,
    marginHorizontal: 16,
    color: '#666',
  },
  listContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default HomeScreen;
