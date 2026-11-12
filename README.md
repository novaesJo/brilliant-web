# 👟 SneakerClean - Sistema de Gestão de Limpeza de Tênis

Sistema full-stack completo, responsivo e moderno desenvolvido sob medida para a gestão e linha de produção de uma empresa de higienização e limpeza de tênis.

---

## 🎨 Identidade Visual e Paleta de Cores
O sistema foi desenvolvido seguindo rigorosamente a paleta de cores solicitada:
- **Branco:** `#FFFFFF` (Superfícies e cards)
- **Azul Claro:** `#7EB6E6` (Destaques, badges e interações)
- **Azul Marinho:** `#1D5D9B` (Ações principais e cabeçalhos)
- **Azul Escuro:** `#0C2D48` (Tipografia principal e cabeçalho primário)

---

## 🚀 Stack Tecnológica
* **Backend:** Python com Flask e Flask-CORS.
* **Banco de Dados:** SQLite (banco relacional local com integridade referencial ativa).
* **Frontend:** HTML5 semântico, CSS3 moderno (variáveis CSS, flexbox e CSS grid responsivo) e Vanilla JS (JavaScript puro com Fetch API).

---

## 📂 Arquitetura de Pastas

```text
tenis_cleaner_app/
│
├── backend/
│   ├── app.py                 # Ponto de entrada (Servidor Flask e arquivos estáticos)
│   ├── database.py            # Conexão, DDL e inicialização do SQLite
│   ├── models/                # Regras de dados e queries relacionais
│   │   ├── client_model.py    # CRUD de clientes e histórico de compras
│   │   ├── order_model.py     # Gestão do pedido, ciclo de vida e auditoria
│   │   └── payment_model.py   # Precificação, métricas financeiras e PIX
│   └── controllers/           # Endpoints REST e lógica de rotas
│       ├── client_controller.py
│       ├── order_controller.py
│       ├── calendar_controller.py
│       └── dashboard_controller.py
│
├── frontend/
│   ├── index.html             # Interface completa (Dashboard, Linha de Produção, Clientes, Calendário)
│   ├── css/
│   │   └── style.css          # Estilização completa na paleta solicitada
│   └── js/
│       ├── api.js             # Módulo Fetch API centralizado e utilitários
│       ├── dashboard.js       # Gráficos e indicadores financeiros
│       ├── clients.js         # CRUD de Clientes e WhatsApp
│       ├── orders.js          # Linha de produção, regras de preço e status
│       └── calendar.js        # Calendário mensal e histórico
│
└── requirements.txt           # Dependências Python (Flask, Flask-CORS, etc.)
```

---

## 📋 Regras de Negócio Implementadas

### 1. Gestão de Clientes
- **CRUD completo:** Criação, Busca instantânea, Edição e Exclusão.
- **Campos obrigatórios:** Nome e Telefone com DDD (WhatsApp).
- **Atalhos rápidos:** Botão de WhatsApp direto (`wa.me`) para conversa e visualização de todos os pedidos realizados pelo cliente.

### 2. Gestão de Pedidos e Linha de Produção
- **Dados do Tênis:** Marca e Cor com seletor rápido (**Branco** ou **Colorido**). Suporta pedidos com múltiplos pares de tênis!
- **Tipo de Serviço:** Padrão ("*Limpeza completa*").
- **Regra de Precificação (Promoção Automática):**
  - **1 par de tênis:** R$ 35,00
  - **2 ou mais pares:** R$ 30,00 por par (Ex: 2 pares = R$ 60,00 | 3 pares = R$ 90,00)
  - Calculadora dinâmica no formulário mostrando em tempo real o desconto aplicado.
- **Ciclo de Vida do Pedido:**
  1. `Aguardando pagamento`
  2. `Pagamento realizado`
  3. `Lavando`
  4. `Secando`
  5. `Pronto para entrega`
  6. `Entregue`
- **Upload de Fotos Antes & Depois:**
  - Modal interativo no pedido para upload das fotos de "Antes" e "Depois" de cada par de tênis, com pré-visualização lado a lado.

### 3. Gestão Financeira & Condição de Entrega
- **Formas de Pagamento Permitidas:** `PIX` e `Dinheiro físico`.
- **Status de Pagamento:** `Pendente` e `Pago`.
- **Condição Crítica de Entrega:**
  > ⚠️ **A entrega do tênis está estritamente condicionada ao status "Pago".**
  > Se o operador tentar mover o pedido para "Entregue" com pagamento "Pendente", o sistema bloqueia e abre uma tela de confirmação de recebimento (PIX ou Dinheiro) para validar a entrega com 1 clique.

### 4. Notificação e Integração com WhatsApp
- Quando o status atinge **"Pronto para entrega"**, o sistema gera automaticamente o link com mensagem personalizada para o WhatsApp do cliente.
- Caso o status de pagamento esteja **"Pendente"**, o sistema gera **exatamente** o texto solicitado:
  ```text
  ✨Olá, seus tênis estão prontos, aguardando o pagamento!

  💰 Valor: R$ {valor_total_do_pedido}
  🔑 Chave pix: 67998570731
  👤 Nome: João Ricardo Albuquerque Novaes
  ```
- Botões de conveniência: **"Abrir WhatsApp"**, **"Copiar Mensagem"** e **"Copiar Chave PIX"**.

### 5. Calendário & Histórico (Auditoria)
- **Calendário Mensal Interativo:** Mostra no dia a quantidade de serviços **Iniciados**, **Prontos** e **Entregues**.
- **Painel de Detalhes Diários:** Clique em qualquer dia para ver os pedidos daquela data.
- **Auditoria / Correção de Erros:** Modal avançado para modificar pedidos anteriores (datas de entrada/conclusão/entrega, status, notas) mantendo um histórico auditável de cada alteração com carimbo de data e hora.

### 6. Dashboard Financeiro
- **Faturamento do Dia:** Total recebido hoje.
- **Faturamento da Semana:** Total recebido nos últimos 7 dias.
- **Faturamento do Mês:** Total recebido no mês vigente.
- **Gráfico Interativo de Barras:** Evolução diária do faturamento nos últimos 7 dias com tooltips.
- **Pipeline de Produção:** Distribuição percentual dos pedidos em cada etapa.
- **Métricas adicionais:** Proporção de tênis Brancos vs Coloridos, Marcas mais frequentes e Total a Receber (Pendente).

---

## 💻 Como Executar

### Opção 1: Execução com 1 Clique (Windows)
Basta dar um duplo clique no arquivo:
```cmd
iniciar.bat
```
Ele abrirá automaticamente o navegador em `http://127.0.0.1:5000` e iniciará o servidor Flask.

### Opção 2: Linha de Comando (PowerShell / Terminal)
1. Instale as dependências (caso ainda não estejam instaladas):
   ```bash
   pip install -r tenis_cleaner_app/requirements.txt
   ```
2. Inicie a aplicação:
   ```bash
   python run.py
   ```
3. Acesse no seu navegador:
   ```text
   http://127.0.0.1:5000
   ```
