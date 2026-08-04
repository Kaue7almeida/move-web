import type { LucideIcon } from "lucide-react";
import { Camera, Ruler, Sun } from "lucide-react";

/**
 * Copy/constantes fixas do Diário Alimentar. Nenhum dado mock de refeição vive
 * aqui — isso fica em `_mock/diaryMock.ts`.
 */

/** Aviso reutilizado: valores são estimativa, não medição/prescrição. */
export const DIARY_DISCLAIMER =
  "Os valores do Diário são estimativas a partir de fotos e da tabela nutricional. Não substituem o acompanhamento de um nutricionista.";

export type PrepTip = {
  icon: LucideIcon;
  title: string;
  description: string;
  highlight?: boolean;
};

/** Dicas antes da foto — objeto de referência é o item de maior impacto. */
export const PREP_TIPS: PrepTip[] = [
  {
    icon: Ruler,
    title: "Objeto de referência ao lado",
    description:
      "Um talher ou a sua mão ao lado do prato calibra a escala — é o que mais aumenta a precisão.",
    highlight: true,
  },
  {
    icon: Camera,
    title: "Fotografe de cima",
    description: "Segure o celular na vertical, a 90° do prato, com o prato inteiro no quadro.",
  },
  {
    icon: Sun,
    title: "Boa iluminação",
    description: "Evite sombras fortes cobrindo parte da comida.",
  },
];

export const ORIGEM_OPTIONS = ["Caseiro", "Restaurante", "Embalado"];
export const PREPARO_OPTIONS = ["Grelhado", "Frito", "Cozido", "Assado", "Cru"];
export const ESCONDIDOS_OPTIONS = ["Óleo", "Manteiga", "Açúcar", "Molho"];
