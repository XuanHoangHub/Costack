import AsyncStorage from '@react-native-async-storage/async-storage';
import { StateStorage } from 'zustand/middleware';

const memoryCache = new Map<string, string>();

export const safeAsyncStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const val = await AsyncStorage.getItem(name);
      if (val !== null && val !== undefined) return val;
      return memoryCache.get(name) || null;
    } catch {
      return memoryCache.get(name) || null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      memoryCache.set(name, value);
      await AsyncStorage.setItem(name, value);
    } catch {
      memoryCache.set(name, value);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      memoryCache.delete(name);
      await AsyncStorage.removeItem(name);
    } catch {
      memoryCache.delete(name);
    }
  },
};
