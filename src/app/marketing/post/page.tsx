import { Bell, Dumbbell, MessageCircle, ScanLine } from "lucide-react";

import {
  Canvas,
  DomainPill,
  Eyebrow,
  FeatureChip,
  Glow,
  PhoneExecution,
  Wordmark,
} from "../marketing-ui";

/**
 * Peça 1 — Post quadrado 1080x1080 (institucional).
 * Mensagem: treino, evolução e acompanhamento em um só lugar.
 */
export default function PostPage() {
  return (
    <Canvas width={1080} height={1080}>
      <Glow className="-top-[320px] left-[140px] h-[900px] w-[900px]" />
      <Glow className="bottom-[-260px] right-[-220px] h-[820px] w-[820px]" />

      <div className="absolute left-[76px] top-[72px]">
        <Wordmark size={46} />
      </div>

      <div className="absolute left-[76px] top-[196px]">
        <Eyebrow size={23}>Para alunos e personal trainers</Eyebrow>
        <h1 className="mt-7 font-display text-[72px] font-semibold leading-[0.98] tracking-[-0.05em] text-white">
          Treinos, evolução
          <br />
          e acompanhamento
          <br />
          em um só lugar.
        </h1>
        <p className="mt-8 w-[470px] text-[27px] leading-[1.45] text-white/65">
          O aluno treina com clareza, o personal acompanha de perto e a IA ajuda nos dois
          lados.
        </p>
      </div>

      <div className="absolute left-[76px] top-[716px] flex w-[460px] flex-wrap gap-3">
        <FeatureChip icon={Dumbbell} label="Treinos guiados" size={22} />
        <FeatureChip icon={ScanLine} label="MoveScan" size={22} />
        <FeatureChip icon={MessageCircle} label="Chat com IA" size={22} />
        <FeatureChip icon={Bell} label="Notificações" size={22} />
      </div>

      <div className="absolute bottom-[84px] left-[76px]">
        <DomainPill size={30} />
      </div>

      <div className="absolute bottom-[20px] right-[56px]">
        <PhoneExecution zoom={1.5} />
      </div>
    </Canvas>
  );
}
