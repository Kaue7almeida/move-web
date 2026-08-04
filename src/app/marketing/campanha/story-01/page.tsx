import { CalendarCheck, TrendingUp } from "lucide-react";

import {
  Desktop,
  ExecutionScreen,
  Phone,
  TrackingMain,
} from "../../premium/premium-ui";
import {
  Footer,
  GhostIndex,
  Headline,
  Kicker,
  ProofChip,
  StoryCanvas,
  Sub,
  TopBar,
} from "../campaign-ui";

/**
 * STORY 01 — Institucional / descoberta.
 * Ideia: apresentar a solução. Menos operação, mais acompanhamento.
 * Base real: painel de Acompanhamento (personal) + execução guiada (aluno).
 */
export default function Story01Page() {
  return (
    <StoryCanvas spotlight="-top-[300px] left-[120px] h-[1000px] w-[1000px]">
      <GhostIndex className="-right-[60px] top-[600px]">01</GhostIndex>
      <TopBar index="01" />

      <div className="absolute left-[84px] top-[292px]">
        <Kicker>Para personal trainers</Kicker>
        <Headline size={86} className="mt-7">
          Menos
          <br />
          operação.
          <br />
          <span className="text-[#f26a1b]">Mais</span>
          <br />
          <span className="text-[#f26a1b]">acompanhamento.</span>
        </Headline>
        <Sub size={30} width={620} className="mt-9">
          O MoveX Fit reúne treinos, rotina e evolução dos seus alunos em um só lugar.
        </Sub>
      </div>

      {/* Cena-sistema: desktop do personal + celular do aluno */}
      <div className="absolute left-[76px] top-[1024px]">
        <Desktop active="Acompanhamento" scale={0.74} tilt="perspective(2400px) rotateY(-13deg) rotateX(3deg) rotate(1deg)">
          <TrackingMain />
        </Desktop>
      </div>

      <div className="absolute right-[70px] top-[1300px]">
        <Phone scale={0.94} tilt="perspective(2000px) rotateY(-12deg) rotate(-3deg)">
          <ExecutionScreen />
        </Phone>
      </div>

      {/* Destaques */}
      <div className="absolute left-[150px] top-[970px]">
        <ProofChip icon={TrendingUp} label="5 nos últimos 7 dias" tone="success" size={22} />
      </div>
      <div className="absolute right-[150px] top-[1244px]">
        <ProofChip icon={CalendarCheck} label="Treino concluído" tone="accent" size={20} />
      </div>

      <Footer step={1} />
    </StoryCanvas>
  );
}
