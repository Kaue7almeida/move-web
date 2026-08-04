import { Camera, LineChart, Ruler } from "lucide-react";

import {
  Canvas,
  DomainPill,
  Eyebrow,
  FeatureChip,
  Glow,
  ScanCard,
  Wordmark,
} from "../marketing-ui";

/**
 * Peça 4 — Post de feature 1080x1080 (MoveScan).
 * Mensagem: evolução visível — composição corporal estimada a partir de duas fotos.
 */
export default function FeaturePage() {
  return (
    <Canvas width={1080} height={1080}>
      <Glow className="-top-[300px] right-[-160px] h-[880px] w-[880px]" />
      <Glow className="bottom-[-280px] left-[-240px] h-[820px] w-[820px]" />

      <div className="absolute left-[76px] top-[72px]">
        <Wordmark size={46} />
      </div>

      <div className="absolute left-[76px] top-[196px] w-[420px]">
        <Eyebrow size={23}>MoveScan</Eyebrow>
        <h1 className="mt-7 font-display text-[72px] font-semibold leading-[0.98] tracking-[-0.05em] text-white">
          A evolução que você enxerga.
        </h1>
        <p className="mt-8 text-[26px] leading-[1.45] text-white/65">
          Composição corporal estimada a partir de duas fotos, com comparação entre scans.
        </p>
      </div>

      <div className="absolute left-[76px] top-[656px] flex w-[420px] flex-wrap gap-3">
        <FeatureChip icon={Camera} label="Foto frontal + lateral" size={21} />
        <FeatureChip icon={LineChart} label="Comparação entre scans" size={21} />
        <FeatureChip icon={Ruler} label="Métricas e medidas" size={21} />
      </div>

      <div className="absolute bottom-[84px] left-[76px]">
        <DomainPill size={30} />
      </div>

      <div className="absolute right-[64px] top-[250px]">
        <ScanCard zoom={1.15} />
      </div>
    </Canvas>
  );
}
