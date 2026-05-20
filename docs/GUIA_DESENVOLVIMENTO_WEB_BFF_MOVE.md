# Guia de Desenvolvimento Web + BFF — Move

## Objetivo

Definir o padrão básico de desenvolvimento do projeto Next.js do Move, incluindo front web, módulos web embarcáveis no app mobile e BFF seguro.

Este guia mantém o conceito arquitetural em camadas usado como referência no Web Flow/Warren, mas em uma versão mais simples e adequada ao estágio atual do Move.

## Princípios obrigatórios

- Usar rotas REST versionadas em `/api/v1`.
- Rota não acessa banco diretamente.
- Front não acessa banco diretamente.
- Service client-side apenas chama API e trata request/response.
- Regra de negócio fica no BFF, não no front.
- Autenticação deve ser centralizada nas rotas privadas.
- Nunca confiar em `userId`, `tenantId` ou `role` enviados pelo body.
- Toda rota privada deve validar sessão no servidor.
- Rotas com escopo de academia/tenant devem validar vínculo do usuário com o tenant.
- Repository deve aplicar filtro de ownership, como `userId`, `tenantId` ou vínculo equivalente.
- Usar schema para validar body, query e params.
- Não usar `any`.
- Em `catch`, usar `error: unknown`.
- Não adicionar comentários óbvios, temporários ou de TODO sem necessidade real.
- Evitar ifs redundantes, duplicação e abstrações prematuras.
- Criar código simples, explícito e fácil de revisar.

## Estrutura de pastas sugerida

```txt
src/
  app/
    (public)/
      page.tsx

    (app)/
      chat/
      scan/
      financial/
      student-diary/

    api/
      v1/
        auth/
        chat/
        scan/
        financial/
        student-diary/

  bff/
    core/
      auth/
      errors/
      logger/
      supabase/
      validation/

    modules/
      auth/
      users/
      chat/
      scan/
      financial/
      studentDiary/

  services/
    auth/
    chat/
    scan/
    financial/
    studentDiary/

  components/
    ui/
    layout/
    feedback/

  types/
  utils/
```

## Separação entre front, API e BFF

Fluxo obrigatório:

```txt
Página/Componente Next
  -> service client-side
  -> /api/v1
  -> route.ts
  -> schema.ts
  -> auth guard
  -> BFF service
  -> repository
  -> Supabase/API externa
```

### Front

Pode:

- renderizar tela;
- controlar estado visual;
- chamar services client-side;
- exibir loading, erro e vazio;
- usar Supabase Auth para login/logout quando fizer sentido.

Não pode:

- acessar tabela do Supabase diretamente para dados sensíveis;
- decidir permissão crítica;
- conter regra de negócio do domínio;
- montar payload baseado em `userId` manual;
- duplicar regra que deveria estar no BFF.

### Services client-side

Exemplo:

```txt
src/services/chat/chatService.ts
```

Pode:

- chamar `/api/v1/...`;
- tipar request e response;
- adaptar erro de rede para a UI;
- centralizar fetch/headers.

Não pode:

- conter regra de negócio;
- validar permissão;
- acessar banco;
- decidir ownership.

### Route

A rota deve:

- validar entrada;
- autenticar usuário;
- montar `authContext`;
- chamar service do BFF;
- retornar HTTP response;
- tratar erro com helper central.

A rota não deve:

- acessar Supabase diretamente;
- conter regra de negócio;
- chamar API externa diretamente;
- transformar payload complexo;
- fazer parse manual desnecessário.

### BFF Service

Service pode:

- aplicar regra de negócio;
- coordenar repositories;
- chamar transformers;
- validar estado da operação;
- decidir fluxo do domínio.

Service não pode:

- depender de `Request`;
- ler headers;
- criar client Supabase diretamente;
- conhecer detalhe de HTTP.

### Repository

Repository pode:

- acessar Supabase;
- acessar API externa;
- acessar Storage;
- aplicar filtros de segurança;
- converter erro de provider para erro interno.

Repository não pode:

- decidir regra de negócio;
- ignorar escopo de usuário/tenant;
- devolver payload cru inseguro;
- vazar detalhe sensível de integração.

### Factory

Factory compõe dependências.

Exemplo:

```txt
makeChatService.ts
```

Deve criar repository, injetar clients necessários e devolver o service pronto.

### Transformer

Usar transformer apenas quando houver necessidade de:

- normalizar payload externo;
- formatar saída;
- traduzir status;
- esconder campos internos;
- preparar dados para a UI.

Transformer não acessa banco e não executa regra de negócio crítica.

## Estrutura padrão de módulo BFF

