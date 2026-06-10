import type { MetadataRoute } from "next";

/**
 * Web App Manifest do Move.
 *
 * Permite adicionar o Move a tela inicial do celular (atalho/standalone).
 * start_url aponta para /entrar: quem abre pelo icone cai no login e, com
 * sessao ativa, e redirecionado para /app pelo fluxo normal.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Move",
    short_name: "Move",
    description: "Treinos, evolução e acompanhamento em um só lugar.",
    start_url: "/entrar",
    scope: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
