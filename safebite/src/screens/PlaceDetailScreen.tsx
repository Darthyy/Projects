import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CATEGORY_LABELS } from '../data/types';
import { getDiet } from '../diet/diets';
import { VERDICT_LABELS } from '../diet/match';
import { formatDistance, formatWalkingTime } from '../lib/geo';
import { useTheme, verdictStyle } from '../ui/theme';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'PlaceDetail'>;

function directionsUrl(latitude: number, longitude: number, name: string): string {
  const label = encodeURIComponent(name);
  if (Platform.OS === 'ios') return `maps://?daddr=${latitude},${longitude}&q=${label}`;
  if (Platform.OS === 'android') return `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`;
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}

async function open(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    // Nothing installed to handle it; silently ignoring beats crashing.
  }
}

export function PlaceDetailScreen({ route }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { entry } = route.params;
  const { place, distanceMetres, match, openState } = entry;

  const openText =
    openState === true ? 'Open now' : openState === false ? 'Closed now' : 'Opening hours unknown';
  const openColour =
    openState === true ? theme.accent : openState === false ? theme.danger : theme.textFaint;

  const notes = match.matches
    .map((dietMatch) => getDiet(dietMatch.dietId))
    .filter((diet) => diet.safetyNote)
    .map((diet) => ({ label: diet.label, note: diet.safetyNote as string }));

  const osmUrl = `https://www.openstreetmap.org/${place.osmType}/${place.osmId}`;

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={styles.headerBlock}>
        <Text style={[styles.name, { color: theme.text }]}>{place.name}</Text>
        <Text style={[styles.meta, { color: theme.textMuted }]}>
          {CATEGORY_LABELS[place.category]}
          {place.cuisines.length > 0 ? ` · ${place.cuisines.join(', ').replace(/_/g, ' ')}` : ''}
        </Text>
        <Text style={[styles.meta, { color: theme.textMuted }]}>
          {formatDistance(distanceMetres)} away · {formatWalkingTime(distanceMetres)}
        </Text>
        <Text style={[styles.open, { color: openColour }]}>{openText}</Text>
      </View>

      <Pressable
        onPress={() => open(directionsUrl(place.latitude, place.longitude, place.name))}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.primaryButton,
          { backgroundColor: theme.accent, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Text style={[styles.primaryButtonLabel, { color: theme.accentText }]}>Directions</Text>
      </Pressable>

      <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Your requirements here</Text>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {match.matches.length === 0 ? (
          <Text style={[styles.body, { color: theme.textMuted }]}>
            No requirements selected, so nothing has been checked.
          </Text>
        ) : (
          match.matches.map((dietMatch, index) => {
            const diet = getDiet(dietMatch.dietId);
            const style = verdictStyle(dietMatch.verdict, theme);
            return (
              <View
                key={dietMatch.dietId}
                style={[
                  styles.dietRow,
                  index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
                ]}
              >
                <View style={styles.dietHeader}>
                  <Text style={[styles.dietLabel, { color: theme.text }]}>
                    {diet.emoji} {diet.label}
                  </Text>
                  <Text style={[styles.verdict, { color: style.foreground }]}>
                    {VERDICT_LABELS[dietMatch.verdict]}
                  </Text>
                </View>
                <Text style={[styles.body, { color: theme.textMuted }]}>{dietMatch.reason}</Text>
              </View>
            );
          })
        )}
      </View>

      {match.needsStaffCheck ? (
        <View
          style={[styles.notice, { backgroundColor: theme.surfaceRaised, borderColor: theme.warning }]}
        >
          <Text style={[styles.noticeTitle, { color: theme.warning }]}>Check before you order</Text>
          {notes.length > 0 ? (
            notes.map((note) => (
              <Text key={note.label} style={[styles.body, { color: theme.textMuted }]}>
                <Text style={{ color: theme.text, fontWeight: '600' }}>{note.label}: </Text>
                {note.note}
              </Text>
            ))
          ) : (
            <Text style={[styles.body, { color: theme.textMuted }]}>
              Some of this is inferred from the cuisine rather than recorded by the venue. Confirm
              with staff when you arrive.
            </Text>
          )}
        </View>
      ) : null}

      <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Details</Text>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {place.address ? <Detail label="Address" value={place.address} /> : null}
        {place.openingHours ? <Detail label="Hours" value={place.openingHours} /> : null}
        {place.phone ? (
          <Detail label="Phone" value={place.phone} onPress={() => open(`tel:${place.phone}`)} />
        ) : null}
        {place.website ? (
          <Detail label="Website" value={place.website} onPress={() => open(place.website as string)} />
        ) : null}
        {!place.address && !place.openingHours && !place.phone && !place.website ? (
          <Text style={[styles.body, { color: theme.textMuted }]}>
            Nothing else has been recorded for this place.
          </Text>
        ) : null}
      </View>

      <Pressable onPress={() => open(osmUrl)} accessibilityRole="link" style={styles.footerLink}>
        <Text style={[styles.footerLinkLabel, { color: theme.textFaint }]}>
          Details wrong or missing? Improve this listing on OpenStreetMap →
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function Detail({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  const theme = useTheme();

  const content = (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: theme.textFaint }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: onPress ? theme.accent : theme.text }]}>
        {value}
      </Text>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} accessibilityRole="link">
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  headerBlock: { gap: 4 },
  name: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  meta: { fontSize: 14, textTransform: 'capitalize' },
  open: { fontSize: 15, fontWeight: '700', marginTop: 4 },
  primaryButton: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  primaryButtonLabel: { fontSize: 16, fontWeight: '700' },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 12,
  },
  card: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14 },
  dietRow: { paddingVertical: 12, gap: 4 },
  dietHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  dietLabel: { fontSize: 16, fontWeight: '700' },
  verdict: { fontSize: 13, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20 },
  notice: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  noticeTitle: { fontSize: 14, fontWeight: '700' },
  detailRow: { paddingVertical: 12, gap: 2 },
  detailLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  detailValue: { fontSize: 15, lineHeight: 21 },
  footerLink: { paddingVertical: 16 },
  footerLinkLabel: { fontSize: 13, lineHeight: 19 },
});
