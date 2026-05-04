/**
 * Onboarding store — Zustand.
 * Holds the in-flight age + avatar selection across the 3 onboarding screens.
 * Cleared when the flow completes (saved to profile via auth.saveChildInfo).
 */
import { create } from 'zustand';

interface OnboardingState {
  age:         number | null;
  avatarEmoji: string;
  setAge:      (age: number) => void;
  setAvatar:   (emoji: string) => void;
  reset:       () => void;
}

const DEFAULT_AVATAR = '🦁';

export const useOnboarding = create<OnboardingState>((set) => ({
  age:         null,
  avatarEmoji: DEFAULT_AVATAR,
  setAge:      (age)   => set({ age }),
  setAvatar:   (emoji) => set({ avatarEmoji: emoji }),
  reset:       ()      => set({ age: null, avatarEmoji: DEFAULT_AVATAR }),
}));
