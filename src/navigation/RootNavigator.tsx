import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import StationPickerScreen from '../screens/StationPickerScreen';
import ActiveJourneyScreen from '../screens/ActiveJourneyScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ArrivalAlarmScreen from '../screens/ArrivalAlarmScreen';

export type RootStackParamList = {
  StationPicker: undefined;
  ActiveJourney: undefined;
  Settings: undefined;
  ArrivalAlarm: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StationPicker" component={StationPickerScreen} />
      <Stack.Screen name="ActiveJourney" component={ActiveJourneyScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: true, title: 'Settings' }} />
      <Stack.Screen
        name="ArrivalAlarm"
        component={ArrivalAlarmScreen}
        options={{ gestureEnabled: false, animation: 'fade' }}
      />
    </Stack.Navigator>
  );
}
