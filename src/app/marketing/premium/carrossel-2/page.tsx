import { ChevronRight } from "lucide-react";

import {
  BenefitRow,
  Canvas,
  Desktop,
  DomainPill,
  FloatingCard,
  Glow,
  Headline,
  Kicker,
  Lead,
  Mark,
  StudioMain,
  Wordmark,
} from "../premium-ui";

/**
 * Peça 5b — Carrossel 1080x1350, página 2 (personal).
 * Tema: "Para quem acompanha" — cria, aplica e acompanha na web.
 */
export default function CarrosselPersonalPage() {
  return (
    <Canvas width={1080} height={1350}>
      <Glow className="-top-[220px] right-[40px] h-[820px] w-[820px]" intensity={0.24} />
      <Glow className="bottom-[-260px] left-[-200px] h-[760px] w-[760px]" intensity={0.16} />

      <div className="absolute left-[80px] top-[82px]">
        <Wordmark size={38} />
      </div>
      <div className="absolute right-[80px] top-[92px] flex items-center gap-2 text-[15px] font-semibold text-white/45">
        <span>01</span>
        <span className="h-[2px] w-6 bg-white/20" />
        <span className="text-white">02</span>
      </div>

      <div className="absolute left-[80px] top-[224px] w-[600px]">
        <Kicker size={20}>Para quem acompanha</Kicker>
        <Headline size={82} className="mt-6">
          Crie, aplique,
          <br />
          <Mark>acompanhe.</Mark>
        </Headline>
        <Lead size={25} width={480}>
          Monte o treino, envie por convite e veja quem treinou — tudo no mesmo lugar.
        </Lead>
      </div>

      {/* Desktop hero */}
      <div className="absolute right-[-176px] top-[560px]">
        <Desktop active="Treinos" scale={0.92} tilt="perspective(2400px) rotateY(-18deg) rotateX(3deg) rotate(1deg)">
          <StudioMain />
        </Desktop>
      </div>

      {/* Recorte: aluno na lista de acompanhamento */}
      <div className="absolute left-[80px] top-[604px]">
        <FloatingCard className="w-[360px] px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.05] text-[13px] font-semibold text-white/70">
              M
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold text-white">Maria Santos</p>
              <p className="text-[11px] font-medium text-[#22c55e]">5 nos últimos 7 dias</p>
            </div>
            <ChevronRight size={16} className="text-[#f26a1b]" />
          </div>
        </FloatingCard>
      </div>

      <div className="absolute bottom-[236px] left-[80px] space-y-[22px]">
        <BenefitRow size={26}>Séries, carga e frequência de cada aluno</BenefitRow>
        <BenefitRow size={26}>Escale o atendimento com a IA</BenefitRow>
      </div>

      <div className="absolute bottom-[92px] left-[80px]">
        <DomainPill size={28} />
      </div>
    </Canvas>
  );
}
