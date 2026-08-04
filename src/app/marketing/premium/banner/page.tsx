import {
  BenefitRow,
  Canvas,
  Desktop,
  DeviceTag,
  DomainPill,
  Glow,
  Headline,
  Kicker,
  Mark,
  NotifToast,
  Phone,
  StudioMain,
  TodayScreen,
  Wordmark,
} from "../premium-ui";

/**
 * Peça 3 — Banner 1920x1080.
 * Tema: ecossistema — personal organiza e aplica, aluno executa.
 * Direção: cena wide em camadas, Studio de Treinos + phone do aluno à frente.
 */
export default function PremiumBannerPage() {
  return (
    <Canvas width={1920} height={1080}>
      <Glow className="-top-[300px] left-[280px] h-[900px] w-[900px]" intensity={0.22} />
      <Glow className="bottom-[-340px] right-[-140px] h-[940px] w-[940px]" intensity={0.2} />

      {/* Coluna de texto */}
      <div className="absolute left-[112px] top-[92px]">
        <Wordmark size={40} />
      </div>

      <div className="absolute left-[112px] top-[300px] w-[760px]">
        <Kicker size={21}>Para quem acompanha</Kicker>
        <Headline size={92} className="mt-6">
          Do plano à
          <br />
          execução, <Mark>sem</Mark>
          <br />
          <Mark>perder o fio.</Mark>
        </Headline>
      </div>

      <div className="absolute left-[112px] top-[712px] space-y-[22px]">
        <BenefitRow size={24}>Monte o treino como você prescreve</BenefitRow>
        <BenefitRow size={24}>Aplique com um link de convite</BenefitRow>
        <BenefitRow size={24}>Acompanhe cada sessão executada</BenefitRow>
      </div>

      <div className="absolute bottom-[86px] left-[112px]">
        <DomainPill size={28} />
      </div>

      {/* Cena de devices */}
      <div className="absolute right-[-120px] top-[150px]">
        <Desktop active="Treinos" scale={0.94} tilt="perspective(2600px) rotateY(-17deg) rotateX(3deg) rotate(1deg)">
          <StudioMain />
        </Desktop>
      </div>

      <div className="absolute bottom-[36px] right-[560px]">
        <Phone scale={0.92} tilt="perspective(2000px) rotateY(-12deg) rotate(-2deg)">
          <TodayScreen />
        </Phone>
      </div>

      <div className="absolute right-[470px] top-[228px]">
        <NotifToast title="Novo treino disponível" body="Treino C aplicado pelo seu personal" when="agora" width={330} />
      </div>

      <div className="absolute right-[210px] top-[212px]">
        <DeviceTag size={15}>Personal · web</DeviceTag>
      </div>
      <div className="absolute right-[600px] top-[650px]">
        <DeviceTag size={15}>Aluno · celular</DeviceTag>
      </div>
    </Canvas>
  );
}
