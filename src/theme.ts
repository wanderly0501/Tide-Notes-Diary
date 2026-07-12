export type ColorsType = {
  bg: string; sidebarBg: string; tagsSidebarBg: string;
  card: string; surface: string;
  border: string; borderLight: string;
  primary: string; primaryLight: string; primaryHover: string;
  text: string; textBody: string; textMuted: string; textLabel: string;
  tagBg: string; tagText: string;
  toolbar: string; toolbarHover: string;
  today: string; todayBar: string; todayText: string;
  buttonBlue: string; buttonBlueBg: string;
  pinkText: string; pinkSoft: string; pinkBar: string;
  bullet: string; white: string; success: string;
};

export type Palette = 'blue' | 'pink';

const BLUE_LIGHT: ColorsType = {
  bg: '#edf0f6', sidebarBg: '#eef1f8', tagsSidebarBg: '#ebeff8',
  card: '#fdfdfe', surface: '#ffffff',
  border: '#d8dde9', borderLight: '#e1e5f1',
  primary: '#002FA7', primaryLight: '#e4e9f6', primaryHover: '#d4ddf2',
  text: '#20242f', textBody: '#383d4b', textMuted: '#98a0b4', textLabel: '#6f7588',
  tagBg: '#eaeef8', tagText: '#5a6072',
  toolbar: '#f4f6fc', toolbarHover: '#e2e8f7',
  today: '#e4e9f8', todayBar: '#7b9de0', todayText: '#3a5db0',
  buttonBlue: '#4a7be0', buttonBlueBg: '#dce6f7',
  pinkText: '#9c6a70', pinkSoft: '#f4e2e2', pinkBar: '#d99ba2',
  bullet: '#94a0c4', white: '#ffffff', success: '#15803d',
};

const PINK_LIGHT: ColorsType = {
  bg: '#f5eef3', sidebarBg: '#f4ecf2', tagsSidebarBg: '#f2eaf1',
  card: '#fefcfd', surface: '#ffffff',
  border: '#e6d4de', borderLight: '#eedce8',
  primary: '#8c3457', primaryLight: '#f5e0ec', primaryHover: '#f0d4e6',
  text: '#2e1e28', textBody: '#44303a', textMuted: '#a0889a', textLabel: '#85707a',
  tagBg: '#f2e2ec', tagText: '#705060',
  toolbar: '#faf3f7', toolbarHover: '#f4e4ef',
  today: '#f2e0ec', todayBar: '#c87898', todayText: '#9c3a68',
  buttonBlue: '#bf607e', buttonBlueBg: '#f5e0ea',
  pinkText: '#9c6a70', pinkSoft: '#f4e2e2', pinkBar: '#d99ba2',
  bullet: '#b498a8', white: '#ffffff', success: '#15803d',
};

const BLUE_DARK: ColorsType = {
  bg: '#141921', sidebarBg: '#171d2a', tagsSidebarBg: '#151b28',
  card: '#1c2338', surface: '#222a42',
  border: '#28304e', borderLight: '#222946',
  primary: '#7498f0', primaryLight: '#1a2444', primaryHover: '#1e2848',
  text: '#e2e6f2', textBody: '#b0bad0', textMuted: '#565e78', textLabel: '#707898',
  tagBg: '#1c2848', tagText: '#7a8ab8',
  toolbar: '#181d2e', toolbarHover: '#1e2640',
  today: '#1c2848', todayBar: '#4a6ab4', todayText: '#7898e0',
  buttonBlue: '#5878e0', buttonBlueBg: '#1a284a',
  pinkText: '#c898a8', pinkSoft: '#2c1e24', pinkBar: '#8a5060',
  bullet: '#3a4268', white: '#ffffff', success: '#2d9e5a',
};

const PINK_DARK: ColorsType = {
  bg: '#1e1520', sidebarBg: '#1c131e', tagsSidebarBg: '#1a121c',
  card: '#261a2a', surface: '#301e38',
  border: '#3a2840', borderLight: '#2e2038',
  primary: '#d07898', primaryLight: '#381a30', primaryHover: '#3c1e34',
  text: '#ecdce8', textBody: '#c0a8bc', textMuted: '#68505e', textLabel: '#806070',
  tagBg: '#381a32', tagText: '#9870a0',
  toolbar: '#1e1422', toolbarHover: '#2a1a30',
  today: '#381a32', todayBar: '#9a4870', todayText: '#d07898',
  buttonBlue: '#be6080', buttonBlueBg: '#381828',
  pinkText: '#c898a0', pinkSoft: '#301820', pinkBar: '#885060',
  bullet: '#644258', white: '#ffffff', success: '#2d9e5a',
};

export function makeColors(dark: boolean, palette: Palette): ColorsType {
  if (!dark && palette === 'blue') return BLUE_LIGHT;
  if (!dark && palette === 'pink') return PINK_LIGHT;
  if (dark  && palette === 'blue') return BLUE_DARK;
  return PINK_DARK;
}

// Static default (used as fallback and for non-themed contexts)
export const C = BLUE_LIGHT;
export const R = { sm: 6, md: 8, lg: 11, xl: 16, pill: 999 };
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 };
