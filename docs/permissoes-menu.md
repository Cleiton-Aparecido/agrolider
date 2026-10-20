# Permissões necessárias por item do menu

Fonte da regra no frontend: [`components/nav-config.ts`](../components/nav-config.ts) (campo `permissions`) e [`lib/auth/access.ts`](../lib/auth/access.ts).
Os slugs são os mesmos do backend (`@RequirePermissions`), entregues ao frontend em `GET /auth/me` → `permissions`.

## Como funciona

- O item só aparece se o usuário tiver **pelo menos uma** das permissões listadas em "Libera o menu" (regra any-of).
- Acessar a URL diretamente sem a permissão mostra "Acesso negado" (a página nem é montada).
- Grupos sem nenhum item visível são ocultados. Sem permissão alguma, nada protegido aparece.
- O backend valida **todas** as permissões exigidas pela rota (regra every) em qualquer chamada. Ver o menu não garante que cada ação funcione.
- Permissões vêm das roles do usuário. Se mudar a role, o menu atualiza ao voltar o foco à aba ou ao fazer novo login.

## Menu

| Grupo | Item (rota) | Libera o menu | Necessárias para a tela funcionar por completo |
|---|---|---|---|
| Comercial | Vitrine (`/`) | nenhuma (pública) | — |
| Comercial | Produtos (`/produtos`) | `products.read` | Criar/editar: `products.create`, `products.update`. Ativar: `products.update`. Desativar: `products.deactivate` |
| Comercial | Clientes (`/clientes`) | `customers.read` | Criar: `customers.create`. Editar/ativar: `customers.update`. Desativar: `customers.deactivate`. Pedidos do cliente: `orders.read` |
| Comercial | Pedidos (`/pedidos`) | `orders.read` | Criar: `orders.create`. Cancelar: `orders.cancel`. O formulário carrega clientes e produtos, então também exige `customers.read` e `products.read` |
| Estoque | Visão geral (`/estoque`) | `stock.read` | Lista de produtos nos formulários: `products.read`. Entrada: `stock.entry`. Saída: `stock.exit`. Ajuste: `stock.adjust` |
| Estoque | Movimentações (`/movimentacoes`) | `stock.movements.read` | Corrigir movimentação: `stock.adjust` |
| Operações | Logística (`/logistica`) | `logistics.orders.read` | Iniciar separação: `logistics.orders.process`. Pronto para envio: `logistics.orders.prepare-shipment`. Despachar: `logistics.orders.dispatch`. Confirmar entrega: `logistics.orders.confirm-delivery` |
| Operações | Painel (`/dashboard`) | qualquer uma de `products.read`, `customers.read`, `orders.read` | Cada cartão consulta o próprio módulo; sem a permissão correspondente mostra "Sem acesso" |
| Administração | Usuários (`/usuarios`) | `users.read` | Criar/editar: `users.create`, `users.update`. Ativar/inativar: `users.status`. Redefinir senha: `users.password.reset`. Atribuir roles: `roles.assign`. Excluir: `users.delete`. A tela também lista roles, então exige `roles.read` |
| Administração | Roles (`/roles`) | `roles.read` | Criar/editar: `roles.create`, `roles.update`. Vincular/remover permissões: `roles.assign`. Excluir: `roles.delete`. A tela também lista permissões, então exige `permissions.read` |
| Administração | Permissões (`/permissoes`) | `permissions.read` | Criar/editar: `permissions.create`, `permissions.update`. Excluir: `permissions.delete` |

Em celulares, a barra inferior mostra Produtos, Estoque, Pedidos e Clientes (quando permitidos); os demais itens ficam no menu "Mais".

## Exemplo: role "Vendedor" (fazer pedidos)

Mínimo para ver Produtos, Clientes e Pedidos e criar pedidos:

| Permissão | Para quê |
|---|---|
| `products.read` | Menu Produtos e seleção de produtos no pedido |
| `customers.read` | Menu Clientes e seleção/busca de cliente no pedido |
| `orders.read` | Menu Pedidos, histórico e detalhes |
| `orders.create` | Criar pedido |

Opcionais:

| Permissão | Para quê |
|---|---|
| `customers.create` / `customers.update` | Cadastrar e editar clientes |
| `orders.cancel` | Cancelar pedidos |
| `stock.read` | Consultar saldo de estoque (menu Estoque) |
| `products.stock.read` | Consultar saldo de um produto (`GET /products/:id/stock`) |

Com isso o Painel também aparece (basta uma das três leituras). Administração, Logística e Movimentações permanecem ocultas.

## Observações

- Sem `products.read` ou `customers.read`, o usuário vê Pedidos, mas a criação de pedido não carrega as listas de apoio.
- `/produtos` é a tela inicial pós-login. Sem `products.read`, o usuário é levado ao primeiro módulo permitido.
- Para conferir as permissões de um usuário: `GET /auth/me` (campo `permissions`).
