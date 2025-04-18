import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import TrailDetailsScreen from '../screens/TrailDetailsScreen';
import ExploreScreen from '../screens/ExploreScreen';
import SearchScreen from '../screens/SearchScreen';
import SavedTrailsScreen from '../screens/SavedTrailsScreen';

// Define the types for our navigation parameters
export type MainTabParamList = {
  Home: undefined;
  Explore: undefined;
  Search: undefined;
  Saved: undefined;
};

export type RootStackParamList = {
  Main: { screen?: keyof MainTabParamList };
  TrailDetails: { trailId: number };
};

// Create navigators
const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Add type assertion to avoid TypeScript errors
const TabNavigator = Tab.Navigator as any;
const StackNavigator = Stack.Navigator as any;

// Main tab navigator
const MainTabNavigator = () => {
  return (
    <TabNavigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Explore') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Saved') {
            iconName = focused ? 'heart' : 'heart-outline';
          } else {
            iconName = 'help-circle-outline';
          }

          // You can return any component here
          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3f51b5',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen 
        name="Explore" 
        component={ExploreScreen}
        options={{ tabBarLabel: 'Explore' }}
      />
      <Tab.Screen 
        name="Search" 
        component={SearchScreen}
        options={{ tabBarLabel: 'Search' }}
      />
      <Tab.Screen 
        name="Saved" 
        component={SavedTrailsScreen}
        options={{ tabBarLabel: 'Saved' }}
      />
    </TabNavigator>
  );
};

// Root stack navigator
const AppNavigator = () => {
  return (
    <NavigationContainer>
      <StackNavigator initialRouteName="Main">
        <Stack.Screen 
          name="Main" 
          component={MainTabNavigator} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="TrailDetails" 
          component={TrailDetailsScreen}
          options={{
            headerTransparent: true,
            headerTintColor: '#fff',
            headerBackTitle: 'Back'
          }}
        />
      </StackNavigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
