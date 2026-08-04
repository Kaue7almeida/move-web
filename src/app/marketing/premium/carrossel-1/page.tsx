import {
  BenefitRow,
  Canvas,
  DomainPill,
  Glow,
  Headline,
  Kicker,
  Lead,
  Mark,
  NotifToast,
  Phone,
  TodayScreen,
  Wordmark,
} from "../premium-ui";

/**
 * Peça 5a — Carrossel 1080x1350, página 1 (aluno).
 * Tema: "Para quem treina" — o treino do dia pronto para abrir e executar.
 */
export default function CarrosselAlunoPage() {
  return (
    <Canvas width={1080} height={1350}>
      <Glow className="-top-[240px] left-[60px] h-[820px] w-[820px]" intensity={0.24} />
      <Glow className="bottom-[-260px] right-[-200px] h-[760px] w-[760px]" intensity={0.16} />

      <div className="absolute left-[80px] top-[82px]">
        <Wordmark size={38} />
      </div>
      <div className="absolute right-[80px] top-[92px] flex items-center gap-2 text-[15px] font-semibold text-white/45">
        <span className="text-white">01</span>
        <span className="h-[2px] w-6 bg-white/20" />
        <span>02</span>
      </div>

      <div className="absolute left-[80px] top-[224px] w-[560px]">
        <Kicker size={20}>Para quem treina</Kicker>
        <Headline size={92} className="mt-6">
          Abra e
          <br />
          <Mark>treine.</Mark>
        </Headline>
        <Lead size={25} width={470}>
          O treino aplicado pelo seu personal já aparece pronto. É só começar.
        </Lead>
      </div>

      {/* Phone hero */}
      <div className="absolute bottom-[30px] right-[120px]">
        <Phone scale={1.28} tilt="perspective(2200px) rotateY(-13deg) rotate(-2deg)">
          <TodayScreen />
        </Phone>
      </div>

      <div className="absolute left-[80px] top-[622px]">
        <NotifToast title="Novo treino disponível" body="Treino B aplicado pelo seu personal" when="agora" width={340} />
      </div>

      <div className="absolute bottom-[236px] left-[80px] space-y-[22px]">
        <BenefitRow size={26}>Execução guiada série por série</BenefitRow>
        <BenefitRow size={26}>Cada sessão vira histórico</BenefitRow>
      </div>

      <div className="absolute bottom-[92px] left-[80px]">
        <DomainPill size={28} />
      </div>
    </Canvas>
  );
}
