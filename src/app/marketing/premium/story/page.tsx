import { Check } from "lucide-react";

import {
  BenefitRow,
  Canvas,
  DomainPill,
  ExecutionScreen,
  FloatingCard,
  Glow,
  Headline,
  Kicker,
  Lead,
  Mark,
  Phone,
  Wordmark,
} from "../premium-ui";

/**
 * Peça 2 — Story 1080x1920.
 * Tema: execução guiada (aluno). Direção: phone hero inclinado + recorte
 * flutuante da série concluída. Vertical, dramático, muito respiro.
 */
export default function PremiumStoryPage() {
  return (
    <Canvas width={1080} height={1920}>
      <Glow className="-top-[240px] left-[40px] h-[880px] w-[880px]" intensity={0.26} />
      <Glow className="bottom-[80px] right-[-260px] h-[820px] w-[820px]" intensity={0.2} />

      <div className="absolute left-1/2 top-[104px] -translate-x-1/2">
        <Wordmark size={44} />
      </div>

      <div className="absolute left-[84px] top-[268px]">
        <Kicker size={23}>Para quem treina</Kicker>
        <Headline size={132} className="mt-7">
          Só a
          <br />
          próxima
          <br />
          <Mark>série.</Mark>
        </Headline>
        <Lead size={31} width={760}>
          O treino do dia chega pronto e a execução é conduzida série por série. Zero decisão
          no caminho.
        </Lead>
      </div>

      {/* Phone hero */}
      <div className="absolute left-1/2 top-[892px] -translate-x-1/2">
        <Phone
          scale={1.46}
          tilt="perspective(2400px) rotateY(-11deg) rotate(-2deg)"
          style={{ transformOrigin: "top center" }}
        >
          <ExecutionScreen />
        </Phone>
      </div>

      {/* Recorte flutuante: série concluída */}
      <div className="absolute left-[80px] top-[860px]">
        <FloatingCard className="px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#22c55e]/15 text-[#22c55e]">
              <Check size={22} strokeWidth={2.6} />
            </span>
            <div>
              <p className="text-[15px] font-semibold text-white">Série concluída</p>
              <p className="text-[12px] text-white/50">2 de 3 · Supino reto</p>
            </div>
          </div>
        </FloatingCard>
      </div>

      <div className="absolute left-[84px] top-[1498px] space-y-5">
        <BenefitRow size={28}>Histórico que vira evolução</BenefitRow>
        <BenefitRow size={28}>MoveScan para ver o corpo mudar</BenefitRow>
        <BenefitRow size={28}>IA e personal no mesmo chat</BenefitRow>
      </div>

      <div className="absolute bottom-[90px] left-[84px]">
        <DomainPill size={32} />
      </div>
    </Canvas>
  );
}
