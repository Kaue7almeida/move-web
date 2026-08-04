import Link from "next/link";

/**
 * Índice do kit de marketing — lista as peças e seus tamanhos de export.
 * Para gerar os PNGs: scripts/capture-marketing.ps1 (com o dev server rodando).
 */
const pieces = [
  { href: "/marketing/post", label: "Post institucional", size: "1080 × 1080" },
  { href: "/marketing/story", label: "Story (aluno)", size: "1080 × 1920" },
  { href: "/marketing/banner", label: "Banner horizontal", size: "1920 × 1080" },
  { href: "/marketing/feature", label: "Feature — MoveScan", size: "1080 × 1080" },
];

export default function MarketingIndexPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] px-8 py-16 text-white">
      <div className="mx-auto w-full max-w-2xl">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-[#f26a1b]">
          Interno
        </p>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em]">
          Kit de marketing — MoveX Fit
        </h1>
        <p className="mt-3 text-sm leading-6 text-white/60">
          Cada peça é uma página em pixel fixo. Para exportar os PNGs, rode{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-[0.8rem]">
            scripts/capture-marketing.ps1
          </code>{" "}
          com o dev server ativo.
        </p>

        <div className="mt-10 space-y-3">
          {pieces.map((piece) => (
            <Link
              key={piece.href}
              href={piece.href}
              className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.02] px-5 py-4 transition hover:border-white/16 hover:bg-white/[0.04]"
            >
              <span className="font-medium">{piece.label}</span>
              <span className="text-sm text-white/45">{piece.size}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
