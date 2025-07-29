import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import DebtsScreen from './screens/DebtsScreen'; // Renamed logically
import PeopleScreen from './screens/PeopleScreen';
import AddDebtScreen from './screens/AddDebtScreen';
import AddPersonScreen from './screens/AddPersonScreen';

function SettingsScreen() {
  return null; // Placeholder, replace with your implementation
}

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === 'Debts') {
            iconName = 'account-balance-wallet';
          } else if (route.name === 'People') {
            iconName = 'people';
          } else if (route.name === 'Settings') {
            iconName = 'settings';
          }

          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6200ee',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Debts" component={DebtsScreen} />
      <Tab.Screen name="People" component={PeopleScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="RootTabs"
          component={Tabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="AddDebt" component={AddDebtScreen} />
        <Stack.Screen name="AddPersonScreen" component={AddPersonScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
