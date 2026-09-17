import { StyleSheet, Text, View } from 'react-native';
import { Pill } from './Pill';
import { useTheme } from '../theme';

interface Props {
  emoji: string;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Full-width state for empty results, permission prompts and errors. */
export function Message({ emoji, title, body, actionLabel, onAction }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.wrapper}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.body, { color: theme.textMuted }]}>{body}</Text>
      {actionLabel && onAction ? (
        <Pill label={actionLabel} selected onPress={onAction} style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
    gap: 8,
  },
  emoji: {
    fontSize: 40,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  action: {
    marginTop: 12,
  },
});
