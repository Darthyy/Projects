import { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { rankPlaces, type RankedPlace } from '../data/search';
import { getDiet } from '../diet/diets';
import { useLocation } from '../hooks/useLocation';
import { useNearbyPlaces } from '../hooks/useNearbyPlaces';
import { usePreferences } from '../state/PreferencesContext';
import { useTheme } from '../ui/theme';
import { Message } from '../ui/components/Message';
import { Pill } from '../ui/components/Pill';
import { PlaceCard } from '../ui/components/PlaceCard';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Nearby'>;

export function NearbyScreen({ navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { preferences, update } = usePreferences();
  const location = useLocation();
  const nearby = useNearbyPlaces(location.coords, preferences.radiusMetres);

  const results = useMemo(() => {
    if (!location.coords) return [];
    return rankPlaces(nearby.places, {
      origin: location.coords,
      diets: preferences.diets,
      sort: preferences.sort,
      hideUnsuitable: preferences.hideUnsuitable,
      openNowOnly: preferences.openNowOnly,
    });
  }, [
    nearby.places,
    location.coords,
    preferences.diets,
    preferences.sort,
    preferences.hideUnsuitable,
    preferences.openNowOnly,
  ]);

  const dietSummary =
    preferences.diets.length > 0
      ? preferences.diets.map((id) => getDiet(id).label).join(' + ')
      : 'No requirements set';

  const refreshing = location.status === 'locating' || nearby.status === 'loading';

  const refresh = () => {
    location.refresh();
    nearby.reload();
  };

  const openPlace = (entry: RankedPlace) => navigation.navigate('PlaceDetail', { entry });

  const header = (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.text }]}>Eat nearby</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]} numberOfLines={1}>
            {dietSummary}
          </Text>
        </View>
        <Pressable
          onPress={() => navigation.navigate('DietProfile', {})}
          accessibilityRole="button"
          accessibilityLabel="Edit your dietary requirements"
          style={({ pressed }) => [
            styles.editButton,
            { borderColor: theme.border, backgroundColor: theme.surface, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.editLabel, { color: theme.text }]}>Edit</Text>
        </Pressable>
      </View>

      <View style={styles.filters}>
        <Pill
          label={preferences.sort === 'match' ? 'Best match first' : 'Closest first'}
          selected={false}
          onPress={() => update({ sort: preferences.sort === 'match' ? 'distance' : 'match' })}
        />
        <Pill
          label="Open now"
          selected={preferences.openNowOnly}
          onPress={() => update({ openNowOnly: !preferences.openNowOnly })}
        />
      </View>

      {results.length > 0 ? (
        <Text style={[styles.count, { color: theme.textFaint }]}>
          {results.length} {results.length === 1 ? 'place' : 'places'} within{' '}
          {preferences.radiusMetres >= 1000
            ? `${preferences.radiusMetres / 1000} km`
            : `${preferences.radiusMetres} m`}
        </Text>
      ) : null}
    </View>
  );

  const body = () => {
    if (location.status === 'denied') {
      return (
        <Message
          emoji="📍"
          title="Location is switched off"
          body="This app only knows what is near you if it can see where you are. Turn location on for SafeBite in Settings, then try again."
          actionLabel="Try again"
          onAction={location.refresh}
        />
      );
    }

    if (location.status === 'error') {
      return (
        <Message
          emoji="🛰️"
          title="Couldn't find you"
          body={location.error ?? 'Your position was not available.'}
          actionLabel="Try again"
          onAction={location.refresh}
        />
      );
    }

    if (nearby.status === 'error' && nearby.places.length === 0) {
      return (
        <Message
          emoji="📡"
          title="Couldn't load places"
          body={nearby.error ?? 'The map servers did not respond.'}
          actionLabel="Try again"
          onAction={nearby.reload}
        />
      );
    }

    if (refreshing && nearby.places.length === 0) {
      return (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.accent} />
          <Text style={[styles.loadingLabel, { color: theme.textMuted }]}>
            {location.coords ? 'Looking for places you can eat…' : 'Finding you…'}
          </Text>
        </View>
      );
    }

    if (preferences.diets.length === 0) {
      return (
        <Message
          emoji="🍽️"
          title="Tell us what you avoid"
          body="Pick your dietary requirements and this list becomes places you can actually eat at."
          actionLabel="Set requirements"
          onAction={() => navigation.navigate('DietProfile', {})}
        />
      );
    }

    return (
      <Message
        emoji="🔍"
        title="Nothing within reach"
        body={
          preferences.openNowOnly
            ? 'Nothing suitable is open right now. Try widening the distance or turning off the open-now filter.'
            : 'No suitable places were found nearby. Try a wider search distance.'
        }
        actionLabel="Change distance"
        onAction={() => navigation.navigate('DietProfile', {})}
      />
    );
  };

  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      data={results}
      keyExtractor={(entry) => entry.place.id}
      renderItem={({ item }) => <PlaceCard entry={item} onPress={openPlace} />}
      ListHeaderComponent={header}
      ListEmptyComponent={body}
      contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.accent} />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10 },
  header: { gap: 12, marginBottom: 4 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1, gap: 2 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, fontWeight: '600' },
  editButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  editLabel: { fontSize: 14, fontWeight: '600' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  count: { fontSize: 13 },
  loading: { alignItems: 'center', gap: 12, paddingVertical: 64 },
  loadingLabel: { fontSize: 15 },
});
