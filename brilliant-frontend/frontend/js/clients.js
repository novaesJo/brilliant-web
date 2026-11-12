/**
 * clients.js - CRUD e Gestão de Clientes
 * SneakerClean - Gestão de Limpeza de Tênis
 */

const Clients = {
    clientsList: [],
    currentEditingId: null,

    async init() {
        this.bindEvents();
        await this.loadClients();
    },

    bindEvents() {
        const searchInput = document.getElementById('client-search-input');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.loadClients(e.target.value);
                }, 300);
            });
        }

        // Máscara de telefone no input
        const phoneInput = document.getElementById('client-phone-input');
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                let v = e.target.value.replace(/\D/g, '');
                if (v.length > 11) v = v.slice(0, 11);
                if (v.length > 6) {
                    e.target.value = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
                } else if (v.length > 2) {
                    e.target.value = `(${v.slice(0,2)}) ${v.slice(2)}`;
                } else if (v.length > 0) {
                    e.target.value = `(${v}`;
                } else {
                    e.target.value = '';
                }
            });
        }

        const clientForm = document.getElementById('client-modal-form');
        if (clientForm) {
            clientForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveClient();
            });
        }
    },

    async loadClients(search = '') {
        try {
            const data = await API.getClients(search);
            this.clientsList = data || [];
            this.renderTable(this.clientsList);
            this.populateClientSelectOptions(this.clientsList);
            return this.clientsList;
        } catch (err) {
            console.error("Erro ao carregar clientes:", err);
            Utils.showToast("Falha ao listar clientes.", "danger");
            return [];
        }
    },

    renderTable(clients) {
        const tbody = document.getElementById('clients-table-tbody');
        if (!tbody) return;

        if (!clients || clients.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">Nenhum cliente encontrado.</td></tr>`;
            return;
        }

        tbody.innerHTML = clients.map(c => `
            <tr>
                <td><strong>#${c.id}</strong></td>
                <td>
                    <div style="font-weight: 700; color: #eff6ff;">${c.name}</div>
                    <div style="font-size: 0.78rem; color: var(--text-muted);">Desde ${Utils.formatDate(c.created_at)}</div>
                </td>
                <td>
                    <a href="https://wa.me/55${c.phone}" target="_blank" style="color: #25D366; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                        ${Utils.formatPhone(c.phone)}
                    </a>
                </td>
                <td>
                    <span style="font-weight: 700; color: var(--blue-marine);">${c.total_orders} pedido(s)</span>
                </td>
                <td>
                    <div style="font-weight: 700; color: var(--status-pago);">${Utils.formatCurrency(c.total_spent)}</div>
                    ${c.pending_amount > 0 ? `<div style="font-size: 0.75rem; color: var(--status-aguardando); font-weight: 600;">Pendente: ${Utils.formatCurrency(c.pending_amount)}</div>` : ''}
                </td>
                <td>
                    <div style="display: flex; gap: 0.4rem;">
                        <button class="btn-icon-subtle" title="Ver Histórico Completo" onclick="Clients.viewDetails(${c.id})">🔍︎</button>
                        <button class="btn-icon-subtle" title="Editar Cliente" onclick="Clients.openEditModal(${c.id})">✎</button>
                        <button class="btn-icon-subtle" title="Excluir Cliente" style="color: #EF4444;" onclick="Clients.confirmDelete(${c.id}, '${c.name.replace(/'/g, "\\'")}')">🗑️</button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    populateClientSelectOptions(clients) {
        const select = document.getElementById('order-client-select');
        if (!select) return;

        const currentVal = select.value;
        let html = '<option value="">-- Selecione o Cliente --</option>';

        if (clients && clients.length > 0) {
            html += clients.map(c => `<option value="${c.id}">${c.name} - ${Utils.formatPhone(c.phone)}</option>`).join('');
        }

        select.innerHTML = html;

        if (currentVal && clients.some(c => String(c.id) === String(currentVal))) {
            select.value = currentVal;
        } else if (clients && clients.length > 0) {
            select.selectedIndex = 1; // Seleciona automaticamente o 1º cliente cadastrado
        }
    },

    openNewModal() {
        this.currentEditingId = null;
        document.getElementById('client-modal-title').textContent = "Novo Cliente";
        document.getElementById('client-name-input').value = "";
        document.getElementById('client-phone-input').value = "";
        document.getElementById('client-modal').classList.add('active');
    },

    async openEditModal(id) {
        try {
            const client = await API.getClient(id);
            this.currentEditingId = id;
            document.getElementById('client-modal-title').textContent = "Editar Cliente";
            document.getElementById('client-name-input').value = client.name;
            document.getElementById('client-phone-input').value = Utils.formatPhone(client.phone);
            document.getElementById('client-modal').classList.add('active');
        } catch (err) {
            Utils.showToast("Erro ao abrir cliente para edição.", "danger");
        }
    },

    closeModal() {
        document.getElementById('client-modal').classList.remove('active');
        this.currentEditingId = null;
    },

    async saveClient() {
        const name = document.getElementById('client-name-input').value.trim();
        const phone = document.getElementById('client-phone-input').value.trim();

        if (!name) {
            Utils.showToast("Informe o nome do cliente.", "warning");
            return;
        }

        const phoneClean = phone.replace(/\D/g, '');
        if (phoneClean.length < 10) {
            Utils.showToast("Informe um número de telefone/WhatsApp válido com DDD.", "warning");
            return;
        }

        try {
            if (this.currentEditingId) {
                await API.updateClient(this.currentEditingId, { name, phone: phoneClean });
                Utils.showToast("Cliente atualizado com sucesso!");
            } else {
                const newC = await API.createClient({ name, phone: phoneClean });
                Utils.showToast("Cliente cadastrado com sucesso!");
                await this.loadClients();
                const orderClientSelect = document.getElementById('order-client-select');
                if (orderClientSelect) {
                    orderClientSelect.value = newC.id;
                }
            }
            this.closeModal();
            await this.loadClients();
        } catch (err) {
            Utils.showToast(err.message, "danger");
        }
    },

    async confirmDelete(id, name) {
        if (!confirm(`Deseja realmente excluir o cliente "${name}"?\nIsso removerá também o histórico dos pedidos dele.`)) {
            return;
        }

        try {
            await API.deleteClient(id);
            Utils.showToast("Cliente excluído com sucesso.");
            await this.loadClients();
            if (window.Orders) window.Orders.loadOrders();
            if (window.Dashboard) window.Dashboard.loadMetrics();
        } catch (err) {
            Utils.showToast(err.message, "danger");
        }
    },

    async viewDetails(id) {
        try {
            const client = await API.getClient(id);
            const container = document.getElementById('client-details-body');
            if (!container) return;

            document.getElementById('client-details-title').textContent = `Perfil: ${client.name}`;

            const ordersHtml = client.orders && client.orders.length > 0 ? client.orders.map(o => `
                <div style="background: var(--bg-main); padding: 0.75rem; border-radius: var(--radius-sm); margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>Pedido #${o.id}</strong> • ${o.pair_count} par(es)<br>
                        <small style="color: var(--text-muted);">${Utils.formatDateTime(o.created_at)}</small>
                    </div>
                    <div style="text-align: right;">
                        <strong>${Utils.formatCurrency(o.total_price)}</strong><br>
                        <span class="badge-payment ${o.payment_status.toLowerCase()}">${o.payment_status}</span>
                        <span class="status-pill ${Dashboard.getStatusClass(o.status)}">${o.status}</span>
                    </div>
                </div>
            `).join('') : '<p style="color: var(--text-muted);">Nenhum pedido realizado até o momento.</p>';

            container.innerHTML = `
                <div style="margin-bottom: 1.25rem;">
                    <p><strong>WhatsApp:</strong> <a href="https://wa.me/55${client.phone}" target="_blank" style="color: #25D366; font-weight: 700;">${Utils.formatPhone(client.phone)}</a></p>
                    <p><strong>Total de Pedidos:</strong> ${client.orders ? client.orders.length : 0}</p>
                </div>
                <h4 style="margin-bottom: 0.75rem; color: var(--blue-dark); border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.4rem;">Histórico de Pedidos</h4>
                <div style="max-height: 350px; overflow-y: auto;">
                    ${ordersHtml}
                </div>
            `;

            document.getElementById('client-details-modal').classList.add('active');
        } catch (err) {
            Utils.showToast("Erro ao abrir histórico do cliente.", "danger");
        }
    },

    closeDetailsModal() {
        document.getElementById('client-details-modal').classList.remove('active');
    }
};

window.Clients = Clients;
