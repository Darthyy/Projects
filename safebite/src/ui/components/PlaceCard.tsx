import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RankedPlace } from '../../data/search';
import { CATEGORY_LABELS } from '../../data/types';
import { getDiet } from '../../diet/diets';
import { formatDistance, formatWalkingTime } from '../../lib/geo';
import { useTheme } from '../theme';
import { VerdictBadge } from './VerdictBadge';

interface Props {
  entry: RankedPlace;
  onPress: (entry: RankedPlace) => void;
}

function openLabel(open: RankedPlace['openState']): { text: string; tone: 'open' | 'shut' | 'unknown' } {
  if (open === true) return { text: 'Open now', tone: 'open' };
  if (open === false) return { text: 'Closed now', tone: 'shut' };
  return { text: 'Hours unknown', tone: 'unknown' };
}

export const PlaceCard = memo(function PlaceCard({ entry, onPress }: Props) {
  const theme = useTheme();
  const { place, distanceMetres, match, openState } = entry;
  const open = openLabel(openState);

  const openColour =
    open.tone === 'open' ? theme.accent : open.tone === 'shut' ? theme.danger : theme.textFaint;

  const subtitle = [CATEGORY_LABELS[place.category], place.cuisines[0]?.replace(/_/g, ' ')]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      onPress={() => onPress(entry)}
      accessibilityRole="button"
      accessibilityLabel={`${place.name}, ${formatDistance(distanceMetres)} away, ${open.text}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
          {place.name}
        </Text>
        <Text style={[styles.distance, { color: theme.textMuted }]}>
          {formatDistance(distanceMetres)}
        </Text>
      </View>

      <Text style={[styles.subtitle, { color: theme.textFaint }]} numberOfLines={1}>
        {subtitle || 'Food'} · {formatWalkingTime(distanceMetres)}
      </Text>

      <View style={styles.badges}>
        <VerdictBadge verdict={match.verdict} />
        {match.matches.map((dietMatch) => (
          <VerdictBadge
            key={dietMatch.dietId}
            compact
            verdict={dietMatch.verdict}
            label={getDiet(dietMatch.dietId).label}
          />
        ))}
      </View>

      <Text style={[styles.open, { color: openColour }]}>{open.text}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  name: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
  },
  distance: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  subtitle: {
    fontSize: 13,
    textTransform: 'capitalize',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  open: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
});
