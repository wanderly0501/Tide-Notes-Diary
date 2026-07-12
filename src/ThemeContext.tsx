import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeColors, ColorsType, Palette } from './theme';

interface ThemeCtx {
  C: ColorsType;
  darkMode: boolean;
  palette: Palette;
  setDarkMode(v: boolean): void;
  setPalette(v: Palette): void;
}

const Ctx = createContext<ThemeCtx>(null!);

async function load(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return localStorage.getItem(key);
  return AsyncStorage.getItem(key);
}

async function save(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') { localStorage.setItem(key, value); return; }
  await AsyncStorage.setItem(key, value);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkModeState] = useState(false);
  const [palette, setPaletteState]   = useState<Palette>('blue');

  useEffect(() => {
    Promise.all([load('tide_dark'), load('tide_palette')]).then(([dark, pal]) => {
      if (dark === 'true') setDarkModeState(true);
      if (pal === 'pink')  setPaletteState('pink');
    });
  }, []);

  const setDarkMode = (v: boolean) => { setDarkModeState(v); save('tide_dark', String(v)); };
  const setPalette  = (v: Palette) => { setPaletteState(v);  save('tide_palette', v); };

  const value = useMemo<ThemeCtx>(() => ({
    C: makeColors(darkMode, palette),
    darkMode, palette, setDarkMode, setPalette,
  }), [darkMode, palette]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() { return useContext(Ctx); }
