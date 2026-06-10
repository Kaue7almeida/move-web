import type { ChatStarter, ChatStarterTarget } from "@/bff/modules/chat/types";

export type PublicChatStarter = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  target: ChatStarterTarget;
};

const CHAT_STARTERS: ChatStarter[] = [
  {
    id: "move-scan-result",
    title: "Análise do meu resultado MoveScan",
    subtitle: "Entenda seu resultado e próximos passos",
    icon: "activity",
    target: "move_ai",
    prePrompt:
      "O usuário realizou um exame virtual no MoveScan. Ele enviou fotos e medidas básicas e recebeu uma análise completa. Agora quer ajuda para entender os principais pontos e receber dicas para melhorar ou continuar no caminho certo. Contextualize o resultado total em 2-3 frases, cite no máximo 3 pontos positivos e 3 pontos de atenção, sugira 2-3 ações práticas para as próximas 4 semanas e pergunte se o usuário quer um plano passo a passo. Se nenhum resultado específico tiver sido fornecido, explique que você pode ajudar melhor quando a conversa for aberta a partir de um resultado de Scan.",
  },
  {
    id: "muscle-pain-or-injury",
    title: "Dor boa ou lesão?",
    subtitle: "Aprenda a diferenciar os sinais do corpo",
    icon: "alert-circle",
    target: "move_ai",
    prePrompt:
      "O usuário quer entender a diferença entre dor muscular normal pós-treino e dor de lesão. Responda de forma leve e direta, como em um bate-papo. Explique sinais típicos de dor de treino e sinais de alerta de possível lesão. Dê orientações práticas sobre quando descansar, adaptar o treino e procurar ajuda profissional.",
  },
  {
    id: "avoid-injuries",
    title: "Como evitar lesões no treino",
    subtitle: "Proteja joelhos, ombros e lombar",
    icon: "shield",
    target: "move_ai",
    prePrompt:
      "O usuário quer saber como evitar lesões durante os treinos, principalmente no joelho, ombro e lombar. Responda de forma simples e prática. Dê dicas de cuidados básicos, postura, aquecimento e execução correta. Reforce respeitar limites do corpo.",
  },
  {
    id: "sleep-and-progress",
    title: "Quanto devo dormir para evoluir?",
    subtitle: "Descubra como o sono impacta seus treinos",
    icon: "moon",
    target: "move_ai",
    prePrompt:
      "O usuário quer entender quanto precisa dormir para ter bons resultados nos treinos. Explique a importância do sono para recuperação muscular, energia e evolução. Dê dicas simples para melhorar a qualidade do sono e incentive equilíbrio entre treino, descanso e rotina.",
  },
  {
    id: "coffee-before-workout",
    title: "Café antes do treino ajuda?",
    subtitle: "Descubra os efeitos da cafeína no seu treino",
    icon: "coffee",
    target: "move_ai",
    prePrompt:
      "O usuário quer saber se tomar café ou cafeína antes do treino ajuda ou atrapalha. Explique benefícios e cuidados de forma acessível. Mostre que pode dar energia, mas que cada pessoa reage de um jeito. Estimule testar com cuidado.",
  },
  {
    id: "train-every-day",
    title: "Preciso treinar todo dia?",
    subtitle: "Descubra o equilíbrio ideal para você",
    icon: "help-circle",
    target: "move_ai",
    prePrompt:
      "O usuário quer saber se precisa treinar todos os dias para ter resultado. Explique que descanso faz parte do progresso, que constância importa mais que exagero e que treinar todo dia pode não ser ideal para todos.",
  },
  {
    id: "strength-training-weight-loss",
    title: "Musculação emagrece?",
    subtitle: "Entenda por que ela ajuda a perder peso",
    icon: "scale",
    target: "move_ai",
    prePrompt:
      "O usuário quer saber se musculação ajuda no emagrecimento ou se só cardio emagrece. Explique que musculação contribui para emagrecimento, metabolismo e composição corporal. Mostre que combinar musculação e cardio pode ser bom.",
  },
  {
    id: "organize-workouts",
    title: "Como organizar seus treinos",
    subtitle: "Encontre a frequência ideal para você",
    icon: "calendar-check",
    target: "move_ai",
    prePrompt:
      "O usuário quer organizar a rotina de treinos e entender quantos dias por semana deve treinar. Dê exemplos de agendas possíveis, destaque descanso e incentive uma rotina sustentável que caiba na agenda.",
  },
  {
    id: "light-workout-or-rest",
    title: "Treinar leve ou descansar?",
    subtitle: "Saiba o que fazer quando estiver cansado",
    icon: "bed",
    target: "move_ai",
    prePrompt:
      "O usuário está cansado ou sem energia e quer saber se deve treinar leve ou descansar. Responda de forma acolhedora e prática. Dê dicas para avaliar o corpo e sugira descanso, treino leve ou caminhada conforme o caso.",
  },
  {
    id: "supplements-truth",
    title: "Suplementos: o que é verdade?",
    subtitle: "Entenda o que realmente funciona",
    icon: "info",
    target: "move_ai",
    prePrompt:
      "O usuário quer saber se suplementos como whey, creatina e BCAA funcionam ou são mito. Explique o básico de forma simples. Reforce que alimentação e constância são prioridade e incentive orientação profissional antes de usar suplementos.",
  },
  {
    id: "best-workout-time",
    title: "Qual o melhor horário para treinar?",
    subtitle: "Descubra quando seu corpo rende mais",
    icon: "clock",
    target: "move_ai",
    prePrompt:
      "O usuário quer saber qual é o melhor horário para treinar. Explique benefícios de manhã, tarde e noite sem impor regra. Estimule testar e escolher o horário que ele consegue manter.",
  },
];

function toPublicChatStarter(starter: ChatStarter): PublicChatStarter {
  return {
    id: starter.id,
    title: starter.title,
    subtitle: starter.subtitle,
    icon: starter.icon,
    target: starter.target,
  };
}

export function getChatStarterById(id: string): ChatStarter | null {
  return CHAT_STARTERS.find((starter) => starter.id === id) ?? null;
}

export function listChatStarters(): PublicChatStarter[] {
  return CHAT_STARTERS.map(toPublicChatStarter);
}
