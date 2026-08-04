import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * Área premium do kit de marketing (rodada 2) — páginas em pixel fixo usadas
 * só para compor e exportar as peças em PNG. Fora do produto: sem indexação.
 */
export const metadata: Metadata = {
  title: "Kit de marketing — premium",
  robots: { index: false, follow: false },
};

export default function PremiumMarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`nextjs-portal { display: none; }`}</style>
      {children}
    </>
  );
}
