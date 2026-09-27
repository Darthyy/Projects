import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme as NavTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NearbyScreen } from './src/screens/NearbyScreen';
import { PlaceDetailScreen } from './src/screens/PlaceDetailScreen';
import { DietProfileScreen } from './src/screens/DietProfileScreen';
import { PreferencesProvider, usePreferences } from './src/state/PreferencesContext';
import { useTheme } from './src/ui/theme';
import type { RootStackParamList } from './src/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

function Router() {
  const theme = useTheme();
  const { preferences, loading } = usePreferences();

  const navTheme: NavTheme = {
    ...(theme.dark ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.dark ? DarkTheme : DefaultTheme).colors,
      background: theme.background,
      card: theme.surface,
      text: theme.text,
      border: theme.border,
      primary: theme.accent,
    },
  };

  // Hold the first frame until we know whether this person has a profile yet,
  // so nobody sees the onboarding screen flash over their saved requirements.
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName={preferences.onboarded ? 'Nearby' : 'DietProfile'}
        screenOptions={{ headerLargeTitle: false, headerTintColor: theme.accent }}
      >
        <Stack.Screen name="Nearby" component={NearbyScreen} options={{ headerShown: false }} />
        <Stack.Screen
          name="PlaceDetail"
          component={PlaceDetailScreen}
          options={{ title: '', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="DietProfile"
          component={DietProfileScreen}
          initialParams={{ onboarding: !preferences.onboarded }}
          options={({ route }) => ({
            title: route.params?.onboarding ? '' : 'Your requirements',
            headerShown: !route.params?.onboarding,
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PreferencesProvider>
        <StatusBar style="auto" />
        <Router />
      </PreferencesProvider>
    </SafeAreaProvider>
  );
}
