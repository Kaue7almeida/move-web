import {
  BenefitRow,
  Canvas,
  DomainPill,
  Eyebrow,
  Glow,
  PhoneToday,
  Wordmark,
} from "../marketing-ui";

/**
 * Peça 2 — Story 1080x1920 (impacto rápido, foco no aluno).
 * Mensagem: o treino do dia chega pronto; é só abrir e treinar.
 */
export default function StoryPage() {
  return (
    <Canvas width={1080} height={1920}>
      <Glow className="-top-[260px] left-[90px] h-[900px] w-[900px]" />
      <Glow className="bottom-[120px] right-[-280px] h-[820px] w-[820px]" />

      <div className="absolute left-[84px] top-[96px]">
        <Wordmark size={48} />
      </div>

      <div className="absolute left-[84px] top-[236px] w-[912px]">
        <Eyebrow size={24}>Para quem treina</Eyebrow>
        <h1 className="mt-7 font-display text-[118px] font-semibold leading-[0.96] tracking-[-0.05em] text-white">
          Abra. Treine. Evolua.
        </h1>
        <p className="mt-8 w-[760px] text-[32px] leading-[1.45] text-white/65">
          Seu treino do dia já chega pronto, com execução guiada série por série.
        </p>
      </div>

      <div className="absolute left-1/2 top-[700px] -translate-x-1/2">
        <PhoneToday zoom={1.85} />
      </div>

      <div className="absolute left-[84px] top-[1480px] space-y-6">
        <BenefitRow size={28}>Histórico que vira evolução</BenefitRow>
        <BenefitRow size={28}>MoveScan para acompanhar o corpo</BenefitRow>
        <BenefitRow size={28}>IA e personal no mesmo chat</BenefitRow>
      </div>

      <div className="absolute bottom-[96px] left-[84px]">
        <DomainPill size={32} />
      </div>
    </Canvas>
  );
}
