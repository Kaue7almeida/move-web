import { UserPlus } from "lucide-react";

import { Desktop } from "../../premium/premium-ui";
import {
  Footer,
  GhostIndex,
  Headline,
  InvitePill,
  Kicker,
  Mark,
  ProofChip,
  StoryCanvas,
  StudentsListMain,
  Sub,
  TopBar,
} from "../campaign-ui";

/**
 * STORY 02 — Convite + organização de alunos.
 * Ideia: comece fácil e organize a carteira.
 * Base real: /app/alunos (busca, filtros, status) + link de convite.
 */
export default function Story02Page() {
  return (
    <StoryCanvas spotlight="-top-[280px] right-[80px] h-[980px] w-[980px]">
      <GhostIndex className="-left-[50px] top-[600px]">02</GhostIndex>
      <TopBar index="02" />

      <div className="absolute left-[84px] top-[300px]">
        <Kicker>Gestão de alunos</Kicker>
        <Headline size={116} className="mt-7">
          Convide.
          <br />
          Organize.
          <br />
          <Mark>Acompanhe.</Mark>
        </Headline>
        <Sub size={30} width={640} className="mt-9">
          Envie o convite, veja quem entrou e acompanhe a rotina de cada aluno.
        </Sub>
      </div>

      {/* Módulo real de Alunos */}
      <div className="absolute right-[-84px] top-[1040px]">
        <Desktop active="Alunos" scale={0.76} tilt="perspective(2400px) rotateY(-14deg) rotateX(3deg) rotate(1deg)">
          <StudentsListMain />
        </Desktop>
      </div>

      {/* Link de convite real */}
      <div className="absolute left-[76px] top-[992px]">
        <InvitePill scale={0.94} />
      </div>

      {/* Destaques */}
      <div className="absolute left-[110px] top-[1560px]">
        <ProofChip icon={UserPlus} label="Novo aluno" tone="accent" size={22} />
      </div>

      <Footer step={2} />
    </StoryCanvas>
  );
}
