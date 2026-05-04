/**
 * Pronunciation service — uploads recorded audio to the
 * `evaluate-pronunciation` Edge Function and returns the verdict.
 */
import * as FileSystem from 'expo-file-system';
import { supabase } from '@/lib/supabase';

export interface PronunciationResult {
  transcript: string;
  similarity: number;
  verdict:    'correct' | 'close' | 'wrong';
}

export async function evaluatePronunciation(
  recordingUri: string,
  expectedWord: string,
): Promise<PronunciationResult> {
  // Read session for the JWT
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('not signed in');

  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/evaluate-pronunciation`;

  // Build multipart body
  const form = new FormData();
  form.append('audio', {
    uri:  recordingUri,
    type: 'audio/m4a',
    name: 'recording.m4a',
  } as unknown as Blob);
  form.append('expected', expectedWord);

  const res = await fetch(url, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      // intentionally no Content-Type — fetch sets multipart boundary
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`evaluate failed: ${res.status} ${text}`);
  }

  return await res.json();
}
