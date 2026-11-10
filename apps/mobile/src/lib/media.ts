import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export function fileSize(uri: string): number | undefined {
  try {
    const file = new File(uri);
    return file.exists ? file.size : undefined;
  } catch {
    return undefined;
  }
}

// Copies a file out of the temporary cache, so a saved draft survives app restarts
export function keepFile(uri: string): string {
  try {
    const dir = new Directory(Paths.document, 'drafts');
    if (!dir.exists) dir.create({ intermediates: true });
    const source = new File(uri);
    const target = new File(dir, source.name);
    if (!target.exists) source.copy(target);
    return target.uri;
  } catch {
    return uri; // fall back to the original file
  }
}

// Smaller photo for slow connections. Re-saving also removes hidden data such as GPS (EXIF).
export async function compressPhoto(uri: string) {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: 1600 });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
  return { uri: keepFile(saved.uri), sizeBytes: fileSize(saved.uri) };
}