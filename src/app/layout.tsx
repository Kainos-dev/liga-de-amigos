import type { Metadata, Viewport } from "next";
import { Inter, Outfit, Bangers } from "next/font/google";
import { Fondo } from "@/components/fondo";
import "./globals.css";

// next/font descarga las fuentes en el build y las sirve desde el propio sitio
// (sin pedidos a Google en runtime). Cada una expone una variable CSS que
// globals.css convierte en las clases font-display, font-heading y font-sans.

// Bangers no es variable: hay que indicar el peso (solo existe 400).
const bangers = Bangers({
  variable: "--fuente-bangers",
  weight: "400",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--fuente-outfit",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--fuente-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Liga de Amigos",
  description: "Registrá las juntadas de tu grupo y competí en la liga de amigos.",
};

export const viewport: Viewport = {
  themeColor: "#310e3f",
  // Deja usar el área de la "isla" y la barra de gestos del celular: la barra
  // inferior del grupo se corre con env(safe-area-inset-bottom).
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`dark ${bangers.variable} ${outfit.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="isolate flex min-h-full flex-col">
        <Fondo />
        {children}
      </body>
    </html>
  );
}
