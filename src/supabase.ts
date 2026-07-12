import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL      = process.env.EXPO_PUBLIC_SUPABASE_URL      ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage:            Platform.OS !== 'web' ? AsyncStorage : undefined,
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB per user

async function getUserStorageBytes(userId: string): Promise<number> {
  let total = 0;
  let offset = 0;
  const pageSize = 100;
  while (true) {
    const { data, error } = await supabase.storage
      .from('section-images')
      .list(userId, { limit: pageSize, offset });
    if (error || !data?.length) break;
    for (const file of data) total += (file.metadata?.size ?? 0);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return total;
}

export async function uploadSectionImage(localUri: string, userId: string): Promise<string> {
  const ext = (localUri.split('.').pop()?.split('?')[0]?.toLowerCase()) ?? 'jpg';
  const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
  const path = `${userId}/${Date.now()}.${ext}`;

  const arrayBuffer = await fetch(localUri).then(r => r.arrayBuffer());

  const usedBytes = await getUserStorageBytes(userId);
  if (usedBytes + arrayBuffer.byteLength > STORAGE_LIMIT_BYTES) {
    throw new Error('STORAGE_LIMIT_EXCEEDED');
  }

  const { error } = await supabase.storage
    .from('section-images')
    .upload(path, arrayBuffer, { contentType, upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from('section-images').getPublicUrl(path);
  return data.publicUrl;
}
