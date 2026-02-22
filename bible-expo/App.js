import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import BibleScreen from './src/screens/BibleScreen';
import AIScreen from './src/screens/AIScreen';
import NotesScreen from './src/screens/NotesScreen';
import PlanScreen from './src/screens/PlanScreen';
import { colors } from './src/constants';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarStyle: {
              backgroundColor: '#ffffff',
              borderTopWidth: 1,
              borderTopColor: '#e7e5e4',
              height: 60,
              paddingBottom: 8,
              paddingTop: 4,
            },
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.tabInactive,
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '600',
            },
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;
              if (route.name === '성경') {
                iconName = focused ? 'book' : 'book-outline';
              } else if (route.name === 'AI') {
                iconName = focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline';
              } else if (route.name === '메모') {
                iconName = focused ? 'document-text' : 'document-text-outline';
              } else if (route.name === '읽기표') {
                iconName = focused ? 'checkbox' : 'checkbox-outline';
              }
              return <Ionicons name={iconName} size={22} color={color} />;
            },
          })}
        >
          <Tab.Screen name="성경" component={BibleScreen} />
          <Tab.Screen
            name="AI"
            component={AIScreen}
            options={{ unmountOnBlur: false }}
          />
          <Tab.Screen name="메모" component={NotesScreen} />
          <Tab.Screen name="읽기표" component={PlanScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