Exemplo para `chat`:

```txt
src/app/api/v1/chat/messages/
  schema.ts
  route.ts
  route.test.ts

src/bff/modules/chat/
  types/
    index.ts
    IChatRepository.ts

  infra/
    ChatRepository.ts
    ChatRepository.test.ts

  services/
    ChatService.ts
    ChatService.test.ts

  factories/
    makeChatService.ts

  transformers/
    ChatTransformer.ts
    ChatTransformer.test.ts
```

Se o módulo for muito pequeno, pode começar sem transformer. Não criar camada vazia sem necessidade.

## Rotas REST

Usar `/api/v1` para APIs internas do produto.

Exemplos:

```txt
GET    /api/v1/chat/conversations
POST   /api/v1/chat/conversations
GET    /api/v1/chat/conversations/:conversationId/messages
POST   /api/v1/chat/messages

POST   /api/v1/scan/analyses
GET    /api/v1/scan/analyses/:analysisId

GET    /api/v1/financial/summary
GET    /api/v1/financial/invoices

GET    /api/v1/student-diary/entries
POST   /api/v1/student-diary/entries
PATCH  /api/v1/student-diary/entries/:entryId
DELETE /api/v1/student-diary/entries/:entryId
```

## Autenticação e autorização

Toda rota privada deve autenticar no servidor antes de chamar service.

Padrão conceitual:

```ts
export type AuthContext = {
  userId: string;
  tenantId?: string;
  role: 'student' | 'trainer' | 'admin';
};
```

Guards sugeridos:

```txt
ensureAuthenticated(request)
  valida sessão/JWT do Supabase
  retorna AuthContext mínimo

ensureTenantAccess(request, tenantId)
  valida sessão
  valida vínculo com tenant
  retorna AuthContext com tenantId e role

ensureRole(authContext, allowedRoles)
  valida permissão por papel
```

Regras obrigatórias:

- `userId` vem da sessão, não do body.
- `role` vem do banco/contexto confiável, não do front.
- `tenantId` pode vir da URL, mas deve ser validado contra o usuário autenticado.
- Operações sensíveis devem validar ownership no repository.
- RLS do Supabase deve ser considerada segunda camada de segurança, não substituto da validação do BFF.

## Supabase

### Client-side

Permitido para:

- login;
- logout;
- recuperação de senha;
- leitura da sessão atual quando necessário.

Evitar no client-side:

- queries diretas em tabelas de domínio;
- inserts/updates sensíveis;
- uploads sem controle de ownership;
- qualquer operação que dependa de regra de negócio.

### Server-side / BFF

Usar para:

- queries de domínio;
- inserts;
- updates;
- storage;
- validações;
- integrações sensíveis;
- agregações.

## Validação

Toda rota com body, query ou params deve ter `schema.ts`.

Usar Zod ou biblioteca padrão definida no projeto.

Exemplo de responsabilidades:

```txt
schema.ts
  valida formato de entrada

route.ts
  chama validação, auth e service

service.ts
  valida regra de negócio

repository.ts
  executa acesso a dados com filtros seguros
```

## Tratamento de erros

Criar helper central:

```txt
src/bff/core/errors/handleApiError.ts
```

Padrão obrigatório:

```ts
try {
  // execução
} catch (error: unknown) {
  return handleApiError(error);
}
```

Não usar:

```ts
catch (error: any)
```

Não vazar:

- token;
- payload bruto de integração;
- secrets;
- stack trace em produção;
- dados pessoais sensíveis.

## Módulos web embarcados no app

Módulos previstos:

```txt
chat
scan
financial
student-diary
```

Esses módulos devem funcionar em:

- desktop;
- browser mobile;
- WebView dentro do app Expo.

Regras:

- layout mobile-first;
- não depender de hover;
- URLs estáveis;
- autenticação compatível com app nativo;
- estados claros de loading, erro e vazio;
- evitar duplicação de lógica entre app nativo e web.

## Checklist para nova rota

Antes de considerar uma rota pronta:

- Está em `/api/v1`.
- Tem `schema.ts` quando recebe entrada.
- Valida autenticação no servidor.
- Não confia em `userId` do body.
- Usa `authContext`.
- Chama service, não repository direto.
- Repository aplica filtro de ownership.
- Não usa `any`.
- Usa `catch (error: unknown)`.
- Trata erro com helper central.
- Não tem comentário temporário.
- Não tem regra de negócio no front.
- Tem teste quando houver regra relevante.

## Regra final

Se uma implementação exigir muitos ifs, muitas exceções ou muito acoplamento entre front e servidor, pare e revise a modelagem antes de continuar.
