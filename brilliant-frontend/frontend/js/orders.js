/**
 * orders.js - Linha de Produção, Ciclo de Vida, Precificação e WhatsApp
 * SneakerClean - Gestão de Limpeza de Tênis
 */

const Orders = {
    ordersList: [],
    currentViewMode: 'kanban', // 'kanban' ou 'table'
    sneakerItemsInModal: [],
    currentOrderIdForPhotos: null,
    currentOrderIdForDeliveryPending: null,

    ORDER_STAGES: [
        'Aguardando pagamento',
        'Pagamento realizado',
        'Lavando',
        'Secando',
        'Pronto para entrega',
        'Entregue'
    ],

    productsList: [],

    async init() {
        this.bindEvents();
        await this.loadProducts();
        await this.loadOrders();
    },

    bindEvents() {
        // Toggle de visualização (Kanban vs Tabela)
        const btnKanban = document.getElementById('view-kanban-btn');
        const btnTable = document.getElementById('view-table-btn');
        if (btnKanban && btnTable) {
            btnKanban.addEventListener('click', () => this.switchView('kanban'));
            btnTable.addEventListener('click', () => this.switchView('table'));
        }

        // Filtros e busca de pedidos
        const searchInput = document.getElementById('order-search-input');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.loadOrders();
                }, 300);
            });
        }

        const statusFilter = document.getElementById('order-status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.loadOrders());
        }

        const paymentFilter = document.getElementById('order-payment-filter');
        if (paymentFilter) {
            paymentFilter.addEventListener('change', () => this.loadOrders());
        }

        // Submissão do formulário de novo pedido
        const orderForm = document.getElementById('order-modal-form');
        if (orderForm) {
            orderForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveOrder();
            });
        }
    },

    switchView(mode) {
        this.currentViewMode = mode;
        const btnKanban = document.getElementById('view-kanban-btn');
        const btnTable = document.getElementById('view-table-btn');
        const kanbanBoard = document.getElementById('kanban-board-view');
        const tableView = document.getElementById('table-orders-view');

        if (mode === 'kanban') {
            btnKanban?.classList.add('active');
            btnTable?.classList.remove('active');
            if (kanbanBoard) kanbanBoard.style.display = 'flex';
            if (tableView) tableView.style.display = 'none';
        } else {
            btnTable?.classList.add('active');
            btnKanban?.classList.remove('active');
            if (kanbanBoard) kanbanBoard.style.display = 'none';
            if (tableView) tableView.style.display = 'block';
        }
    },

    async loadOrders() {
        try {
            const search = document.getElementById('order-search-input')?.value || '';
            const status = document.getElementById('order-status-filter')?.value || '';
            const payment_status = document.getElementById('order-payment-filter')?.value || '';

            const orders = await API.getOrders({ search, status, payment_status });
            this.ordersList = orders || [];

            this.renderKanban(this.ordersList);
            this.renderTable(this.ordersList);
            return this.ordersList;
        } catch (err) {
            console.error("Erro ao listar pedidos:", err);
            Utils.showToast("Falha ao carregar pedidos.", "danger");
            return [];
        }
    },

    renderKanban(orders) {
        const board = document.getElementById('kanban-board-view');
        if (!board) return;

        board.innerHTML = '';

        this.ORDER_STAGES.forEach(stage => {
            const columnOrders = orders.filter(o => o.status === stage);

            const colDiv = document.createElement('div');
            colDiv.className = 'kanban-column';
            colDiv.innerHTML = `
                <div class="kanban-column-header">
                    <span class="col-title">${this.getStageIcon(stage)} ${stage}</span>
                    <span class="col-badge">${columnOrders.length}</span>
                </div>
                <div class="kanban-cards-container" id="kanban-col-${this.slugify(stage)}">
                    ${columnOrders.length === 0 ? '<div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; margin-top: 2rem;">Nenhum pedido</div>' : ''}
                </div>
            `;

            board.appendChild(colDiv);

            const cardsContainer = colDiv.querySelector('.kanban-cards-container');
            columnOrders.forEach(order => {
                cardsContainer.appendChild(this.createOrderCardElement(order));
            });
        });
    },

    createOrderCardElement(order) {
        const card = document.createElement('div');
        card.className = 'order-card';

        const itemsHtml = order.items && order.items.length > 0 ? order.items.map((it, idx) => `
            <div class="item-row">
                <span class="sneaker-tag">#${idx+1} ${it.brand}</span>
                <span class="color-indicator ${it.color_type.toLowerCase()}">${it.color_type}</span>
            </div>
        `).join('') : '<span style="color: var(--text-muted);">Limpeza Padrão</span>';

        const nextStage = this.getNextStage(order.status);

        card.innerHTML = `
            <div class="card-top">
                <span class="order-id-badge">#${order.id}</span>
                <span class="order-client-phone">${Utils.formatPhone(order.client_phone)}</span>
            </div>
            <div>
                <div class="order-client-name">${order.client_name}</div>
                <div style="font-size: 0.76rem; color: var(--text-muted);">${Utils.formatDate(order.created_at)} • ${order.service_type}</div>
            </div>
            <div class="order-items-list">
                ${itemsHtml}
            </div>
            <div class="card-pricing-row">
                <span class="price-tag">${Utils.formatCurrency(order.total_price)}</span>
                <div style="display: flex; gap: 4px; align-items: center;">
                    <span class="badge-payment ${order.payment_status.toLowerCase()}">${order.payment_status}</span>
                    <button class="btn-icon-subtle" title="Alternar Pagamento" onclick="Orders.togglePaymentQuick(${order.id}, '${order.payment_status}')">💳</button>
                </div>
            </div>
            <div class="card-media-row">
                <button class="btn-photo-modal" onclick="Orders.openPhotoModal(${order.id})">
                    📷 Fotos Antes / Depois (${order.items ? order.items.filter(i => i.before_image || i.after_image).length : 0})
                </button>
            </div>
            <div class="card-actions-row">
                <button class="btn-whatsapp-action" title="Notificar via WhatsApp" onclick="Orders.openWhatsAppModal(${order.id})">
                    WhatsApp
                </button>
                ${nextStage ? `
                    <button class="btn-step-next" onclick="Orders.advanceStatus(${order.id}, '${order.status}', '${order.payment_status}')">
                        Avançar ➔
                    </button>
                ` : ''}
                <button class="btn-edit-order" title="Auditoria & Histórico" onclick="Orders.openAuditModal(${order.id})">editar</button>
                <button class="btn-delete-order-x" title="Excluir Pedido" onclick="Orders.confirmDeleteOrder(${order.id})">X</button>
            </div>
        `;

        return card;
    },

    renderTable(orders) {
        const tbody = document.getElementById('orders-table-tbody');
        if (!tbody) return;

        if (!orders || orders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">Nenhum pedido encontrado.</td></tr>`;
            return;
        }

        tbody.innerHTML = orders.map(o => {
            const sneakers = o.items ? o.items.map(i => `${i.brand} (${i.color_type})`).join(', ') : '-';
            return `
                <tr>
                    <td><strong>#${o.id}</strong></td>
                    <td>
                        <div style="font-weight: 700;">${o.client_name}</div>
                        <small style="color: var(--text-muted);">${Utils.formatPhone(o.client_phone)}</small>
                    </td>
                    <td>
                        <div style="font-weight: 600;">${o.pair_count} par(es)</div>
                        <small style="color: var(--text-secondary);">${sneakers}</small>
                    </td>
                    <td><strong>${Utils.formatCurrency(o.total_price)}</strong></td>
                    <td>
                        <span class="badge-payment ${o.payment_status.toLowerCase()}">${o.payment_status}</span>
                        <div style="font-size: 0.72rem; color: var(--text-muted);">${o.payment_method || '-'}</div>
                    </td>
                    <td>
                        <span class="status-pill ${Dashboard.getStatusClass(o.status)}">${o.status}</span>
                    </td>
                    <td>${Utils.formatDate(o.created_at)}</td>
                    <td>
                        <div style="display: flex; gap: 0.35rem;">
                            <button class="btn-icon-subtle" title="Fotos" onclick="Orders.openPhotoModal(${o.id})">📷</button>
                            <button class="btn-icon-subtle" title="WhatsApp" onclick="Orders.openWhatsAppModal(${o.id})">💬</button>
                            <button class="btn-icon-subtle" title="Editar / Auditar" onclick="Orders.openAuditModal(${o.id})">✏️</button>
                            <button class="btn-icon-subtle" style="color: #EF4444;" title="Excluir" onclick="Orders.confirmDeleteOrder(${o.id})">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    getNextStage(currentStage) {
        const idx = this.ORDER_STAGES.indexOf(currentStage);
        if (idx >= 0 && idx < this.ORDER_STAGES.length - 1) {
            return this.ORDER_STAGES[idx + 1];
        }
        return null;
    },

    getStageIcon(stage) {
        switch (stage) {
            case 'Aguardando pagamento': return '⏳';
            case 'Pagamento realizado': return '💳';
            case 'Lavando': return '🧼';
            case 'Secando': return '💨';
            case 'Pronto para entrega': return '✨';
            case 'Entregue': return '📦';
            default: return '👟';
        }
    },

    slugify(text) {
        return text.toLowerCase().replace(/[^\w]/g, '-');
    },

    // ----------------------------------------------------
    // Transições de Status e Validação da Regra de Entrega
    // ----------------------------------------------------
    async advanceStatus(orderId, currentStatus, paymentStatus) {
        const nextStatus = this.getNextStage(currentStatus);
        if (!nextStatus) return;

        // REGRA DE NEGÓCIO CONDICIONAL DE ENTREGA:
        // A entrega do tênis está estritamente condicionada ao status 'Pago'
        if (nextStatus === 'Entregue' && paymentStatus !== 'Pago') {
            this.currentOrderIdForDeliveryPending = orderId;
            const modal = document.getElementById('delivery-payment-required-modal');
            const order = this.ordersList.find(o => o.id === orderId);
            if (modal) {
                document.getElementById('delivery-pending-amount-txt').textContent = order ? Utils.formatCurrency(order.total_price) : '';
                modal.classList.add('active');
            }
            return;
        }

        try {
            const res = await API.updateOrderStatus(orderId, nextStatus);
            Utils.showToast(`Status atualizado para "${nextStatus}"!`);

            if (nextStatus === 'Pronto para entrega') {
                this.openWhatsAppModal(orderId);
            }

            await this.loadOrders();
            if (window.Dashboard) window.Dashboard.loadMetrics();
        } catch (err) {
            Utils.showToast(err.message, "danger");
        }
    },

    async confirmDeliveryWithPayment(method) {
        if (!this.currentOrderIdForDeliveryPending) return;
        const orderId = this.currentOrderIdForDeliveryPending;

        try {
            await API.updateOrderPayment(orderId, 'Pago', method);
            await API.updateOrderStatus(orderId, 'Entregue');

            Utils.showToast(`Pagamento via ${method} registrado e tênis marcado como Entregue!`);
            this.closeDeliveryPaymentModal();
            await this.loadOrders();
            if (window.Dashboard) window.Dashboard.loadMetrics();
        } catch (err) {
            Utils.showToast(err.message, "danger");
        }
    },

    closeDeliveryPaymentModal() {
        document.getElementById('delivery-payment-required-modal').classList.remove('active');
        this.currentOrderIdForDeliveryPending = null;
    },

    async togglePaymentQuick(orderId, currentStatus) {
        const nextStatus = currentStatus === 'Pago' ? 'Pendente' : 'Pago';
        const method = prompt(`Alternar status de pagamento para "${nextStatus}".\nInforme a forma de pagamento (PIX ou Dinheiro físico):`, 'PIX');
        if (!method) return;

        try {
            await API.updateOrderPayment(orderId, nextStatus, method);
            Utils.showToast(`Pagamento atualizado para "${nextStatus}"!`);
            await this.loadOrders();
            if (window.Dashboard) window.Dashboard.loadMetrics();
        } catch (err) {
            Utils.showToast(err.message, "danger");
        }
    },

    // ----------------------------------------------------
    // Modal de Novo Pedido & Calculadora Promocional
    // ----------------------------------------------------
    async openNewOrderModal() {
        // 1. Atualizar e carregar a lista de clientes para o dropdown e produtos
        if (window.Clients) {
            await Clients.loadClients();
        }
        await this.loadProducts();

        const defaultProdId = this.productsList && this.productsList.length > 0 ? this.productsList[0].id : 1;
        const defaultProdName = this.productsList && this.productsList.length > 0 ? this.productsList[0].name : 'Limpeza Completa';

        // 2. Resetar itens para 1 par inicial
        this.sneakerItemsInModal = [
            { brand: 'Nike Air Force', color_type: 'Branco', product_id: defaultProdId, service_name: defaultProdName, details: '' }
        ];

        // 3. Selecionar o primeiro cliente se houver opções
        const clientSelect = document.getElementById('order-client-select');
        if (clientSelect) {
            if (clientSelect.options.length > 1) {
                clientSelect.selectedIndex = 1; // Seleciona o 1º cliente cadastrado
            } else {
                clientSelect.value = "";
            }
        }

        // Limpar campos de cliente rápido
        const newClientName = document.getElementById('order-new-client-name');
        if (newClientName) newClientName.value = '';
        const newClientPhone = document.getElementById('order-new-client-phone');
        if (newClientPhone) newClientPhone.value = '';

        // Resetar para modo de cliente existente
        this.toggleClientMode('existing');

        const paymentMethod = document.getElementById('order-payment-method');
        if (paymentMethod) paymentMethod.value = "PIX";
        const paymentStatus = document.getElementById('order-payment-status');
        if (paymentStatus) paymentStatus.value = "Pendente";
        const notes = document.getElementById('order-notes-input');
        if (notes) notes.value = "";

        this.renderSneakerItemsInModal();
        document.getElementById('order-modal').classList.add('active');
    },

    closeOrderModal() {
        document.getElementById('order-modal').classList.remove('active');
    },

    toggleClientMode(mode) {
        const existingGroup = document.getElementById('client-select-existing-group');
        const newGroup = document.getElementById('client-new-quick-group');
        const tabExisting = document.getElementById('tab-client-existing');
        const tabNew = document.getElementById('tab-client-new');

        if (mode === 'new') {
            if (existingGroup) existingGroup.style.display = 'none';
            if (newGroup) newGroup.style.display = 'block';
            if (tabExisting) tabExisting.classList.remove('active');
            if (tabNew) tabNew.classList.add('active');
        } else {
            if (existingGroup) existingGroup.style.display = 'block';
            if (newGroup) newGroup.style.display = 'none';
            if (tabExisting) tabExisting.classList.add('active');
            if (tabNew) tabNew.classList.remove('active');
        }
    },

    collectSneakerItemsFromDOM() {
        const container = document.getElementById('sneaker-items-container');
        if (!container) return this.sneakerItemsInModal;

        const cards = container.querySelectorAll('.sneaker-item-card');
        if (!cards || cards.length === 0) return this.sneakerItemsInModal;

        const items = [];
        cards.forEach((card) => {
            const brandInput = card.querySelector('.sneaker-brand-input');
            const colorSelect = card.querySelector('.sneaker-color-select');
            const productSelect = card.querySelector('.sneaker-product-select');
            const detailsInput = card.querySelector('.sneaker-details-input');

            const pid = productSelect ? parseInt(productSelect.value) : (this.productsList[0]?.id || 1);
            const selectedOpt = productSelect ? productSelect.options[productSelect.selectedIndex] : null;
            const serviceName = selectedOpt ? selectedOpt.getAttribute('data-name') : 'Limpeza Completa';

            items.push({
                brand: brandInput ? brandInput.value.trim() : '',
                color_type: colorSelect ? colorSelect.value : 'Branco',
                product_id: pid,
                service_name: serviceName,
                details: detailsInput ? detailsInput.value.trim() : ''
            });
        });

        return items;
    },

    addSneakerItemRow() {
        // 1. Salvar os valores atuais digitados pelo usuário
        this.sneakerItemsInModal = this.collectSneakerItemsFromDOM();
        // 2. Adicionar o novo item
        const defaultProdId = this.productsList && this.productsList.length > 0 ? this.productsList[0].id : 1;
        this.sneakerItemsInModal.push({
            brand: '',
            color_type: 'Branco',
            product_id: defaultProdId,
            service_name: this.productsList && this.productsList.length > 0 ? this.productsList[0].name : 'Limpeza Completa',
            details: ''
        });
        // 3. Renderizar com os dados preservados
        this.renderSneakerItemsInModal();
    },

    removeSneakerItemRow(index) {
        if (this.sneakerItemsInModal.length <= 1) {
            Utils.showToast("O pedido deve conter pelo menos 1 produto.", "warning");
            return;
        }
        this.sneakerItemsInModal = this.collectSneakerItemsFromDOM();
        this.sneakerItemsInModal.splice(index, 1);
        this.renderSneakerItemsInModal();
    },

    renderSneakerItemsInModal() {
        const container = document.getElementById('sneaker-items-container');
        if (!container) return;

        const defaultProdId = this.productsList && this.productsList.length > 0 ? this.productsList[0].id : 1;

        container.innerHTML = this.sneakerItemsInModal.map((item, idx) => {
            const currentProdId = item.product_id || defaultProdId;
            const productOptions = (this.productsList || []).map(p => `
                <option value="${p.id}" data-name="${p.name}" data-price="${p.price}" ${p.id === currentProdId ? 'selected' : ''}>
                    ${p.name} (R$ ${p.price.toFixed(2).replace('.', ',')})
                </option>
            `).join('');

            return `
            <div class="sneaker-item-card" data-index="${idx}">
                <div class="sneaker-item-header">
                    <span>Par de Tênis #${idx + 1}</span>
                    ${this.sneakerItemsInModal.length > 1 ? `
                        <button type="button" class="btn-icon-subtle" style="color: #EF4444; font-weight: 700;" onclick="Orders.removeSneakerItemRow(${idx})">✕ Remover</button>
                    ` : ''}
                </div>
                <div class="sneaker-grid-fields" style="grid-template-columns: 1fr 1fr 1.3fr;">
                    <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label">Marca *</label>
                        <input type="text" class="form-input sneaker-brand-input" placeholder="Ex: Nike Air Force, Adidas, Vans..." value="${item.brand || ''}" required oninput="Orders.syncItemsAndRecalculate()">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label">Cor Principal *</label>
                        <select class="form-select sneaker-color-select" onchange="Orders.syncItemsAndRecalculate()">
                            <option value="Branco" ${(item.color_type || '').toLowerCase() === 'branco' ? 'selected' : ''}>Branco</option>
                            <option value="Colorido" ${(item.color_type || '').toLowerCase() !== 'branco' ? 'selected' : ''}>Colorido</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label">Produto / Serviço</label>
                        <select class="form-select sneaker-product-select" onchange="Orders.syncItemsAndRecalculate()">
                            ${productOptions}
                        </select>
                    </div>
                </div>
                <div class="form-group" style="margin-top: 0.6rem; margin-bottom: 0;">
                    <input type="text" class="form-input sneaker-details-input" placeholder="Detalhes adicionais (opcional, ex: camurça, solado encardido)" value="${item.details || ''}" oninput="Orders.syncItemsAndRecalculate()">
                </div>
            </div>
            `;
        }).join('');

        this.updatePricingCalculatorDisplay();
    },

    syncItemsAndRecalculate() {
        this.sneakerItemsInModal = this.collectSneakerItemsFromDOM();
        this.updatePricingCalculatorDisplay();
    },

    updatePricingCalculatorDisplay() {
        const items = (this.sneakerItemsInModal && this.sneakerItemsInModal.length) ? this.sneakerItemsInModal : [{ product_id: 1 }];
        const prods = this.productsList || [];

        let grandTotal = 0;
        let totalRegular = 0;
        const promoBreakdownHtml = [];

        const countsByProd = {};
        items.forEach(it => {
            const pid = it.product_id || (prods[0]?.id || 1);
            countsByProd[pid] = (countsByProd[pid] || 0) + 1;
        });

        Object.keys(countsByProd).forEach(pid => {
            const count = countsByProd[pid];
            const prod = prods.find(p => p.id === parseInt(pid)) || { name: 'Limpeza Completa', price: 35.0, promo_min_qty: 2, promo_price: 30.0 };
            
            let effectiveUnitPrice = prod.price;
            let promoApplied = false;

            if (prod.promo_min_qty && count >= prod.promo_min_qty && prod.promo_price !== null && prod.promo_price !== undefined) {
                effectiveUnitPrice = prod.promo_price;
                promoApplied = true;
            }

            const subtotal = count * effectiveUnitPrice;
            const regularSubtotal = count * prod.price;
            grandTotal += subtotal;
            totalRegular += regularSubtotal;

            promoBreakdownHtml.push(`
                <div style="margin-bottom: 0.35rem; font-size: 0.82rem;">
                    <strong>${prod.name}</strong>: ${count} un. × ${Utils.formatCurrency(effectiveUnitPrice)}
                    ${prod.promo_min_qty && prod.promo_price ? `<span style="font-size: 0.74rem; color: var(--text-muted); margin-left: 4px;">(A partir de ${prod.promo_min_qty} un., sai por ${Utils.formatCurrency(prod.promo_price)} cada)</span>` : ''}
                    ${promoApplied ? `<span style="color: #10B981; font-weight: 700; margin-left: 6px;">🔥 Promoção Ativada!</span>` : ''}
                </div>
            `);
        });

        const totalEconomy = totalRegular - grandTotal;

        const banner = document.getElementById('pricing-promo-summary');
        if (banner) {
            banner.innerHTML = `
                <div class="promo-rules" style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                        <strong style="color: var(--text-pure-white);">Resumo & Promoções Aplicadas:</strong>
                        <button type="button" class="btn-secondary" style="font-size: 0.72rem; padding: 0.2rem 0.5rem;" onclick="Orders.openProductModal()">⚙️ Gerenciar Produtos</button>
                    </div>
                    ${promoBreakdownHtml.join('')}
                    ${totalEconomy > 0 ? `<div style="color: #10B981; font-weight: 700; font-size: 0.8rem; margin-top: 0.3rem;">Economia total de ${Utils.formatCurrency(totalEconomy)}!</div>` : ''}
                </div>
                <div class="promo-total-display">
                    <span style="font-size: 0.8rem; color: var(--text-secondary);">${items.length} produto(s)</span><br>
                    <span class="amount">${Utils.formatCurrency(grandTotal)}</span>
                </div>
            `;
        }

        this.calculatedTotal = grandTotal;
        this.calculatedUnit = grandTotal / (items.length || 1);
    },

    async saveOrder() {
        // Coleta itens diretamente do DOM para sincronismo absoluto
        const items = this.collectSneakerItemsFromDOM();

        // 1. Identificar cliente (existente ou novo rápido)
        const isNewClientTab = document.getElementById('tab-client-new')?.classList.contains('active');
        const clientIdVal = document.getElementById('order-client-select')?.value;
        const newClientName = document.getElementById('order-new-client-name')?.value?.trim();
        const newClientPhone = document.getElementById('order-new-client-phone')?.value?.trim();

        let clientPayload = {};

        if (isNewClientTab || (!clientIdVal && newClientName)) {
            if (!newClientName) {
                Utils.showToast("Informe o Nome Completo do novo cliente.", "warning");
                document.getElementById('order-new-client-name')?.focus();
                return;
            }
            const phoneClean = (newClientPhone || '').replace(/\D/g, '');
            if (phoneClean.length < 10) {
                Utils.showToast("Informe o WhatsApp do cliente com DDD (mínimo 10 dígitos).", "warning");
                document.getElementById('order-new-client-phone')?.focus();
                return;
            }
            clientPayload = { client_name: newClientName, client_phone: phoneClean };
        } else {
            if (!clientIdVal) {
                Utils.showToast("Por favor, selecione um cliente para vincular ao pedido.", "warning");
                document.getElementById('order-client-select')?.focus();
                return;
            }
            clientPayload = { client_id: parseInt(clientIdVal) };
        }

        // 2. Validação dos pares
        if (!items || items.length === 0) {
            Utils.showToast("O pedido deve conter pelo menos 1 par de tênis.", "warning");
            return;
        }

        for (let i = 0; i < items.length; i++) {
            if (!items[i].brand || !items[i].brand.trim()) {
                Utils.showToast(`Por favor, preencha a marca do par de tênis #${i + 1}.`, "warning");
                const brandInputs = document.querySelectorAll('.sneaker-brand-input');
                if (brandInputs[i]) brandInputs[i].focus();
                return;
            }
        }

        const paymentMethod = document.getElementById('order-payment-method')?.value || 'PIX';
        const paymentStatus = document.getElementById('order-payment-status')?.value || 'Pendente';
        const notes = document.getElementById('order-notes-input')?.value || '';

        const btnSubmit = document.getElementById('btn-submit-order');

        try {
            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.textContent = "Salvando...";
            }

            const payload = {
                ...clientPayload,
                items: items,
                service_type: items[0]?.service_name || 'Limpeza de Tênis',
                total_price: this.calculatedTotal || undefined,
                unit_price: this.calculatedUnit || undefined,
                payment_method: paymentMethod,
                payment_status: paymentStatus,
                notes: notes
            };

            const created = await API.createOrder(payload);

            Utils.showToast(`Pedido #${created.id} criado com sucesso!`, "success");
            this.closeOrderModal();

            // Atualiza listas e métricas
            await this.loadOrders();
            if (window.Dashboard) await Dashboard.loadMetrics();
            if (window.Clients) await Clients.loadClients();
            if (window.Calendar) await Calendar.loadEvents();
        } catch (err) {
            console.error("Erro ao salvar pedido:", err);
            Utils.showToast(err.message || "Erro ao salvar pedido", "danger");
        } finally {
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.textContent = "Criar Pedido";
            }
        }
    },

    // ----------------------------------------------------
    // Upload de Fotos Antes & Depois
    // ----------------------------------------------------
    async openPhotoModal(orderId) {
        this.currentOrderIdForPhotos = orderId;
        const order = await API.getOrder(orderId);
        const container = document.getElementById('photos-items-container');
        document.getElementById('photo-modal-title').textContent = `Fotos Antes/Depois - Pedido #${order.id} (${order.client_name})`;

        if (!container) return;

        container.innerHTML = order.items.map((it, idx) => `
            <div class="photo-pair-container">
                <h4 class="photo-pair-title">
                    Par #${idx + 1}: <strong>${it.brand}</strong> <span class="color-indicator ${it.color_type.toLowerCase()}">${it.color_type}</span>
                </h4>
                <div class="photos-split-grid">
                    <!-- Foto Antes -->
                    <div class="photo-split-col">
                        <span class="photo-side-label">Foto Antes</span>
                        <div class="photo-status-desc">
                            ${it.before_image ? 'Foto do Antes anexada com sucesso' : 'Nenhuma foto do Antes anexada'}
                        </div>
                        ${it.before_image ? `
                            <div class="photo-controls-row">
                                <button type="button" class="btn-toggle-view-photo" id="btn-toggle-before-${it.id}" onclick="Orders.togglePhotoVisibility('before-${it.id}')">
                                    Exibir Imagem
                                </button>
                                <label class="btn-photo-action-orange" title="Substituir foto do antes">
                                    Alterar
                                    <input type="file" accept="image/*" style="display: none;" onchange="Orders.handlePhotoUpload(${order.id}, ${it.id}, 'before', this)">
                                </label>
                                <button type="button" class="btn-photo-action-danger" onclick="Orders.removePhoto(${order.id}, ${it.id}, 'before')" title="Remover esta foto">
                                    Remover
                                </button>
                            </div>
                            <div class="photo-preview-collapsible" id="preview-before-${it.id}" style="display: none;">
                                <img src="${it.before_image}" class="photo-preview-contained" alt="Foto Antes" onclick="window.open(this.src, '_blank')" title="Clique para abrir em tamanho original">
                            </div>
                        ` : `
                            <label class="btn-photo-action-orange">
                                Selecionar Foto Antes
                                <input type="file" accept="image/*" style="display: none;" onchange="Orders.handlePhotoUpload(${order.id}, ${it.id}, 'before', this)">
                            </label>
                        `}
                    </div>

                    <!-- Divisor Central -->
                    <div class="photo-split-divider"></div>

                    <!-- Foto Depois -->
                    <div class="photo-split-col">
                        <span class="photo-side-label">Foto Depois</span>
                        <div class="photo-status-desc">
                            ${it.after_image ? 'Foto do Depois anexada com sucesso' : 'Nenhuma foto do Depois anexada'}
                        </div>
                        ${it.after_image ? `
                            <div class="photo-controls-row">
                                <button type="button" class="btn-toggle-view-photo" id="btn-toggle-after-${it.id}" onclick="Orders.togglePhotoVisibility('after-${it.id}')">
                                    Exibir Imagem
                                </button>
                                <label class="btn-photo-action-green" title="Substituir foto do depois">
                                    Alterar
                                    <input type="file" accept="image/*" style="display: none;" onchange="Orders.handlePhotoUpload(${order.id}, ${it.id}, 'after', this)">
                                </label>
                                <button type="button" class="btn-photo-action-danger" onclick="Orders.removePhoto(${order.id}, ${it.id}, 'after')" title="Remover esta foto">
                                    Remover
                                </button>
                            </div>
                            <div class="photo-preview-collapsible" id="preview-after-${it.id}" style="display: none;">
                                <img src="${it.after_image}" class="photo-preview-contained" alt="Foto Depois" onclick="window.open(this.src, '_blank')" title="Clique para abrir em tamanho original">
                            </div>
                        ` : `
                            <label class="btn-photo-action-green">
                                Selecionar Foto Depois
                                <input type="file" accept="image/*" style="display: none;" onchange="Orders.handlePhotoUpload(${order.id}, ${it.id}, 'after', this)">
                            </label>
                        `}
                    </div>
                </div>
            </div>
        `).join('');

        document.getElementById('photo-modal').classList.add('active');
    },

    togglePhotoVisibility(id) {
        const el = document.getElementById(`preview-${id}`);
        const btn = document.getElementById(`btn-toggle-${id}`);
        if (!el) return;
        if (el.style.display === 'none') {
            el.style.display = 'block';
            if (btn) btn.textContent = 'Ocultar Imagem';
        } else {
            el.style.display = 'none';
            if (btn) btn.textContent = 'Exibir Imagem';
        }
    },

    closePhotoModal() {
        document.getElementById('photo-modal').classList.remove('active');
        this.currentOrderIdForPhotos = null;
    },

    async handlePhotoUpload(orderId, itemId, type, inputElement) {
        if (!inputElement.files || !inputElement.files[0]) return;

        const file = inputElement.files[0];
        const formData = new FormData();
        if (type === 'before') {
            formData.append('before_image', file);
        } else {
            formData.append('after_image', file);
        }

        try {
            Utils.showToast("Enviando foto...", "info");
            await API.uploadItemPhotos(orderId, itemId, formData);
            Utils.showToast("Foto salva com sucesso!", "success");
            await this.openPhotoModal(orderId);
            await this.loadOrders();
        } catch (err) {
            Utils.showToast("Erro no envio da foto: " + err.message, "danger");
        }
    },

    async removePhoto(orderId, itemId, type) {
        const label = type === 'before' ? 'Antes' : 'Depois';
        if (!confirm(`Deseja realmente remover a foto do "${label}" deste tênis?`)) {
            return;
        }

        try {
            Utils.showToast("Removendo foto...", "info");
            await API.removeItemPhoto(orderId, itemId, type);
            Utils.showToast(`Foto do "${label}" removida com sucesso!`, "success");
            await this.openPhotoModal(orderId);
            await this.loadOrders();
        } catch (err) {
            console.error("Erro ao remover foto:", err);
            Utils.showToast(err.message || "Erro ao remover foto.", "danger");
        }
    },

    // ----------------------------------------------------
    // Notificação WhatsApp com Mensagem Padronizada
    // ----------------------------------------------------
    async openWhatsAppModal(orderId) {
        try {
            const data = await API.getWhatsAppInfo(orderId);
            document.getElementById('whatsapp-client-info').textContent = `${data.client_name} - ${Utils.formatPhone(data.client_phone)}`;
            document.getElementById('whatsapp-message-preview').textContent = data.message;
            document.getElementById('whatsapp-pix-key-val').textContent = data.pix_key;

            const sendBtn = document.getElementById('btn-send-whatsapp-now');
            sendBtn.onclick = () => {
                const phoneClean = (data.formatted_phone || data.client_phone || '').replace(/\D/g, '');
                const fullPhone = phoneClean.startsWith('55') ? phoneClean : ('55' + phoneClean);
                const encodedText = encodeURIComponent(data.message);
                const url = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodedText}`;
                window.open(url, '_blank');
            };

            document.getElementById('whatsapp-modal').classList.add('active');
        } catch (err) {
            Utils.showToast(err.message, "danger");
        }
    },

    closeWhatsAppModal() {
        document.getElementById('whatsapp-modal').classList.remove('active');
    },

    copyWhatsAppMessage() {
        const text = document.getElementById('whatsapp-message-preview').textContent;
        navigator.clipboard.writeText(text).then(() => {
            Utils.showToast("Mensagem copiada para a área de transferência!");
        });
    },

    copyPixKey() {
        const key = document.getElementById('whatsapp-pix-key-val').textContent;
        navigator.clipboard.writeText(key).then(() => {
            Utils.showToast("Chave PIX copiada!");
        });
    },

    // ----------------------------------------------------
    // Auditoria e Correção de Histórico do Pedido
    // ----------------------------------------------------
    async openAuditModal(orderId) {
        try {
            const order = await API.getOrder(orderId);
            document.getElementById('audit-order-id').value = order.id;
            document.getElementById('audit-modal-title').textContent = `Auditoria & Histórico - Pedido #${order.id}`;

            document.getElementById('audit-status-select').value = order.status;
            document.getElementById('audit-payment-status').value = order.payment_status;
            document.getElementById('audit-payment-method').value = order.payment_method || 'PIX';
            document.getElementById('audit-created-at').value = order.created_at ? order.created_at.replace(' ', 'T') : '';
            document.getElementById('audit-completion-date').value = order.completion_date ? order.completion_date.replace(' ', 'T') : '';
            document.getElementById('audit-delivered-date').value = order.delivered_date ? order.delivered_date.replace(' ', 'T') : '';
            document.getElementById('audit-notes').value = order.notes || '';
            document.getElementById('audit-reason').value = '';

            const histContainer = document.getElementById('audit-history-timeline');
            if (histContainer) {
                histContainer.innerHTML = order.history && order.history.length > 0 ? order.history.map(h => `
                    <div style="border-left: 3px solid var(--blue-marine); padding-left: 0.75rem; margin-bottom: 0.75rem;">
                        <div style="font-weight: 700; font-size: 0.85rem; color: var(--blue-dark);">${h.action}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">${h.description || ''}</div>
                        <small style="color: var(--text-muted); font-size: 0.75rem;">${Utils.formatDateTime(h.created_at)}</small>
                    </div>
                `).join('') : '<p style="color: var(--text-muted); font-size: 0.8rem;">Nenhum registro anterior de auditoria.</p>';
            }

            document.getElementById('audit-modal').classList.add('active');
        } catch (err) {
            Utils.showToast("Erro ao abrir dados de auditoria.", "danger");
        }
    },

    closeAuditModal() {
        document.getElementById('audit-modal').classList.remove('active');
    },

    async saveAuditForm() {
        const orderId = document.getElementById('audit-order-id').value;
        const status = document.getElementById('audit-status-select').value;
        const payment_status = document.getElementById('audit-payment-status').value;
        const payment_method = document.getElementById('audit-payment-method').value;
        const created_at = document.getElementById('audit-created-at').value.replace('T', ' ');
        const completion_date = document.getElementById('audit-completion-date').value ? document.getElementById('audit-completion-date').value.replace('T', ' ') : null;
        const delivered_date = document.getElementById('audit-delivered-date').value ? document.getElementById('audit-delivered-date').value.replace('T', ' ') : null;
        const notes = document.getElementById('audit-notes').value;
        const audit_reason = document.getElementById('audit-reason').value.trim() || 'Modificação de histórico de pedido';

        try {
            await API.updateOrderAudit(orderId, {
                status,
                payment_status,
                payment_method,
                created_at,
                completion_date,
                delivered_date,
                notes,
                audit_reason
            });

            Utils.showToast("Histórico do pedido atualizado com sucesso!");
            this.closeAuditModal();
            await this.loadOrders();
            if (window.Dashboard) window.Dashboard.loadMetrics();
            if (window.Calendar) window.Calendar.loadEvents();
        } catch (err) {
            Utils.showToast(err.message, "danger");
        }
    },

    async confirmDeleteOrder(orderId) {
        if (!confirm(`Deseja realmente excluir o Pedido #${orderId}?\nEsta ação não poderá ser desfeita.`)) {
            return;
        }

        try {
            await API.deleteOrder(orderId);
            Utils.showToast("Pedido excluído com sucesso.");
            await this.loadOrders();
            if (window.Dashboard) window.Dashboard.loadMetrics();
            if (window.Clients) window.Clients.loadClients();
        } catch (err) {
            Utils.showToast(err.message, "danger");
        }
    },

    // ----------------------------------------------------
    // Gestão de Produtos & Serviços Personalizados
    // ----------------------------------------------------
    async loadProducts() {
        try {
            let prods = [];
            try {
                const res = await fetch(`${API_BASE}/api/products`);
                if (res.ok) prods = await res.json();
            } catch (e) {
                console.warn("API de produtos offline, usando fallback:", e);
            }
            if (!prods || prods.length === 0) {
                const stored = localStorage.getItem('sneakerclean_custom_products');
                if (stored) prods = JSON.parse(stored);
            }
            if (!prods || prods.length === 0) {
                prods = [
                    { id: 1, name: 'Limpeza Completa', price: 35.0, description: 'Limpeza profunda padrão com higienização', promo_min_qty: 2, promo_price: 30.0 },
                    { id: 2, name: 'Limpeza Premium', price: 50.0, description: 'Limpeza premium com desoxidação de solado', promo_min_qty: 2, promo_price: 45.0 },
                    { id: 3, name: 'Impermeabilização', price: 25.0, description: 'Proteção repelente de líquidos', promo_min_qty: 2, promo_price: 20.0 }
                ];
            }
            this.productsList = prods;
            localStorage.setItem('sneakerclean_custom_products', JSON.stringify(prods));
            return prods;
        } catch (err) {
            this.productsList = [
                { id: 1, name: 'Limpeza Completa', price: 35.0, description: 'Limpeza completa', promo_min_qty: 2, promo_price: 30.0 }
            ];
            return this.productsList;
        }
    },

    openProductModal() {
        this.renderProductsList();
        const idInput = document.getElementById('product-form-id');
        if (idInput) idInput.value = '';
        const nameInput = document.getElementById('product-form-name');
        if (nameInput) nameInput.value = '';
        const priceInput = document.getElementById('product-form-price');
        if (priceInput) priceInput.value = '';
        const descInput = document.getElementById('product-form-desc');
        if (descInput) descInput.value = '';
        const promoMinInput = document.getElementById('product-form-promo-min');
        if (promoMinInput) promoMinInput.value = '2';
        const promoPriceInput = document.getElementById('product-form-promo-price');
        if (promoPriceInput) promoPriceInput.value = '';
        const titleEl = document.getElementById('product-form-title');
        if (titleEl) titleEl.textContent = 'Cadastrar Novo Produto / Serviço';

        document.getElementById('product-modal')?.classList.add('active');
    },

    closeProductModal() {
        document.getElementById('product-modal')?.classList.remove('active');
    },

    renderProductsList() {
        const container = document.getElementById('products-table-body');
        if (!container) return;
        const prods = this.productsList || [];

        container.innerHTML = prods.map(p => `
            <tr>
                <td><strong>${p.name}</strong><br><small style="color: var(--text-muted);">${p.description || ''}</small></td>
                <td><strong>${Utils.formatCurrency(p.price)}</strong></td>
                <td>${p.promo_min_qty && p.promo_price ? `A partir de <strong>${p.promo_min_qty} un.</strong>: <strong>${Utils.formatCurrency(p.promo_price)}</strong> cada` : '<span style="color: var(--text-muted);">Sem promoção</span>'}</td>
                <td>
                    <div style="display: flex; gap: 0.35rem;">
                        <button type="button" class="btn-icon-subtle" title="Editar" onclick="Orders.editProduct(${p.id})">✎</button>
                        <button type="button" class="btn-icon-subtle" style="color: #ef4444;" title="Excluir" onclick="Orders.deleteProduct(${p.id})">✕</button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    editProduct(id) {
        const prod = (this.productsList || []).find(p => p.id === id);
        if (!prod) return;
        document.getElementById('product-form-id').value = prod.id;
        document.getElementById('product-form-name').value = prod.name;
        document.getElementById('product-form-price').value = prod.price;
        document.getElementById('product-form-desc').value = prod.description || '';
        document.getElementById('product-form-promo-min').value = prod.promo_min_qty || '';
        document.getElementById('product-form-promo-price').value = prod.promo_price || '';
        document.getElementById('product-form-title').textContent = `Editar Produto: ${prod.name}`;
    },

    async saveProductForm() {
        const idVal = document.getElementById('product-form-id').value;
        const name = document.getElementById('product-form-name').value.trim();
        const price = parseFloat(document.getElementById('product-form-price').value);
        const description = document.getElementById('product-form-desc').value.trim();
        const promo_min = document.getElementById('product-form-promo-min').value;
        const promo_price = document.getElementById('product-form-promo-price').value;

        if (!name) {
            Utils.showToast("Informe o nome do produto/serviço.", "warning");
            return;
        }
        if (isNaN(price) || price <= 0) {
            Utils.showToast("Informe um valor unitário válido.", "warning");
            return;
        }

        const promo_min_qty = promo_min ? parseInt(promo_min) : null;
        const promo_pr = promo_price ? parseFloat(promo_price) : null;

        const payload = {
            name,
            price,
            description,
            promo_min_qty,
            promo_price: promo_pr
        };

        try {
            if (idVal) {
                // Atualizar produto existente
                try {
                    await fetch(`${API_BASE}/api/products/${idVal}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                } catch (e) {}
                const idx = this.productsList.findIndex(p => p.id === parseInt(idVal));
                if (idx >= 0) this.productsList[idx] = { ...this.productsList[idx], ...payload };
            } else {
                // Criar novo produto
                let newId = Date.now();
                try {
                    const res = await fetch(`${API_BASE}/api/products`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (res.ok) {
                        const json = await res.json();
                        newId = json.id;
                    }
                } catch (e) {}
                this.productsList.push({ id: newId, ...payload });
            }

            localStorage.setItem('sneakerclean_custom_products', JSON.stringify(this.productsList));
            Utils.showToast("Produto salvo com sucesso!");
            this.renderProductsList();
            this.renderSneakerItemsInModal();

            // Limpar formulário
            document.getElementById('product-form-id').value = '';
            document.getElementById('product-form-name').value = '';
            document.getElementById('product-form-price').value = '';
            document.getElementById('product-form-desc').value = '';
            document.getElementById('product-form-promo-min').value = '2';
            document.getElementById('product-form-promo-price').value = '';
            document.getElementById('product-form-title').textContent = 'Cadastrar Novo Produto / Serviço';
        } catch (err) {
            Utils.showToast(err.message, "danger");
        }
    },

    async deleteProduct(id) {
        if (!confirm("Tem certeza que deseja excluir este produto?")) return;
        try {
            try {
                await fetch(`${API_BASE}/api/products/${id}`, { method: 'DELETE' });
            } catch (e) {}
            this.productsList = (this.productsList || []).filter(p => p.id !== id);
            localStorage.setItem('sneakerclean_custom_products', JSON.stringify(this.productsList));
            Utils.showToast("Produto excluído!");
            this.renderProductsList();
            this.renderSneakerItemsInModal();
        } catch (err) {
            Utils.showToast(err.message, "danger");
        }
    }
};

window.Orders = Orders;
