import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DIETS, type DietId } from '../diet/diets';
import { RADIUS_CHOICES } from '../lib/storage';
import { usePreferences } from '../state/PreferencesContext';
import { useTheme } from '../ui/theme';
import { Pill } from '../ui/components/Pill';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'DietProfile'>;

export function DietProfileScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { preferences, update } = usePreferences();
  const onboarding = route.params?.onboarding ?? false;

  const toggleDiet = (id: DietId) => {
    const selected = preferences.diets.includes(id);
    update({
      diets: selected
        ? preferences.diets.filter((value) => value !== id)
        : [...preferences.diets, id],
    });
  };

  const done = () => {
    update({ onboarded: true });
    if (onboarding) navigation.replace('Nearby');
    else navigation.goBack();
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 96 }]}
        contentInsetAdjustmentBehavior="automatic"
      >
        {onboarding ? (
          <View style={styles.intro}>
            <Text style={[styles.title, { color: theme.text }]}>What can't you eat?</Text>
            <Text style={[styles.lede, { color: theme.textMuted }]}>
              Tell us once. Every list after this is filtered for you, so you never have to read
              another menu to find out it was pointless.
            </Text>
          </View>
        ) : null}

        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Your requirements</Text>

        <View style={styles.dietList}>
          {DIETS.map((diet) => {
            const selected = preferences.diets.includes(diet.id);
            return (
              <Pressable
                key={diet.id}
                onPress={() => toggleDiet(diet.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`${diet.label}. ${diet.description}`}
                style={({ pressed }) => [
                  styles.dietRow,
                  {
                    backgroundColor: theme.surface,
                    borderColor: selected ? theme.accent : theme.border,
                    borderWidth: selected ? 2 : 1,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Text style={styles.dietEmoji}>{diet.emoji}</Text>
                <View style={styles.dietText}>
                  <Text style={[styles.dietLabel, { color: theme.text }]}>{diet.label}</Text>
                  <Text style={[styles.dietDescription, { color: theme.textMuted }]}>
                    {diet.description}
                  </Text>
                  {diet.osmKey === null ? (
                    <Text style={[styles.dietWarning, { color: theme.warning }]}>
                      No venue data exists for this — we can only rank by cuisine risk.
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.check, { color: selected ? theme.accent : theme.border }]}>
                  {selected ? '●' : '○'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>How far will you go?</Text>
        <View style={styles.row}>
          {RADIUS_CHOICES.map((radius) => (
            <Pill
              key={radius}
              label={radius >= 1000 ? `${radius / 1000} km` : `${radius} m`}
              selected={preferences.radiusMetres === radius}
              onPress={() => update({ radiusMetres: radius })}
            />
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Results</Text>
        <View style={styles.row}>
          <Pill
            label="Hide unsuitable places"
            selected={preferences.hideUnsuitable}
            onPress={() => update({ hideUnsuitable: !preferences.hideUnsuitable })}
          />
          <Pill
            label="Open right now only"
            selected={preferences.openNowOnly}
            onPress={() => update({ openNowOnly: !preferences.openNowOnly })}
          />
        </View>

        <Text style={[styles.footnote, { color: theme.textFaint }]}>
          Suitability comes from OpenStreetMap, which volunteers maintain. It is a strong head
          start, not a guarantee — always confirm an allergy with the kitchen.
        </Text>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + 12,
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
          },
        ]}
      >
        <Pressable
          onPress={done}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: theme.accent, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Text style={[styles.primaryButtonLabel, { color: theme.accentText }]}>
            {onboarding ? 'Find me somewhere to eat' : 'Done'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 12 },
  intro: { gap: 8, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  lede: { fontSize: 15, lineHeight: 22 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 12,
  },
  dietList: { gap: 8 },
  dietRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    padding: 14,
  },
  dietEmoji: { fontSize: 22 },
  dietText: { flex: 1, gap: 2 },
  dietLabel: { fontSize: 16, fontWeight: '700' },
  dietDescription: { fontSize: 13, lineHeight: 18 },
  dietWarning: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  check: { fontSize: 20 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  footnote: { fontSize: 12, lineHeight: 18, marginTop: 20 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonLabel: { fontSize: 16, fontWeight: '700' },
});
