import React from 'react';
import { SafeAreaView, StyleSheet, Text, View, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useJourneyStore } from '../store/journeyStore';
import { getStationById, getLineById } from '../data/stations';
import { stopJourneyForegroundService } from '../notifications/foregroundService';
import { formatDistance, formatDuration, formatSpeed, formatStopsRemaining } from '../utils/formatters';

type Props = NativeStackScreenProps<RootStackParamList, 'ActiveJourney'>;

export default function ActiveJourneyScreen({ navigation }: Props) {
  const lineId = useJourneyStore(s => s.lineId);
  const destinationStationId = useJourneyStore(s => s.destinationStationId);
  const engineState = useJourneyStore(s => s.engineState);

  const line = lineId ? getLineById(lineId) : undefined;
  const destination = destinationStationId ? getStationById(destinationStationId) : undefined;
  const nextStation = engineState?.nextStationId ? getStationById(engineState.nextStationId) : undefined;

  const onEndJourney = async () => {
    await stopJourneyForegroundService();
    navigation.popToTop();
  };

  if (!line || !destination) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.hint}>No active journey.</Text>
        <Pressable style={styles.endButton} onPress={() => navigation.popToTop()}>
          <Text style={styles.endButtonText}>Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { borderTopColor: line.color, borderTopWidth: 4 }]}>
      <Text style={styles.lineLabel}>{line.name}</Text>
      <Text style={styles.destination}>Getting off at {destination.name}</Text>

      {!engineState ? (
        <Text style={styles.hint}>Waiting for GPS…</Text>
      ) : (
        <View style={styles.card}>
          <Text style={styles.stopsRemaining}>{formatStopsRemaining(engineState.stopsRemaining)}</Text>
          {nextStation && <Text style={styles.nextStation}>Next: {nextStation.name}</Text>}

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: line.color,
                  width: `${Math.max(4, 100 - Math.min(100, engineState.stopsRemaining * 15))}%`,
                },
              ]}
            />
          </View>

          <View style={styles.metricsRow}>
            <Metric label="Distance" value={formatDistance(engineState.distanceRemainingMeters)} />
            <Metric label="Speed" value={formatSpeed(engineState.currentSpeedKmh)} />
            <Metric label="ETA" value={engineState.etaSeconds !== null ? formatDuration(engineState.etaSeconds) : '—'} />
          </View>

          {engineState.match.source === 'dead-reckoning' && (
            <Text style={styles.estimatedNote}>Estimated — GPS signal lost (tunnel?)</Text>
          )}
          {engineState.wrongDirectionWarning && (
            <Text style={styles.warningNote}>You might be heading the wrong way</Text>
          )}
          {engineState.alertState === 'EXITED_CORRIDOR' && (
            <Text style={styles.warningNote}>Left the {line.name} corridor — journey ended</Text>
          )}
        </View>
      )}

      <Pressable style={styles.endButton} onPress={onEndJourney}>
        <Text style={styles.endButtonText}>End Journey</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0e0e10', padding: 20 },
  lineLabel: { color: '#aaa', fontSize: 13, fontWeight: '700', marginTop: 8 },
  destination: { color: 'white', fontSize: 22, fontWeight: '700', marginTop: 4, marginBottom: 24 },
  hint: { color: '#999', fontSize: 16, marginTop: 40, textAlign: 'center' },
  card: { backgroundColor: '#1c1c1f', borderRadius: 16, padding: 20 },
  stopsRemaining: { color: 'white', fontSize: 32, fontWeight: '800' },
  nextStation: { color: '#aaa', fontSize: 15, marginTop: 4 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: '#333', marginTop: 20, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
  metric: { alignItems: 'center', flex: 1 },
  metricValue: { color: 'white', fontSize: 18, fontWeight: '700' },
  metricLabel: { color: '#888', fontSize: 12, marginTop: 2 },
  estimatedNote: { color: '#e0b64a', fontSize: 13, marginTop: 16 },
  warningNote: { color: '#e05a4a', fontSize: 13, marginTop: 8 },
  endButton: {
    marginTop: 'auto',
    marginBottom: 12,
    backgroundColor: '#2a2a2e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  endButtonText: { color: '#ff6b6b', fontWeight: '700', fontSize: 15 },
});
