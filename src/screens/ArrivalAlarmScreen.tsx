import React from 'react';
import { SafeAreaView, StyleSheet, Text, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useJourneyStore } from '../store/journeyStore';
import { getStationById } from '../data/stations';
import { stopJourneyForegroundService } from '../notifications/foregroundService';

type Props = NativeStackScreenProps<RootStackParamList, 'ArrivalAlarm'>;

/**
 * Full-screen UI launched by the arrival alarm's fullScreenAction, so it can
 * appear over a locked screen — this is the "wake a sleeping user" moment.
 */
export default function ArrivalAlarmScreen({ navigation }: Props) {
  const destinationStationId = useJourneyStore(s => s.destinationStationId);
  const destination = destinationStationId ? getStationById(destinationStationId) : undefined;

  const onDismiss = async () => {
    await stopJourneyForegroundService();
    navigation.popToTop();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.emoji}>🚉</Text>
      <Text style={styles.title}>You've arrived</Text>
      <Text style={styles.destination}>{destination?.name ?? 'your stop'}</Text>
      <Text style={styles.hint}>Time to get off.</Text>
      <Pressable style={styles.dismissButton} onPress={onDismiss}>
        <Text style={styles.dismissText}>Dismiss</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#c0392b', alignItems: 'center', justifyContent: 'center', padding: 24 },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: { color: 'white', fontSize: 24, fontWeight: '700' },
  destination: { color: 'white', fontSize: 32, fontWeight: '800', marginTop: 8, textAlign: 'center' },
  hint: { color: '#ffe1de', fontSize: 15, marginTop: 12 },
  dismissButton: {
    marginTop: 48,
    backgroundColor: 'white',
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 30,
  },
  dismissText: { color: '#c0392b', fontWeight: '800', fontSize: 16 },
});
