# Integração do frontend com a API AgroLider

## Sessão e transporte

O backend NestJS usa JWT Bearer, retorna `accessToken` em JSON no login e não cria cookies. O Next.js implementa um BFF em `/api/auth/*` e `/api/backend/*`; o token não é devolvido ao navegador e fica em cookie `HttpOnly`, `SameSite=Strict` e `Secure` em produção. Rotas de alteração validam o cabeçalho `Origin` contra a origem da aplicação. O BFF chama o Nest no servidor, então o navegador não depende de CORS.

Configure `API_URL` no ambiente do servidor Next.js (padrão local `http://localhost:3000`). Não configure URL da API como `NEXT_PUBLIC_*`. O Next pode usar a porta 3001 para evitar conflito com o Nest.

## Endpoints e contratos verificados

| Área | Endpoint(s) | Operações principais | Autorização / observações |
| --- | --- | --- | --- |
| Sessão | `POST /auth/login`, `GET /auth/me`, `POST /auth/password/change`, `POST /auth/logout` | Login, perfil, troca obrigatória de senha, revogação | Login entrega token e `mustChangePassword`; troca requer senha atual, nova senha e confirmação. |
| Produtos | `GET/POST /products`, `GET/PATCH /products/:id`, `PATCH /products/:id/activate`, `PATCH /products/:id/deactivate` | Busca paginada por nome/SKU, cadastro e status | Permissões `products.*`; nome, unidade e preço são dados contratuais. |
| Estoque | `GET /stock/balances`, `GET /stock/movements`, `POST /stock/entries`, `/exits`, `/adjustments` | Saldo físico/reservado/disponível, histórico e movimentações | `stock.*`; saídas são validadas no servidor. Quantidades são strings decimais. |
| Produtos/estoque | `GET /products/:id/stock`, `GET /products/:id/stock-movements`, `GET /stock/movements/:id`, `POST /stock/movements/:id/corrections` | Saldo e histórico por produto; correção compensatória | Permissões `products.stock.read`, `stock.movements.read`, `stock.adjust`. |
| Clientes | `GET/POST /customers`, `GET/PATCH /customers/:id`, `GET /customers/by-document?document=...`, `PATCH /customers/:id/activate|deactivate`, `GET /customers/:id/orders` | Lista, busca, cadastro, status e pedidos | `customers.*`; CPF/CNPJ e unicidade são validados pelo backend. |
| Pedidos | `GET /orders`, `GET /orders/my-orders`, `POST /orders`, `GET /orders/:id`, `GET /orders/:id/history`, `POST /orders/:id/cancel` | Consulta paginada, criação, histórico e cancelamento | `orders.read`, `orders.read.all`, `orders.create`, `orders.cancel`; vendedor autenticado é inferido pelo JWT. Criação reserva estoque. |
| Logística | `GET /logistics/orders`, `GET /logistics/orders/:id`, `POST /logistics/orders/:id/start-processing`, `/ready-for-shipment`, `/dispatch`, `/confirm-delivery` | Fila e transições de logística | `logistics.orders.*`; despacho baixa o físico e consome a reserva. |
| Usuários | `GET/POST /users`, `GET/PATCH /users/:id`, `PATCH /users/:id/status`, `PUT /users/:id/password`, `PUT /users/:id/roles`, `DELETE /users/:id` | Administração de contas | `users.*` e `roles.assign`; a senha de criação é provisória e exige troca inicial. |
| Roles | `GET/POST /roles`, `GET/PATCH/DELETE /roles/:id`, `POST /roles/:id/permissions`, `DELETE /roles/:id/permissions/:permissionId` | Papéis e associações de permissões | `roles.*`; papéis de sistema são protegidos no backend. |
| Permissões | `GET/POST /permissions`, `GET /permissions/:id`, `GET /permissions/slug/:slug`, `PATCH/DELETE /permissions/:id` | Catálogo de permissões | `permissions.*`; permissões de sistema e associadas têm restrições no backend. |

As coleções usam respostas paginadas `{ items, page, limit, total }`. Endpoints de estoque, pedidos, logística e autenticação foram conferidos nos controllers e DTOs existentes no workspace.

## Navegação e rota inicial

