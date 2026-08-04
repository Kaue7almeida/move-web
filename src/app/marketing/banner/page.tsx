import {
  BenefitRow,
  Canvas,
  DomainPill,
  Eyebrow,
  Glow,
  PhoneExecution,
  WebPanel,
  Wordmark,
} from "../marketing-ui";

/**
 * Peça 3 — Banner horizontal 1920x1080 (apresentação geral).
 * Mensagem: os dois lados do produto — aluno treina, personal acompanha.
 */
export default function BannerPage() {
  return (
    <Canvas width={1920} height={1080}>
      <Glow className="-top-[300px] left-[420px] h-[950px] w-[950px]" />
      <Glow className="bottom-[-300px] right-[-200px] h-[900px] w-[900px]" />

      <div className="absolute left-[96px] top-[84px]">
        <Wordmark size={46} />
      </div>

      <div className="absolute left-[96px] top-[230px] w-[780px]">
        <Eyebrow size={23}>Para alunos e personal trainers</Eyebrow>
        <h1 className="mt-7 font-display text-[80px] font-semibold leading-[0.98] tracking-[-0.05em] text-white">
          Treinos, evolução e acompanhamento em um só lugar.
        </h1>
        <p className="mt-7 w-[640px] text-[27px] leading-[1.5] text-white/65">
          O aluno treina com clareza, o personal acompanha cada sessão e a IA ajuda a
          entender treinos e próximos passos.
        </p>
      </div>

      <div className="absolute left-[96px] top-[724px] grid w-[860px] grid-cols-2 gap-x-8 gap-y-5">
        <BenefitRow size={22}>Treino do dia pronto ao abrir</BenefitRow>
        <BenefitRow size={22}>Sessões e cargas de cada aluno</BenefitRow>
        <BenefitRow size={22}>Execução guiada série por série</BenefitRow>
        <BenefitRow size={22}>MoveScan e chat com IA</BenefitRow>
      </div>

      <div className="absolute bottom-[84px] left-[96px]">
        <DomainPill size={28} />
      </div>

      <div className="absolute right-[120px] top-[150px]">
        <WebPanel zoom={1.35} />
      </div>
      <div className="absolute bottom-[24px] right-[64px]">
        <PhoneExecution zoom={1.18} />
      </div>
    </Canvas>
  );
}
