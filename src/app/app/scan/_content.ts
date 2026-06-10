import type { LucideIcon } from "lucide-react";
import { Activity, Camera, Flame, Percent, Ruler, Scale, Sparkles } from "lucide-react";

/**
 * Real copy/constants for the Scan screens (disclaimer, wizard steps, prep
 * guidance, discover list, asset URLs). No mock result data lives here.
 */

/** Fixed disclaimer copy reused across the Scan module (estimate, not clinical). */
export const SCAN_DISCLAIMER =
  "O Move Scan é uma estimativa de composição corporal a partir de fotos e dos seus dados. Não é um diagnóstico clínico.";

export type ScanHowStep = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export const SCAN_HOW_IT_WORKS: ScanHowStep[] = [
  {
    title: "Preencha seus dados",
    description: "Peso, altura, idade e sexo para calibrar a estimativa.",
    icon: Ruler,
  },
  {
    title: "Tire 2 fotos",
    description: "Uma frontal e uma lateral, seguindo a silhueta-guia.",
    icon: Camera,
  },
  {
    title: "Receba sua análise",
    description: "Composição corporal estimada e medidas, em segundos.",
    icon: Sparkles,
  },
];

export type ScanDiscoverItem = {
  label: string;
  icon: LucideIcon;
};

export const SCAN_DISCOVER: ScanDiscoverItem[] = [
  { label: "Percentual de gordura", icon: Percent },
  { label: "Massa magra e massa gorda", icon: Scale },
  { label: "IMC e taxa metabólica (TMB)", icon: Flame },
  { label: "Medidas e proporção (WHR)", icon: Activity },
];

/** Pre-capture quality guidance shown alongside each photo step. */
export const SCAN_QUALITY_TIPS: string[] = [
  "Boa iluminação, sem contraluz",
  "Roupa justa ou de treino",
  "Fundo neutro e liso",
  "Corpo inteiro dentro do quadro",
];

// ---------------------------------------------------------------------------
// Scan tutorial asset URLs
//
// Current source: Bubble CDN (working via CSS background-image, no CORS issue).
// Target: Supabase Storage bucket "scan-assets" (public, created in migration
//   20260601140000_scan_assets_public_bucket.sql).
//
// To migrate: upload the 10 files below to the bucket path "tutorial/" using
//   the Supabase Dashboard, CLI (`supabase storage cp`), or JS SDK, then
//   replace SCAN_ASSET_BASE with SCAN_STORAGE_BASE below.
//
// Supabase Storage paths once uploaded:
//   tutorial/correct-clothing.jpg   tutorial/incorrect-clothing.jpg
//   tutorial/correct-space.jpg      tutorial/incorrect-space.jpg
//   tutorial/correct-scan.jpg       tutorial/incorrect-scan.jpg
//   tutorial/correct-posture.jpg    tutorial/incorrect-posture.jpg
//   tutorial/front.jpg              tutorial/profile.jpg
// ---------------------------------------------------------------------------

// const SCAN_STORAGE_BASE =
//   "https://uyrmisvrtvuwxgyrglgh.supabase.co/storage/v1/object/public/scan-assets";

const SCAN_ASSET_BASE = "https://65d19deb8d609974eb04c431771ede87.cdn.bubble.io";

export type ScanPrepTopic = {
  key: string;
  title: string;
  description: string;
  correctImageUrl: string;
  incorrectImageUrl: string;
};

export type ScanPhotoGuide = {
  slot: "front" | "side";
  title: string;
  instruction: string;
  imageUrl: string;
};

export type ScanPrepItem =
  | { kind: "compare"; topic: ScanPrepTopic }
  | { kind: "guide"; guide: ScanPhotoGuide };

const SCAN_PREP_TOPICS: ScanPrepTopic[] = [
  {
    key: "clothing",
    title: "Vestimenta adequada",
    description: "Use roupa justa ou de treino. Evite peças largas que escondem o contorno do corpo.",
    correctImageUrl: `${SCAN_ASSET_BASE}/f1757908929102x633527545342246900/correct-clothing.jpg`,
    incorrectImageUrl: `${SCAN_ASSET_BASE}/f1757909204855x490060997712388860/incorrect-clothing.jpg`,
  },
  {
    key: "space",
    title: "Espaço livre",
    description: "Escolha um ambiente amplo e desimpedido, sem objetos ou pessoas atrás de você.",
    correctImageUrl: `${SCAN_ASSET_BASE}/f1757985411292x941099004654597100/correct-space.jpg`,
    incorrectImageUrl: `${SCAN_ASSET_BASE}/f1757985427181x971434634207433100/incorrect-space.jpg`,
  },
  {
    key: "support",
    title: "Suporte do celular",
    description: "Apoie o celular firme, na altura do quadril e levemente inclinado para trás.",
    correctImageUrl: `${SCAN_ASSET_BASE}/f1757985505928x602058658302666400/correct-scan.jpg`,
    incorrectImageUrl: `${SCAN_ASSET_BASE}/f1757985511842x472085094842136240/incorrect-scan.jpg`,
  },
  {
    key: "posture",
    title: "Postura ereta",
    description: "Fique ereto, com ombros relaxados e olhar à frente, sem inclinar o tronco.",
    correctImageUrl: `${SCAN_ASSET_BASE}/f1757985567570x559880946635521660/correct-posture.jpg`,
    incorrectImageUrl: `${SCAN_ASSET_BASE}/f1757985572964x910394827183525000/incorrect-posture.jpg`,
  },
];

const SCAN_PHOTO_GUIDES_LIST: Record<"front" | "side", ScanPhotoGuide> = {
  front: {
    slot: "front",
    title: "Foto frontal",
    instruction:
      "Mantenha-se ereto, de frente para a câmera, pés afastados e braços afastados do tronco.",
    imageUrl: `${SCAN_ASSET_BASE}/f1757985703756x811836634931044400/front.jpg`,
  },
  side: {
    slot: "side",
    title: "Foto lateral",
    instruction:
      "Vire-se para sua esquerda, mostrando o lado direito para a câmera. Estenda o braço da frente na altura do ombro e mantenha a outra perna e braço escondidos atrás do corpo.",
    imageUrl: `${SCAN_ASSET_BASE}/f1757985772238x521292801594365000/profile.jpg`,
  },
};

/** Unified 6-step prep sequence: 4 compare cards + 2 photo guides. */
export const SCAN_PREP_ITEMS: ScanPrepItem[] = [
  { kind: "compare", topic: SCAN_PREP_TOPICS[0] },
  { kind: "compare", topic: SCAN_PREP_TOPICS[1] },
  { kind: "compare", topic: SCAN_PREP_TOPICS[2] },
  { kind: "compare", topic: SCAN_PREP_TOPICS[3] },
  { kind: "guide", guide: SCAN_PHOTO_GUIDES_LIST.front },
  { kind: "guide", guide: SCAN_PHOTO_GUIDES_LIST.side },
];

export const SCAN_WIZARD_STEPS = [
  { key: "consent", title: "Privacidade" },
  { key: "prep", title: "Preparação" },
  { key: "data", title: "Seus dados" },
  { key: "photo_front", title: "Foto frontal" },
  { key: "photo_side", title: "Foto lateral" },
  { key: "review", title: "Revisão" },
  { key: "processing", title: "Processando" },
] as const;

export type ScanWizardStepKey = (typeof SCAN_WIZARD_STEPS)[number]["key"];
