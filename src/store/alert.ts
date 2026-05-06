import { create } from 'zustand';
import type { AppError } from '@/lib/error';

// ─── Inline form-error store (used by auth screens + ErrorBanner) ─────────────

interface InlineAlertState {
  error:      AppError | null;
  setAlert:   (error: AppError) => void;
  clearAlert: () => void;
}

export const useAlert = create<InlineAlertState>((set) => ({
  error:      null,
  setAlert:   (error) => set({ error }),
  clearAlert: () => set({ error: null }),
}));

// ─── Modal dialog store (replacement for Alert.alert) ────────────────────────

export interface AlertButton {
  text:     string;
  style?:   'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface ModalAlertState {
  visible:  boolean;
  title:    string;
  message:  string;
  buttons:  AlertButton[];
  show:     (title: string, message: string, buttons?: AlertButton[]) => void;
  dismiss:  () => void;
}

export const useAlertStore = create<ModalAlertState>((set) => ({
  visible:  false,
  title:    '',
  message:  '',
  buttons:  [],
  show:    (title, message, buttons = [{ text: 'Tamam' }]) =>
    set({ visible: true, title, message, buttons }),
  dismiss: () => set({ visible: false }),
}));

/** Drop-in replacement for Alert.alert — callable outside React components */
export function showAlert(
  title:    string,
  message:  string,
  buttons?: AlertButton[],
): void {
  useAlertStore.getState().show(title, message, buttons);
}
