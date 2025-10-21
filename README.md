Projeto TOT - Nível 14
======================

Resumo
------
O projeto TOT representa o avanço do nível 13, mantendo a arquitetura completa com microserviços, Traefik SAFE e front-end polido, e adicionando autenticação JWT completa com refresh token. 
A aplicação é modular, containerizada e pronta para produção, desenvolvida integralmente via WSL e terminal, seguindo o padrão fixo dos projetos anteriores.

Arquitetura
------------
- Microserviços independentes:
  - auth-service: autenticação e geração de tokens
  - catalog-service: catálogo de produtos
  - orders-service: criação de pedidos
  - notifications-service: simulação de eventos e notificações
  - web: front-end React + Vite
- Infraestrutura gerenciada pelo Traefik SAFE como reverse proxy
- Banco de dados PostgreSQL e cache Redis
- Todos os serviços interligados pela mesma rede Docker
- Healthcheck configurado no Postgres
- provider.docker habilitado e api.insecure removido em produção

Traefik SAFE
------------
- Entrypoints definidos:
  - web = :8880
  - websecure = :8443
- Cada serviço com PathPrefix distinto
- server.port declarado corretamente
- build.context correto em todos os containers
- provider.docker = true

Autenticação JWT
----------------
- Registro e login de usuários
- Senhas armazenadas com hash (bcrypt)
- JWT de acesso com expiração curta (15 minutos)
- JWT de refresh com expiração longa (14 dias)
- Rota /refresh para renovação segura do token
- Middleware de proteção para rotas privadas
- Logout invalida o refresh token
- Tokens armazenados no front-end e renovados automaticamente

Banco e Cache
--------------
- PostgreSQL configurado via docker-compose
- Redis utilizado para controle de sessões e refresh tokens
- Healthcheck automático no Postgres antes da subida dos serviços

Front-end
----------
- Framework: React + Vite
- UI moderna com TailwindCSS
- Layout responsivo, polido e funcional
- Telas: Login, Registro, Dashboard protegida
- Dashboard com:
  - Listagem de produtos com busca e ordenação
  - Criação de novos produtos (POST /catalog/items)
  - Botão "Comprar" com modal de confirmação
- Armazenamento local dos tokens
- Renovação automática de tokens via /refresh
- Rotas privadas bloqueadas sem JWT

Execução local
---------------
1. Clonar o repositório
2. Criar o arquivo .env a partir do .env.example:
   cp .env.example .env
3. Build e inicialização:
   docker compose -f infra/docker-compose.yml build
   docker compose -f infra/docker-compose.yml up -d
4. Testes iniciais:
   curl -s http://localhost:8880/auth/health && echo
   curl -s http://localhost:8880/catalog/health && echo
   curl -s http://localhost:8880/orders/health && echo
   curl -s http://localhost:8880/ws/health && echo
5. Acesso pelo navegador:
   http://localhost:8880/app

Smoke test completo
-------------------
1. Registro:
   curl -s -X POST http://localhost:8880/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"123456"}' | jq .
2. Login:
   curl -s -X POST http://localhost:8880/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"123456"}' | jq .
3. Salvar tokens:
   AT=$(echo "$LOGIN" | jq -r .accessToken)
   RT=$(echo "$LOGIN" | jq -r .refreshToken)
4. Requisição protegida:
   curl -s http://localhost:8880/catalog/items -H "Authorization: Bearer $AT" | jq .
5. Refresh token:
   curl -s -X POST http://localhost:8880/auth/refresh \
     -H "Content-Type: application/json" \
     -d "{\"refreshToken\":\"$RT\"}" | jq .

Deploy
------
A aplicação é totalmente deployável em VPS ou plataforma como Render. O Traefik SAFE mantém isolamento e segurança, sem uso das portas 80/443, apenas 8880 e 8443.

GitHub
------
Para publicar o projeto:
cd ~/tot
git init
git add .
git commit -m "Nível 14 - Projeto TOT com Traefik SAFE + JWT Refresh Token"
git branch -M main
git remote add origin https://github.com/iangama/tot.git
git push -u origin main
Quando solicitado:
Username: iangama
Password: (cole seu Personal Access Token Classic)

Classificação
--------------
Nível 14 - Projeto profissional de produção.
Evolui o nível 13 adicionando autenticação JWT completa e refinamentos no polish visual e na integração de serviços.
