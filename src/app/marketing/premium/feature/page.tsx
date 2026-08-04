import { Camera, LineChart, TrendingDown } from "lucide-react";

import {
  Canvas,
  DomainPill,
  FeatureChip,
  FloatingCard,
  Glow,
  Headline,
  HeroStat,
  Kicker,
  Mark,
  ScanResultCard,
  Wordmark,
} from "../premium-ui";

/**
 * Peça 4 — Post de feature 1080x1080 (MoveScan).
 * Tema: evolução em números. Direção: número-herói do delta de gordura +
 * card de resultado real do Scan inclinado + chip de destaque.
 */
export default function PremiumFeaturePage() {
  return (
    <Canvas width={1080} height={1080}>
      <Glow className="-top-[260px] right-[-120px] h-[860px] w-[860px]" intensity={0.24} />
      <Glow className="bottom-[-300px] left-[-220px] h-[820px] w-[820px]" intensity={0.18} />

      <div className="absolute left-[78px] top-[80px]">
        <Wordmark size={40} />
      </div>

      <div className="absolute left-[78px] top-[214px] w-[520px]">
        <Kicker size={20}>MoveScan</Kicker>
        <Headline size={84} className="mt-6">
          Sua evolução,
          <br />
          <Mark>medida.</Mark>
        </Headline>
      </div>

      {/* Número-herói: delta de gordura vs. scan anterior */}
      <div className="absolute left-[78px] top-[556px]">
        <p className="mb-3 text-[16px] font-semibold uppercase tracking-[0.18em] text-white/45">
          Gordura corporal · vs. scan anterior
        </p>
        <div className="flex items-center gap-3 text-[#22c55e]">
          <TrendingDown size={46} strokeWidth={2.4} />
          <HeroStat value="−1,2" unit="p.p." size={158} />
        </div>
        <p className="mt-5 max-w-[430px] text-[21px] leading-[1.4] text-white/55">
          Composição corporal a partir de duas fotos, comparada scan a scan.
        </p>
      </div>

      <div className="absolute bottom-[78px] left-[78px]">
        <DomainPill size={29} />
      </div>

      {/* Card de resultado */}
      <div className="absolute right-[52px] top-[214px]">
        <ScanResultCard scale={1.04} tilt="perspective(2200px) rotateY(-13deg) rotate(1.5deg)" />
      </div>

      {/* Chip flutuante */}
      <div className="absolute right-[120px] top-[742px]">
        <FloatingCard className="px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
            Massa magra
          </p>
          <p className="mt-1 font-display text-[26px] font-semibold tracking-[-0.03em] text-[#22c55e]">
            +0,8 kg
          </p>
        </FloatingCard>
      </div>

      {/* Chips de feature */}
      <div className="absolute bottom-[110px] right-[52px] flex w-[440px] flex-wrap justify-end gap-2.5">
        <FeatureChip icon={Camera} label="Frontal + lateral" size={21} />
        <FeatureChip icon={LineChart} label="Comparação entre scans" size={21} />
      </div>
    </Canvas>
  );
}
