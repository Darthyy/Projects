import { useColorScheme } from 'react-native';
import type { Verdict } from '../diet/match';

export interface Theme {
  dark: boolean;
  background: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentText: string;
  danger: string;
  warning: string;
}

const light: Theme = {
  dark: false,
  background: '#F6F7F5',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  border: '#E3E5DF',
  text: '#16201A',
  textMuted: '#5C6660',
  textFaint: '#8D9691',
  accent: '#1F7A4D',
  accentText: '#FFFFFF',
  danger: '#B3261E',
  warning: '#8A5A00',
};

const dark: Theme = {
  dark: true,
  background: '#0F1411',
  surface: '#171E1A',
  surfaceRaised: '#1F2823',
  border: '#2C352F',
  text: '#ECF1ED',
  textMuted: '#A3ADA7',
  textFaint: '#78827C',
  accent: '#54C68B',
  accentText: '#08150E',
  danger: '#F2837B',
  warning: '#E0AE5A',
};

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export interface VerdictStyle {
  /** Background of the badge. */
  background: string;
  /** Text and icon colour on that background. */
  foreground: string;
  icon: string;
}

/**
 * Verdict colours carry meaning, so they are also separated by icon and label —
 * colour alone would fail anyone who cannot distinguish green from amber.
 */
export function verdictStyle(verdict: Verdict, theme: Theme): VerdictStyle {
  const palette: Record<Verdict, [string, string, string]> = theme.dark
    ? {
        dedicated: ['#14442C', '#7FE0AB', '★'],
        confirmed: ['#123A28', '#63D39A', '✓'],
        limited: ['#3A3216', '#E3C46A', '~'],
        likely: ['#1C3242', '#7FBEE0', '≈'],
        unknown: ['#242C27', '#A3ADA7', '?'],
        unlikely: ['#3A2A18', '#E0A377', '!'],
        unsuitable: ['#42201D', '#F2837B', '✕'],
      }
    : {
        dedicated: ['#D8F2E3', '#0E5434', '★'],
        confirmed: ['#DFF3E7', '#166B42', '✓'],
        limited: ['#FAF0D4', '#7A5D10', '~'],
        likely: ['#DEEDF7', '#155273', '≈'],
        unknown: ['#ECEEEB', '#5C6660', '?'],
        unlikely: ['#FBE7D8', '#8A4A18', '!'],
        unsuitable: ['#FBE0DE', '#8C1D18', '✕'],
      };

  const [background, foreground, icon] = palette[verdict];
  return { background, foreground, icon };
}
