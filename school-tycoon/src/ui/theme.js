// Light, friendly school palette: chalkboard green, school-bus yellow, paper white.
import { StyleSheet } from 'react-native';

export const colors = {
  chalk: '#2F5D50',
  chalkDark: '#234840',
  chalkLight: '#E3EFEA',
  bus: '#FFC72C',
  busDark: '#E0A800',
  busLight: '#FFF1C2',
  paper: '#FFFBF0',
  paperDark: '#F3ECDA',
  ink: '#1F2A2E',
  inkSoft: '#4A585C',
  muted: '#77858A',
  line: '#E2DAC6',
  good: '#2E9E5B',
  goodLight: '#DDF3E5',
  bad: '#D64545',
  badLight: '#FBE2E2',
  info: '#3A6EA5',
  white: '#FFFFFF',
  backdrop: 'rgba(20,30,28,0.55)',
};

export const font = {
  tiny: 12,
  small: 13,
  body: 15,
  big: 18,
  title: 22,
  hero: 30,
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const radius = { sm: 8, md: 12, lg: 18, pill: 999 };

/** Minimum touch target (dp) for every pressable. */
export const MIN_TOUCH = 40;
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

export const shared = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sectionTitle: {
    fontSize: font.big,
    fontWeight: '800',
    color: colors.chalk,
    marginTop: space.md,
    marginBottom: space.sm,
  },
  body: { fontSize: font.body, color: colors.ink },
  small: { fontSize: font.small, color: colors.inkSoft },
  tiny: { fontSize: font.tiny, color: colors.muted },
});