- A rota inicial autenticada é `/produtos` (`lib/routes.ts`), usada em `/`, após login e após a troca obrigatória de senha. A troca de senha tem prioridade.
- Como `/auth/me` não expõe permissões efetivas, não é possível escolher outra rota inicial nem ocultar itens por permissão; o backend continua retornando 403 quando necessário.
- Desktop (≥1024px): sidebar recolhível. Tablet (768–1023px): sidebar compacta. Celular (<768px): barra inferior com Produtos, Estoque, Pedidos, Clientes e Menu (sheet com os demais módulos). Não há rota de Configurações, Entradas, Saídas ou Ajustes separadas: entradas/saídas/ajustes ficam em `/estoque`.

## Permissões no menu e nas rotas

- `GET /auth/me` passou a devolver `permissions` (slugs, ex.: `products.read`), lidas do mesmo `request.user.permissions` que o `PermissionsGuard` usa. As roles continuam em `roles`.
- Cada item de [nav-config.ts](../components/nav-config.ts) declara os slugs reais exigidos pelo endpoint de listagem da tela (qualquer um deles libera). `lib/auth/access.ts` concentra a regra: sidebar, barra inferior, menu "Mais" e guarda de rota usam `filterNavigation`/`canAccessPath`. Sem permissão, ou se `permissions` não vier, nada protegido aparece (falha fechada). Grupos vazios são ocultados.
- Rota sem permissão exibe "Acesso negado" no `AppShell`, sem montar a página; no home `/produtos`, redireciona ao primeiro módulo autorizado. O backend continua validando cada operação.
- A sessão é revalidada ao voltar o foco à aba, refletindo mudanças de permissão.

## Vitrine pública

- `/` é pública e lista `GET /products/public` (backend: `@Public()`, retorna todos os produtos ativos, sem paginação ou busca; formato `ProductResponseDto[]` com `images[{ id, url, contentType }]`). A busca na tela é apenas um filtro local sobre a lista recebida.
- A chamada passa pelo BFF em `GET /api/backend/products/public`, a única exceção que dispensa sessão e não envia credenciais ao Nest. Demais recursos continuam exigindo cookie.
- O item "Vitrine de Produtos" do menu (apenas na área autenticada) abre `/`, que reutiliza o mesmo `ProductShowcase`. O cabeçalho mostra "Acessar o sistema" quando há sessão e "Entrar" caso contrário.
- O logout volta para `/`; sessão expirada continua levando a `/login`.

## Imagens de produtos

- `POST /products` aceita `images?: { base64: string; fileName?: string }[]` (máx. 20 no DTO; padrão do processador: 5 imagens de até 5 MB, configuráveis por `PRODUCT_IMAGE_MAX_COUNT` e `PRODUCT_IMAGE_MAX_SIZE_BYTES`). `base64` é uma Data URL (`data:image/jpeg|png|webp;base64,...`) ou Base64 puro; o frontend envia Data URL. O MIME declarado deve coincidir com o conteúdo.
- Respostas de produto trazem `images: { id, url, contentType }[]`. A `url` é pública ou assinada (1 h), conforme `SUPABASE_STORAGE_PUBLIC`, e é usada diretamente.
- O upload passa sempre pela API; o frontend não usa credenciais do Supabase.
- Limitação: `PATCH /products/:id` não aceita `images` e não há endpoint para adicionar/remover imagens. A edição apenas exibe as imagens existentes.

## Limitações do contrato atual

- `GET /auth/me` retorna `id`, `name`, `email`, `roles` e `mustChangePassword`, mas não as permissões efetivas. Não existe endpoint de permissões do usuário atual. A interface pode apresentar os grupos de navegação; o backend continua sendo a autoridade e retorna 403 nas operações não autorizadas. A filtragem precisa de permissões específicas no menu depende de o backend expor essa informação.
- O Nest não habilita CORS em `main.ts`; o BFF evita chamadas do navegador diretamente ao Nest, sem alterar essa configuração.
- A interface já cobre criação/edição cadastral de produtos, clientes e usuários, ativação/desativação, atribuição de roles a usuários, associação/remoção de permissões em roles, correção compensatória de movimentações e consulta do histórico de pedidos. Ainda não há formulários de edição de roles/permissões, nem busca avançada de pedidos por período/status/cliente ou exibição do detalhe logístico completo.
- A API não fornece um endpoint agregado de dashboard nem define critérios de estoque baixo. O painel usa apenas totais paginados e pedidos reais; não inventa indicadores ou limiares.
