import { create } from 'zustand';
import type { AppError } from '@/lib/error';

interface AlertState {
  error: AppError | null;
  setAlert: (error: AppError) => void;
  clearAlert: () => void;
}

export const useAlert = create<AlertState>((set) => ({
  error: null,
  setAlert: (error) => set({ error }),
  clearAlert: () => set({ error: null }),
}));
