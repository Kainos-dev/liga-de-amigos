/**
 * Achica una foto en el navegador antes de subirla: toma el cuadrado del
 * centro y lo guarda en 256x256 como JPEG (~20 KB). Así no se sube la foto
 * original de varios MB y no hace falta ninguna librería ni servicio externo.
 *
 * Solo se usa en el navegador (necesita canvas).
 */
const LADO = 256;
const CALIDAD = 0.85;
const MAXIMO_ORIGINAL = 25 * 1024 * 1024; // 25 MB: más que eso probablemente no es una foto

export async function achicarImagen(archivo: File): Promise<Blob> {
  if (!archivo.type.startsWith("image/")) {
    throw new Error("Elegí un archivo de imagen");
  }
  if (archivo.size > MAXIMO_ORIGINAL) {
    throw new Error("La imagen es demasiado grande");
  }

  let imagen: ImageBitmap;
  try {
    // createImageBitmap respeta la orientación de la foto (fotos de celular giradas).
    imagen = await createImageBitmap(archivo);
  } catch {
    throw new Error("No pudimos leer esa imagen. Probá con otra (JPG o PNG)");
  }

  const corte = Math.min(imagen.width, imagen.height);
  const x = (imagen.width - corte) / 2;
  const y = (imagen.height - corte) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = LADO;
  canvas.height = LADO;
  const contexto = canvas.getContext("2d");
  if (!contexto) throw new Error("Tu navegador no puede procesar imágenes");
  contexto.drawImage(imagen, x, y, corte, corte, 0, 0, LADO, LADO);
  imagen.close();

  return new Promise((resolver, rechazar) => {
    canvas.toBlob(
      (blob) => (blob ? resolver(blob) : rechazar(new Error("No pudimos procesar la imagen"))),
      "image/jpeg",
      CALIDAD,
    );
  });
}
