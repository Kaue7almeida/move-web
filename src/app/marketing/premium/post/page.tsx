import { Bell } from "lucide-react";

import {
  Canvas,
  Desktop,
  DeviceTag,
  DomainPill,
  ExecutionScreen,
  Glow,
  Headline,
  Kicker,
  Lead,
  Mark,
  NotifToast,
  Phone,
  SessionMain,
  Wordmark,
} from "../premium-ui";

/**
 * Peça 1 — Post institucional 1080x1080.
 * Tema: os dois universos do produto (aluno mobile + personal desktop).
 * Direção: cena em camadas, desktop ao fundo + phone à frente, unidos por glow.
 */
export default function PremiumPostPage() {
  return (
    <Canvas width={1080} height={1080}>
      <Glow className="-top-[280px] left-[80px] h-[820px] w-[820px]" intensity={0.24} />
      <Glow className="bottom-[-320px] right-[-160px] h-[900px] w-[900px]" intensity={0.2} />

      {/* Coluna de texto */}
      <div className="absolute left-[78px] top-[80px]">
        <Wordmark size={40} />
      </div>

      <div className="absolute left-[78px] top-[232px] w-[470px]">
        <Kicker size={20}>Aluno + Personal</Kicker>
        <Headline size={98} className="mt-6">
          Dois lados.
          <br />
          <Mark>Um só</Mark> treino.
        </Headline>
        <Lead size={25} width={430}>
          O aluno executa no celular. O personal acompanha cada sessão. Tudo conectado,
          em tempo real.
        </Lead>
      </div>

      <div className="absolute bottom-[80px] left-[78px]">
        <DomainPill size={29} />
      </div>

      {/* Cena de devices */}
      <div className="absolute right-[-150px] top-[70px]">
        <Desktop active="Acompanhamento" scale={0.72} tilt="perspective(2200px) rotateY(-20deg) rotateX(4deg) rotate(1deg)">
          <SessionMain />
        </Desktop>
      </div>

      <div className="absolute bottom-[26px] right-[112px]">
        <Phone scale={0.9} tilt="perspective(1800px) rotateY(-14deg) rotate(-2deg)">
          <ExecutionScreen />
        </Phone>
      </div>

      {/* Recorte flutuante */}
      <div className="absolute right-[380px] top-[430px]">
        <NotifToast icon={Bell} title="Sessão registrada" body="Maria concluiu o Treino A" when="agora" width={306} />
      </div>

      {/* Tags de device */}
      <div className="absolute right-[168px] top-[150px]">
        <DeviceTag size={15}>Personal</DeviceTag>
      </div>
      <div className="absolute right-[150px] top-[636px]">
        <DeviceTag size={15}>Aluno</DeviceTag>
      </div>
    </Canvas>
  );
}
