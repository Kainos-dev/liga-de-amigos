import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Liga de Amigos",
    short_name: "Liga",
    description: "Registrá las juntadas de tu grupo y competí en la liga de amigos.",
    start_url: "/",
    display: "standalone",
    background_color: "#310e3f",
    theme_color: "#310e3f",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
