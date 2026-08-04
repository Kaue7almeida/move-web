import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * Área interna de marketing — páginas em pixel fixo usadas apenas para
 * compor e exportar as peças de divulgação em PNG. Fora do produto:
 * sem indexação e sem link a partir do app.
 */
export const metadata: Metadata = {
  title: "Kit de marketing",
  robots: { index: false, follow: false },
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Esconde o indicador de dev do Next para a captura ficar limpa */}
      <style>{`nextjs-portal { display: none; }`}</style>
      {children}
    </>
  );
}
