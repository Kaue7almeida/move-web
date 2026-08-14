"use client";

import { useRouter } from "next/navigation";
import { MessageCircle, Sparkles } from "lucide-react";

import { saveChatTriggerIntent } from "@/services/chat/chatTriggerService";
import { clientTimeZone } from "@/services/foodDiary/foodDiaryService";

/**
 * CTA "Conversar com a IA sobre meu dia" — abre a IA Move (nunca o chat com o
 * personal) já contextualizada com o Diário. Segue o padrão do Scan: salva um
 * intent contextual e navega para /app/chat, que auto-envia o gatilho.
 *
 * O front manda apenas um LOCATOR (o fuso, como entityId) — o BFF resolve os dados
 * reais (Hoje + 7 dias) do usuário autenticado e valida o beta gate server-side.
 * Nenhum payload nutricional trafega pelo front/sessionStorage.
 */
export function AskAiAboutDay({ variant = "band" }: { variant?: "band" | "compact" }) {
  const router = useRouter();

  function open() {
    const tz = clientTimeZone();
    saveChatTriggerIntent({
      id: "food_diary_understand_day",
      target: "move_ai",
      visibleMessage: "Me ajuda a entender meu dia no diário?",
      title: "Meu dia no diário",
      contextModule: "food_diary",
      contextLabel: "Diário de hoje",
      sourceRoute: "/app/diario",
      entityId: tz,
      autoSend: true,
      contextTrigger: { id: "food_diary_understand_day", entityId: tz },
    });
    router.push("/app/chat");
  }

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={open}
        className="dia-selectable inline-flex items-center gap-1.5 rounded-xl border border-accent/40 bg-accent-muted/40 px-3.5 py-2 text-[13px] font-bold text-accent hover:bg-accent-muted"
      >
        <Sparkles size={14} /> Conversar com a IA sobre meu dia
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      className="dia-selectable dia-rise group flex w-full items-center gap-3 rounded-2xl border border-accent/30 bg-gradient-to-br from-accent-muted/50 to-surface p-4 text-left ring-1 ring-accent/10 hover:border-accent/50"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-on">
        <MessageCircle size={20} strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold text-foreground">Conversar com a IA sobre meu dia</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">
          A IA Move olha seu dia e seus últimos 7 dias e te ajuda a decidir o próximo passo.
        </span>
      </span>
      <Sparkles size={16} className="shrink-0 text-accent transition-transform group-hover:scale-110" />
    </button>
  );
}
