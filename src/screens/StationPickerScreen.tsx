import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { stationsGroupedByLine, searchStations, getLineById } from '../data/stations';
import type { Station } from '../data/types';
import { startJourneyForegroundService } from '../notifications/foregroundService';
import { requestCorePermissions } from '../utils/permissions';
import { useJourneyStore } from '../store/journeyStore';

type Props = NativeStackScreenProps<RootStackParamList, 'StationPicker'>;

interface Row {
  type: 'header' | 'station';
  key: string;
  label?: string;
  color?: string;
  station?: Station;
  lineId?: string;
}

export default function StationPickerScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [starting, setStarting] = useState<string | null>(null);
  const settings = useJourneyStore(s => s.settings);

  const rows: Row[] = useMemo(() => {
    if (query.trim()) {
      return searchStations(query).map(station => ({
        type: 'station',
        key: station.id,
        station,
        lineId: station.lineIds[0],
      }));
    }
    return stationsGroupedByLine().flatMap(({ line, stations }) => [
      { type: 'header' as const, key: `header-${line.id}`, label: line.name, color: line.color },
      ...stations.map(station => ({
        type: 'station' as const,
        key: `${line.id}-${station.id}`,
        station,
        lineId: line.id,
      })),
    ]);
  }, [query]);

  const onSelectDestination = async (station: Station, lineId: string) => {
    setStarting(station.id);
    try {
      const granted = await requestCorePermissions();
      if (!granted && !settings.simulateMode) {
        // Without location permission real GPS tracking can't work; Simulate
        // Mode (Settings) can still be used to try the app without it.
        setStarting(null);
        return;
      }
      await startJourneyForegroundService({ lineId, destinationStationId: station.id });
      navigation.navigate('ActiveJourney');
    } finally {
      setStarting(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Where are you getting off?</Text>
        <Pressable onPress={() => navigation.navigate('Settings')} hitSlop={12}>
          <Text style={styles.settingsLink}>Settings</Text>
        </Pressable>
      </View>
      <TextInput
        style={styles.search}
        placeholder="Search stations…"
        placeholderTextColor="#888"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
      />
      <FlatList
        data={rows}
        keyExtractor={row => row.key}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <View style={[styles.lineHeader, { borderLeftColor: item.color }]}>
                <Text style={styles.lineHeaderText}>{item.label}</Text>
              </View>
            );
          }
          const station = item.station!;
          const line = getLineById(item.lineId!);
          return (
            <Pressable
              style={styles.row}
              disabled={starting !== null}
              onPress={() => onSelectDestination(station, item.lineId!)}
            >
              <View style={[styles.dot, { backgroundColor: line?.color ?? '#999' }]} />
              <Text style={styles.rowText}>{station.name}</Text>
              {starting === station.id && <Text style={styles.starting}>Starting…</Text>}
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0e0e10' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  title: { color: 'white', fontSize: 20, fontWeight: '700' },
  settingsLink: { color: '#7B9CFF', fontSize: 14 },
  search: {
    margin: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#1c1c1f',
    color: 'white',
  },
  lineHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderLeftWidth: 4,
    backgroundColor: '#151517',
  },
  lineHeaderText: { color: '#ccc', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#26262a',
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  rowText: { color: 'white', fontSize: 16, flex: 1 },
  starting: { color: '#7B9CFF', fontSize: 13 },
});
