import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';
import { PHOTOS_BUCKET, SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from './supabase';

/**
 * Comprime a foto e envia-a para o bucket "photos" do Supabase Storage.
 * Devolve o link público.
 *
 * Lança erro em vez de devolver null: uma encomenda gravada com o caminho
 * local da foto ficava com a imagem partida para sempre.
 */
export async function uploadPhoto(uri: string): Promise<string> {
  if (/^https?:\/\//i.test(uri)) return uri;

  let compressedUri: string;
  try {
    const result = await manipulateAsync(uri, [{ resize: { width: 1200 } }], {
      compress: 0.7,
      format: SaveFormat.JPEG,
    });
    compressedUri = result.uri;
  } catch {
    throw new Error('Não foi possível preparar a foto.');
  }

  const fileName = `orders/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

  if (Platform.OS === 'web') {
    const blob = await (await fetch(compressedUri)).blob();
    const { error } = await supabase.storage.from(PHOTOS_BUCKET).upload(fileName, blob, { contentType: 'image/jpeg' });
    if (error) throw new Error('Não foi possível enviar a foto.');
  } else {
    let result: FileSystem.FileSystemUploadResult;
    try {
      result = await FileSystem.uploadAsync(`${SUPABASE_URL}/storage/v1/object/${PHOTOS_BUCKET}/${fileName}`, compressedUri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'image/jpeg',
        },
      });
    } catch {
      throw new Error('Não foi possível enviar a foto. Verifica a ligação.');
    }
    if (result.status !== 200 && result.status !== 201) {
      throw new Error(`Não foi possível enviar a foto (erro ${result.status}).`);
    }
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${PHOTOS_BUCKET}/${fileName}`;
}
