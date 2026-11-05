import { HistoryItem } from '../types';

const STORAGE_KEY = 'visionriders_detection_history';

export const historyStorage = {
  getAll(): HistoryItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data) as HistoryItem[];
    } catch (e) {
      console.error('Failed to parse detection history:', e);
      return [];
    }
  },

  add(item: Omit<HistoryItem, 'id' | 'timestamp'>): HistoryItem {
    const history = this.getAll();
    const newItem: HistoryItem = {
      ...item,
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };

    // Prepend to newest first, keep last 50 items
    const updated = [newItem, ...history].slice(0, 50);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('LocalStorage limit reached when saving detection history:', err);
    }
    return newItem;
  },

  delete(id: string): void {
    const history = this.getAll().filter((item) => item.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (err) {
      console.error('Failed to update history:', err);
    }
  },

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  },
};

