import imageCompression from 'browser-image-compression';

/**
 * Kompresuje zdjęcie i konwertuje je do formatu JPEG za pomocą WebWorkera.
 */
export async function compressAndConvertToJpeg(file: File): Promise<File> {
  const options = {
    maxSizeMB: 1,             // Maksymalna waga pliku (1 MB to bezpieczny zapas dla Vercela)
    maxWidthOrHeight: 1600,   // Rozdzielczość wystarczająca dla rozpoznawania przez Groq AI
    useWebWorker: true,       // Kompresja w osobnym wątku (aplikacja nie zatnie się na telefonie)
    fileType: 'image/jpeg'    // Wymuszenie konwersji (np. z formatu HEIC na telefonach iPhone)
  };

  try {
    const compressedBlob = await imageCompression(file, options);
    return new File([compressedBlob], 'photo.jpg', { type: 'image/jpeg' });
  } catch (error) {
    console.error('Błąd kompresji przez browser-image-compression:', error);
    throw error;
  }
}