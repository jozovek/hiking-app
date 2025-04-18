import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

interface TrailCardProps {
  id: number;
  name: string;
  length: number;
  difficulty: string;
  imageUrl?: string;
  onPress: (id: number) => void;
}

const TrailCard: React.FC<TrailCardProps> = ({
  id,
  name,
  length,
  difficulty,
  imageUrl,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(id)}>
      {imageUrl && (
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      )}
      <View style={styles.content}>
        <Text style={styles.name}>{name}</Text>
        <View style={styles.details}>
          <Text style={styles.length}>{length.toFixed(1)} miles</Text>
          <Text
            style={[
              styles.difficulty,
              {
                color:
                  difficulty === 'Easy'
                    ? '#4CAF50'
                    : difficulty === 'Moderate'
                    ? '#FF9800'
                    : '#F44336',
              },
            ]}
          >
            {difficulty}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  image: {
    height: 120,
    width: '100%',
  },
  content: {
    padding: 16,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  length: {
    color: '#666',
  },
  difficulty: {
    fontWeight: '500',
  },
});

export default TrailCard;
