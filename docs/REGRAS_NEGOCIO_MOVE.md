# Regras de Negócio — Move

## Contexto

O Move é um projeto novo, iniciado do zero, sem dependência do legado.

A proposta inicial é ter:

- app mobile em Expo/React Native para a experiência principal de treinos;
- app web em Next.js para landing page, módulos web, painel do personal e BFF/API;
- Supabase como base central de autenticação, banco, storage e segurança.

O app mobile será focado principalmente no módulo de treinos.  
O Next/web também poderá replicar o módulo de treinos em versão mobile-first para usuários que não puderem ou não quiserem instalar o app nativo.

## Tipos de usuário

Um usuário pode ser:

- apenas aluno;
- aluno e personal ao mesmo tempo.

Todo personal também pode acessar a experiência de aluno/treino.

## Aluno

O aluno tem acesso ao módulo de treinos e funcionalidades relacionadas.

Um aluno pode:

- não ter personal externo vinculado;
- ter um personal externo vinculado;
- ter mais de um personal externo vinculado;
- ter vários programas de treino ativos ao mesmo tempo;
- solicitar treino personalizado;
- acessar uma galeria genérica de treinos.

O aluno não deve criar treino personalizado sozinho.

Quando um aluno não tiver personal externo conhecido, ele não deve ficar órfão.  
Nesse caso, poderá ser atendido por um personal ou equipe interna do Move.

## Personal

Um personal pode:

- não ter alunos;
- ter vários alunos;
- ter um aluno que também está vinculado a outro personal;
- criar treinos personalizados para seus alunos;
- acessar painel web para gestão de alunos e criação/acompanhamento de treinos.

O painel do personal ficará principalmente no web/Next.  
No app mobile, se o usuário também for personal, pode existir um atalho para abrir o painel via web/WebView.

## Relação aluno-personal

A relação aluno-personal é uma regra central do produto.

Um aluno pode estar vinculado a mais de um personal.  
Um personal pode ter vários alunos.  
Um aluno existente deve ser vinculado, nunca duplicado.

O vínculo via convite/link precisa de aceite do personal, porque pode gerar cobrança para ele.

O aluno pode solicitar saída de um personal.  
Ao sair, o aluno entra inicialmente em uma carência de 7 dias, com aviso claro sobre mudança de plano, perda de acessos e possível cobrança individual.

Quando um aluno sai de um personal, o personal não deve manter acesso ao histórico detalhado.  
Ele pode manter apenas registro básico de que o aluno existiu na base e está inativo/desvinculado.

## Convite e cadastro por link

O personal deve ter um link de cadastro para convidar alunos.

Quando o aluno entra pelo link de um personal:

- o vínculo deve ser apresentado claramente durante cadastro/onboarding;
- o personal precisa aprovar o vínculo;
- se aprovado, o aluno entra vinculado ao personal;
- inicialmente, o aluno vinculado ao personal não paga diretamente.

Se um aluno avulso, já existente e pagante, aceitar convite de um personal, o vínculo deve aproveitar a conta existente.  
Nesse caso, o personal precisa aprovar sabendo que poderá assumir cobrança adicional.

## Treinos

Treinos personalizados devem ser criados por:

- personal externo vinculado ao aluno;
- personal/equipe interna do Move, quando o aluno não tiver personal externo.

O aluno pode solicitar treino personalizado por uma ação como “Solicitar treino personalizado”.

Essa solicitação pode envolver:

- objetivo do aluno;
- nível de treino;
- disponibilidade semanal;
- limitações;
- preferências;
- questionário inicial.

O aluno também pode acessar uma galeria padrão de treinos genéricos, sem personalização individual.

## Visibilidade de dados

Por padrão, o personal vê apenas:

- dados básicos do aluno;
- treinos criados por ele;
- conclusão dos treinos criados por ele;
- frequência relacionada aos treinos criados por ele.

Dados básicos podem incluir:

- nome;
- idade;
- peso;
- sexo;
- perfil de treino;
- outros dados básicos disponíveis no cadastro/perfil.

A visibilidade extra começa bloqueada por padrão e depende de permissão do aluno.

Dados que exigem permissão explícita:

- scan corporal;
- biopedância;
- medidas corporais;
- fotos;
- diário pessoal;
- dados de treinos criados por outros personals;
- progresso geral fora do escopo daquele personal.

## Pagamento

A regra de pagamento ainda será refinada.

Direção inicial:

- aluno avulso deve pagar plano individual;
- aluno vinculado a personal pode ser isento inicialmente;
- personal deve pagar plano próprio;
- personal pode pagar adicional por aluno ativo.

Regra inicial pensada para personal:

- R$10 de valor base;
- + R$5 por aluno ativo elegível.

Aluno ativo elegível:

- aluno vinculado ao personal;
- que ficou pelo menos 7 dias ativo;
- dentro dos últimos 30 dias antes da data de corte da cobrança.

A data de corte do personal será baseada na data de ativação dele na plataforma.

O provedor de pagamento ainda será definido entre Asaas, Stripe ou outro.

## Web, mobile e BFF

O app mobile é a experiência principal de treino.

O web/Next deve concentrar:

- landing page;
- versão web mobile-first do módulo de treinos;
- painel do personal;
- chat;
- scan;
- módulos auxiliares;
- BFF/API.

O BFF no Next será a camada central para regras sensíveis, autenticação, autorização e acesso ao Supabase.

O app mobile e o app web devem conversar com o BFF para operações com regra de negócio.

## Fora de escopo por enquanto

Por enquanto, não considerar:

- academia;
- equipe externa de personal;
- múltiplos profissionais dentro de uma organização;
- hierarquia de empresa;
- painel administrativo complexo;
- billing definitivo.

Pode existir uma equipe interna Move para atender alunos sem personal externo, mas isso não deve virar uma modelagem complexa de academia neste momento.

## Pendências futuras

Ainda precisam ser definidos:

- dados básicos exatos visíveis ao personal;
- fluxo completo de solicitação de treino personalizado;
- modelagem de banco;
- permissões detalhadas de visibilidade;
- regra final de carência após saída do personal;
- regra final de billing;
- provedor de pagamento;
- funcionamento completo do chat com IA;
- funcionamento completo do scan/biopedância;
- versão web do módulo de treinos;
- limites entre app nativo e WebView.

## Regra geral

Este documento representa as regras atuais conhecidas.  
As regras podem evoluir, mas qualquer implementação deve respeitar este documento até que ele seja atualizado.
