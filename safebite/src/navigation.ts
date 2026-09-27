import type { RankedPlace } from './data/search';

export type RootStackParamList = {
  Nearby: undefined;
  PlaceDetail: { entry: RankedPlace };
  DietProfile: { onboarding?: boolean } | undefined;
};
