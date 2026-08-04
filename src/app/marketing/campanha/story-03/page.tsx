import {
  Desktop,
  NotifToast,
  Phone,
  StudioMain,
  TodayScreen,
} from "../../premium/premium-ui";
import {
  Footer,
  GhostIndex,
  Headline,
  Kicker,
  Mark,
  StoryCanvas,
  Sub,
  TopBar,
} from "../campaign-ui";

/**
 * STORY 03 — Criação e aplicação de treino.
 * Ideia: a ponte personal → aluno. Você monta, o aluno recebe pronto.
 * Base real: Studio de Treino (personal) + Treino do dia (aluno).
 */
export default function Story03Page() {
  return (
    <StoryCanvas spotlight="-top-[280px] left-[100px] h-[980px] w-[980px]">
      <GhostIndex className="-right-[50px] top-[600px]">03</GhostIndex>
      <TopBar index="03" />

      <div className="absolute left-[84px] top-[300px]">
        <Kicker>Do plano à execução</Kicker>
        <Headline size={112} className="mt-7">
          Você monta.
          <br />
          O aluno
          <br />
          <Mark>recebe.</Mark>
        </Headline>
        <Sub size={30} width={640} className="mt-9">
          Crie o treino, aplique com um toque e ele abre pronto no celular do aluno.
        </Sub>
      </div>

      {/* Studio de treino (personal) */}
      <div className="absolute left-[-92px] top-[1010px]">
        <Desktop active="Treinos" scale={0.72} tilt="perspective(2400px) rotateY(12deg) rotateX(3deg) rotate(-1deg)">
          <StudioMain />
        </Desktop>
      </div>

      {/* Celular do aluno com o treino do dia */}
      <div className="absolute right-[76px] top-[1320px]">
        <Phone scale={0.98} tilt="perspective(2000px) rotateY(-13deg) rotate(-2deg)">
          <TodayScreen />
        </Phone>
      </div>

      {/* Ponte: novo treino aplicado */}
      <div className="absolute right-[300px] top-[1236px]">
        <NotifToast title="Novo treino disponível" body="Treino C aplicado pelo seu personal" when="agora" width={340} />
      </div>

      <Footer step={3} />
    </StoryCanvas>
  );
}
