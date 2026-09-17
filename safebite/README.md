# SafeBite

Find places nearby that can actually feed you.

If you are coeliac, vegan, halal, or allergic to nuts, "where shall we eat?" is not a
five-second question. It is cross-referencing a map against a dozen menus and a
review search. SafeBite answers it in one screen: **what is near me, right now,
that caters for what I can't eat.**

## How it works

1. You pick your requirements once. They are stored on the device and never leave it.
2. The app takes your location and asks OpenStreetMap what food venues are within
   your chosen radius.
3. Every venue is scored against every requirement you set, and the list is sorted
   by how confident that score is — not just by distance.

### Why OpenStreetMap

It is the only free, key-less source that records dietary suitability as structured
data. OSM contributors tag venues with `diet:vegan`, `diet:gluten_free`,
`diet:halal`, `diet:kosher`, `diet:vegetarian` and `diet:lactose_free`, each set to
`only`, `yes`, `limited` or `no`. That is exactly the question this app asks, so no
guessing from cuisine names or review text is needed where a venue is tagged.

Coverage is uneven — dense in European cities, thin elsewhere. The app is explicit
about that rather than papering over it (see *Honesty about data*).

## Honesty about data

The verdict on each card says where its confidence came from:

| Verdict | Meaning |
| --- | --- |
| **Entirely suitable** | The whole venue is tagged as suitable (`diet:x=only`) |
| **Caters for you** | Tagged as catering for this (`diet:x=yes`) |
| **A few options** | Tagged as having some options (`diet:x=limited`) |
| **Usually caters** | Untagged, but this cuisine normally caters for it |
| **Not recorded** | Nothing is known either way |
| **Probably not** | Untagged, and this cuisine rarely caters for it |
| **Not suitable** | Tagged as not catering for this (`diet:x=no`) |

Three rules keep this from becoming dangerous:

- **The weakest link wins.** A place scores as its *worst* requirement, because one
  unmet requirement ruins the meal.
- **Allergies always prompt a staff check**, however good the tag. Cross-contamination
  is invisible in map data.
- **Unknown is never reported as safe.** If the opening hours can't be parsed, the app
  says "hours unknown" rather than guessing. The same goes for nut-free, which has no
  OSM tag at all — the app says so on the picker rather than implying it knows.

## Running it

```bash
npm install
npm start          # then scan the QR code with Expo Go
npm test           # 61 unit tests over the matching, ranking and parsing logic
npm run typecheck
```

`npm run ios` / `npm run android` need a simulator; Expo Go on a real phone is the
quickest way to see it, and the only way to test the GPS behaviour properly.

## Shipping to the App Store

The project is configured for [EAS Build](https://docs.expo.dev/build/introduction/),
which builds and submits from any machine — a Mac is not required:

```bash
npm install -g eas-cli
eas login
eas build --platform ios --profile production
eas submit --platform ios
```

Before the first submission you will need:

- An Apple Developer Program membership (£79/year).
- A real bundle identifier. `com.safebite.app` in `app.json` is a placeholder — change
  it to something you own before the first build, as it cannot be changed afterwards.
- App icons and screenshots. The Expo defaults in `assets/` are placeholders.
- A privacy policy URL. The only sensitive data is location, it is used solely to run
  the nearby query, and it is never transmitted anywhere but the Overpass API — which
  makes for a short and honest policy.
- `NSLocationWhenInUseUsageDescription` is already set via the `expo-location` plugin
  in `app.json`; App Review rejects vague wording here, so keep it specific.

## Layout

```
src/
  diet/      diets.ts        the requirements and what OSM knows about each
             match.ts        scoring a venue against requirements  ← the core logic
  data/      overpass.ts     Overpass query building, fetching, parsing
             search.ts       distance, filtering and ranking
             types.ts
  lib/       geo.ts          haversine distance, walking times
             hours.ts        partial `opening_hours` parser
             storage.ts      preference persistence
  hooks/     useLocation.ts  GPS permission and position
             useNearbyPlaces.ts
  state/     PreferencesContext.tsx
  screens/   NearbyScreen, PlaceDetailScreen, DietProfileScreen
  ui/        theme.ts (light + dark) and components
```

Business logic is kept free of React Native imports so it can be tested in plain Node.

## Known gaps

- **Not validated against the live Overpass API.** The development container's network
  policy blocks `overpass-api.de`, so the query builder and parser are covered by unit
  tests against recorded response shapes, but no end-to-end call has been made. Run it
  on a phone as the first check.
- **No map view.** The list is sorted by distance and each place links out to the
  system maps app. A map is the obvious next screen.
- **No search or filter by cuisine**, and no way to save favourites.
- **`opening_hours` parsing is partial** by design — it returns "unknown" for the more
  exotic grammar rather than risking a wrong answer.
- **Nut-free and other allergies have no data source.** Ranking by cuisine risk is the
  honest limit of what is possible today; a crowd-sourced layer of user reports is the
  real fix, and would be the app's strongest moat.
