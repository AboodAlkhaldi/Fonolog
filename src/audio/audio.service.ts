/**
 * Audio service — TTS playback + mic recording.
 *
 * Uses expo-audio (the new SDK 55+ API).
 *
 * Public API:
 *   playWordAudio(audioUrl)   — play a word's TTS mp3
 *   stopAll()                  — stop any current playback
 *   recordOnce(maxMs)          — record from mic, return blob URI
 */
import {
  AudioModule,
  createAudioPlayer,
  AudioPlayer,
  setAudioModeAsync,
  useAudioRecorder,
  RecordingPresets,
} from 'expo-audio';

let currentPlayer: AudioPlayer | null = null;

/** Initialize audio mode once at app startup. */
export async function initAudio(): Promise<void> {
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording:   true,
      shouldPlayInBackground: false,
    });
  } catch (e) {
    console.warn('[audio] setAudioModeAsync failed', e);
  }
}

/** Request microphone permission (call before recording). */
export async function requestMicPermission(): Promise<boolean> {
  const { granted } = await AudioModule.requestRecordingPermissionsAsync();
  return granted;
}

/**
 * Play a word's TTS audio from a URL. Stops any current playback first.
 * Returns when playback ends OR a new playback starts.
 */
export async function playWordAudio(audioUrl: string | null | undefined): Promise<void> {
  if (!audioUrl) return;
  await stopAll();
  try {
    const player = createAudioPlayer({ uri: audioUrl });
    currentPlayer = player;
    player.play();
  } catch (e) {
    console.warn('[audio] play failed', e);
  }
}

/** Stop and release any currently-playing player. */
export async function stopAll(): Promise<void> {
  if (currentPlayer) {
    try {
      currentPlayer.pause();
      currentPlayer.remove();
    } catch { /* ignore */ }
    currentPlayer = null;
  }
}

/** Re-export the recorder hook so screens can use it directly. */
export { useAudioRecorder, RecordingPresets };
