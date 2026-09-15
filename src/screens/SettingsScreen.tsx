import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Switch, Text, View } from 'react-native';
import { useJourneyStore, type Settings } from '../store/journeyStore';

const ALERT_STYLES: Array<{ value: Settings['alertStyle']; label: string }> = [
  { value: 'default', label: 'Sound + vibration' },
  { value: 'vibrationOnly', label: 'Vibration only' },
  { value: 'silent', label: 'Silent (visual only)' },
];

const PLAYBACK_SPEEDS = [1, 2, 5, 10];

export default function SettingsScreen() {
  const settings = useJourneyStore(s => s.settings);
  const updateSettings = useJourneyStore(s => s.updateSettings);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>Spoken announcements</Text>
        <Switch
          value={settings.ttsEnabled}
          onValueChange={v => updateSettings({ ttsEnabled: v })}
        />
      </View>

      <Text style={styles.sectionLabel}>Alert style</Text>
      {ALERT_STYLES.map(opt => (
        <Pressable
          key={opt.value}
          style={styles.optionRow}
          onPress={() => updateSettings({ alertStyle: opt.value })}
        >
          <View style={[styles.radio, settings.alertStyle === opt.value && styles.radioSelected]} />
          <Text style={styles.rowLabel}>{opt.label}</Text>
        </Pressable>
      ))}

      <View style={styles.divider} />

      <Text style={styles.sectionLabel}>Developer</Text>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowLabel}>Simulate Mode</Text>
          <Text style={styles.rowHint}>Play back a journey without real GPS, to test on a bench.</Text>
        </View>
        <Switch
          value={settings.simulateMode}
          onValueChange={v => updateSettings({ simulateMode: v })}
        />
      </View>

      {settings.simulateMode && (
        <>
          <View style={styles.speedRow}>
            <Text style={styles.rowLabel}>Playback speed</Text>
            <View style={styles.speedChips}>
              {PLAYBACK_SPEEDS.map(speed => (
                <Pressable
                  key={speed}
                  style={[styles.speedChip, settings.simulatePlaybackSpeed === speed && styles.speedChipSelected]}
                  onPress={() => updateSettings({ simulatePlaybackSpeed: speed })}
                >
                  <Text style={styles.speedChipText}>{speed}x</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Simulate GPS Drops</Text>
              <Text style={styles.rowHint}>Fake a lost signal in underground sections to test dead reckoning.</Text>
            </View>
            <Switch
              value={settings.simulateGpsDrops}
              onValueChange={v => updateSettings({ simulateGpsDrops: v })}
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0e0e10', padding: 20 },
  title: { color: 'white', fontSize: 22, fontWeight: '700', marginBottom: 20 },
  sectionLabel: { color: '#888', fontSize: 12, fontWeight: '700', marginTop: 20, marginBottom: 8, letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  rowLabel: { color: 'white', fontSize: 15 },
  rowHint: { color: '#888', fontSize: 12, marginTop: 2, maxWidth: 240 },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#555', marginRight: 12 },
  radioSelected: { borderColor: '#7B9CFF', backgroundColor: '#7B9CFF' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#333', marginTop: 12 },
  speedRow: { marginTop: 8 },
  speedChips: { flexDirection: 'row', marginTop: 8, gap: 8 },
  speedChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#1c1c1f' },
  speedChipSelected: { backgroundColor: '#7B9CFF' },
  speedChipText: { color: 'white', fontSize: 13, fontWeight: '600' },
});
