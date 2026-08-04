import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * Campanha "Stories — Fase 1" (foco personal). Páginas em pixel fixo
 * (1080x1920) usadas só para compor e exportar as peças em PNG. Fora do
 * produto: sem indexação e sem link a partir do app.
 */
export const metadata: Metadata = {
  title: "Campanha — Stories Fase 1",
  robots: { index: false, follow: false },
};

export default function CampaignLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`nextjs-portal { display: none; }`}</style>
      {children}
    </>
  );
}
