import React, { useEffect } from 'react';
import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import notifee, { EventType } from '@notifee/react-native';
import RootNavigator, { type RootStackParamList } from './src/navigation/RootNavigator';
import { registerJourneyForegroundService } from './src/notifications/foregroundService';
import { ARRIVAL_ALARM_NOTIFICATION_ID } from './src/notifications/alarmNotification';

registerJourneyForegroundService();

const navigationRef = createNavigationContainerRef<RootStackParamList>();

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    // App was already running/backgrounded and the user tapped the alarm
    // notification (or its full-screen UI, once launched, re-presses it).
    const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS && detail.notification?.id === ARRIVAL_ALARM_NOTIFICATION_ID) {
        if (navigationRef.isReady()) navigationRef.navigate('ArrivalAlarm');
      }
    });

    // App was cold-started by the arrival alarm's full-screen intent.
    notifee.getInitialNotification().then(initial => {
      if (initial?.notification.id === ARRIVAL_ALARM_NOTIFICATION_ID && navigationRef.isReady()) {
        navigationRef.navigate('ArrivalAlarm');
      }
    });

    return unsubscribe;
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.container}>
        <NavigationContainer ref={navigationRef}>
          <RootNavigator />
        </NavigationContainer>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
