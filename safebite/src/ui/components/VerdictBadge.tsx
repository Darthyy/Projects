import { StyleSheet, Text, View } from 'react-native';
import { VERDICT_LABELS, type Verdict } from '../../diet/match';
import { useTheme, verdictStyle } from '../theme';

interface Props {
  verdict: Verdict;
  /** Overrides the default wording, e.g. to name the diet. */
  label?: string;
  compact?: boolean;
}

export function VerdictBadge({ verdict, label, compact = false }: Props) {
  const theme = useTheme();
  const style = verdictStyle(verdict, theme);
  const text = label ?? VERDICT_LABELS[verdict];

  return (
    <View
      accessible
      accessibilityLabel={text}
      style={[
        styles.badge,
        compact && styles.badgeCompact,
        { backgroundColor: style.background },
      ]}
    >
      <Text style={[styles.icon, { color: style.foreground }]}>{style.icon}</Text>
      <Text
        numberOfLines={1}
        style={[styles.label, compact && styles.labelCompact, { color: style.foreground }]}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeCompact: {
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  icon: {
    fontSize: 12,
    fontWeight: '700',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  labelCompact: {
    fontSize: 12,
  },
});
