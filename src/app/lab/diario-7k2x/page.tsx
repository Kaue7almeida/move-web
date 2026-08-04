import type { Metadata } from "next";

import { DiaryLab } from "./_components/DiaryLab";
import "./lab.css";

/**
 * Diário Alimentar — LAB.
 *
 * Protótipo 100% mocado do módulo de diário calórico (docs/diario-alimentar/).
 * Intencionalmente sem nenhum link/gatilho no app: só é acessível por URL direta.
 * Nada aqui chama banco, IA ou API — todo o estado vive no navegador.
 *
 * Para trocar a URL secreta, basta renomear a pasta `diario-7k2x`.
 */

export const metadata: Metadata = {
  title: "Diário — Lab",
  robots: { index: false, follow: false },
};

export default function DiaryLabPage() {
  return <DiaryLab />;
}
