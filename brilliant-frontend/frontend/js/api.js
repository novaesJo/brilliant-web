/**
 * api.js - Camada de integração HTTP (Fetch API) com o Backend Flask
 * Sistema SneakerClean - Gestão de Limpeza de Tênis
 */

const API_BASE = 'https://brilliant-api-tvjp.onrender.com';

function mostrarLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.remove('loading-oculto');
}

function esconderLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('loading-oculto');
}

const API = {
    // ----------------------------------------------------
    // Clientes
    // ----------------------------------------------------
    async getClients(search = '') {
        try {
            const query = search ? `?search=${encodeURIComponent(search)}` : '';
            const res = await fetch(`${API_BASE}/api/clients${query}`);
            if (!res.ok) throw new Error(await res.text());
            return await res.json();
        } catch (err) {
            this._handleNetworkError(err);
            throw err;
        }
    },

    async getClient(id) {
        try {
            const res = await fetch(`${API_BASE}/api/clients/${id}`);
            if (!res.ok) throw new Error(await res.text());
            return await res.json();
        } catch (err) {
            this._handleNetworkError(err);
            throw err;
        }
    },

    async createClient(data) {
        try {
            const res = await fetch(`${API_BASE}/api/clients`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Erro ao criar cliente');
            return json;
        } catch (err) {
            this._handleNetworkError(err);
            throw err;
        }
    },

    async updateClient(id, data) {
        try {
            const res = await fetch(`${API_BASE}/api/clients/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Erro ao atualizar cliente');
            return json;
        } catch (err) {
            this._handleNetworkError(err);
            throw err;
        }
    },

    async deleteClient(id) {
        try {
            const res = await fetch(`${API_BASE}/api/clients/${id}`, {
                method: 'DELETE'
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Erro ao excluir cliente');
            return json;
        } catch (err) {
            this._handleNetworkError(err);
            throw err;
        }
    },

    // ----------------------------------------------------
    // Pedidos & Linha de Produção
    // ----------------------------------------------------
    async getOrders(filters = {}) {
        try {
            const params = new URLSearchParams();
            if (filters.status) params.append('status', filters.status);
            if (filters.payment_status) params.append('payment_status', filters.payment_status);
            if (filters.client_id) params.append('client_id', filters.client_id);
            if (filters.search) params.append('search', filters.search);
            if (filters.start_date) params.append('start_date', filters.start_date);
            if (filters.end_date) params.append('end_date', filters.end_date);

            const query = params.toString() ? `?${params.toString()}` : '';
            const res = await fetch(`${API_BASE}/api/orders${query}`);
            if (!res.ok) throw new Error(await res.text());
            return await res.json();
        } catch (err) {
            this._handleNetworkError(err);
            throw err;
        }
    },

    async getOrder(id) {
        try {
            const res = await fetch(`${API_BASE}/api/orders/${id}`);
            if (!res.ok) throw new Error(await res.text());
            return await res.json();
        } catch (err) {
            this._handleNetworkError(err);
            throw err;
        }
    },

    async createOrder(data) {
        try {
            const res = await fetch(`${API_BASE}/api/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            let json;
            try {
                json = await res.json();
            } catch {
                throw new Error("Resposta inválida do servidor ao salvar pedido.");
            }
            if (!res.ok) throw new Error(json.error || 'Erro ao criar pedido');
            return json;
        } catch (err) {
            this._handleNetworkError(err);
            throw err;
        }
    },

    async updateOrderStatus(id, status) {
        try {
            const res = await fetch(`${API_BASE}/api/orders/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Erro ao atualizar status');
            return json;
        } catch (err) {
            this._handleNetworkError(err);
            throw err;
        }
    },

    async updateOrderPayment(id, payment_status, payment_method) {
        try {
            const res = await fetch(`${API_BASE}/api/orders/${id}/payment`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payment_status, payment_method })
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Erro ao atualizar pagamento');
            return json;
        } catch (err) {
            this._handleNetworkError(err);
            throw err;
        }
    },

    async updateOrderAudit(id, auditData) {
        try {
            const res = await fetch(`${API_BASE}/api/orders/${id}/audit`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(auditData)
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Erro ao atualizar histórico de pedido');
            return json;
        } catch (err) {
            this._handleNetworkError(err);
            throw err;
        }
    },

    async deleteOrder(id) {
        try {
            const res = await fetch(`${API_BASE}/api/orders/${id}`, {
                method: 'DELETE'
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Erro ao excluir pedido');
            return json;
        } catch (err) {
            this._handleNetworkError(err);
            throw err;
        }
    },

    async getPipelineCounts() {
        try {
            const res = await fetch(`${API_BASE}/api/orders/pipeline`);
            if (!res.ok) throw new Error(await res.text());
            return await res.json();
        } catch (err) {
            this._handleNetworkError(err);
            throw err;
        }
    },

    async getWhatsAppInfo(id) {
        try {
            const res = await fetch(`${API_BASE}/api/orders/${id}/whatsapp`);
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Erro ao gerar WhatsApp');
            return json;
        } catch (err) {
            this._handleNetworkError(err);
            throw err;
        }
    },

    async uploadItemPhotos(orderId, itemId, formData) {
        try {
            const res = await fetch(`${API_BASE}/api/orders/${orderId}/items/${itemId}/upload`, {
                method: 'POST',
                body: formData
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Erro no upload das fotos');
            return json;
        } catch (err) {
            this._handleNetworkError(err);
            throw err;
        }
    },

    async removeItemPhoto(orderId, itemId, photoType) {
        try {
            const res = await fetch(`${API_BASE}/api/orders/${orderId}/items/${itemId}/photos/${photoType}`, {
                method: 'DELETE'
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Erro ao remover foto');
            return json;
        } catch (err) {
            this._handleNetworkError(err);
            throw err;
        }
    },

    // ----------------------------------------------------
    // Calendário
    // ----------------------------------------------------
    async getCalendarEvents(year, month) {
        try {
            const res = await fetch(`${API_BASE}/api/calendar/events?year=${year}&month=${month}`);
            if (!res.ok) throw new Error(await res.text());
            return await res.json();
        } catch (err) {
            this._handleNetworkError(err);
            throw err;
        }
    },

    async getCalendarDay(dateStr) {
        try {
            const res = await fetch(`${API_BASE}/api/calendar/day?date=${dateStr}`);
            if (!res.ok) throw new Error(await res.text());
            return await res.json();
        } catch (err) {
            this._handleNetworkError(err);
            throw err;
        }
    },

    // ----------------------------------------------------
    // Dashboard Financeiro
    // ----------------------------------------------------
    async getDashboardMetrics() {
        try {
            const res = await fetch(`${API_BASE}/api/dashboard/metrics`);
            if (!res.ok) throw new Error(await res.text());
            return await res.json();
        } catch (err) {
            this._handleNetworkError(err);
            throw err;
        }
    },

    // ----------------------------------------------------
    // Produtos & Serviços Personalizados
    // ----------------------------------------------------
    async getProducts() {
        try {
            const res = await fetch(`${API_BASE}/api/products`);
            if (!res.ok) throw new Error(await res.text());
            return await res.json();
        } catch (err) {
            this._handleNetworkError(err);
            throw err;
        }
    },

    async createProduct(data) {
        try {
            const res = await fetch(`${API_BASE}/api/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Erro ao criar produto');
            return json;
        } catch (err) {
            this._handleNetworkError(err);
            throw err;
        }
    },

    async updateProduct(id, data) {
        try {
            const res = await fetch(`${API_BASE}/api/products/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Erro ao atualizar produto');
            return json;
        } catch (err) {
            this._handleNetworkError(err);
            throw err;
        }
    },

    async deleteProduct(id) {
        try {
            const res = await fetch(`${API_BASE}/api/products/${id}`, {
                method: 'DELETE'
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Erro ao remover produto');
            return json;
        } catch (err) {
            this._handleNetworkError(err);
            throw err;
        }
    },

    _handleNetworkError(err) {
        if (err.name === 'TypeError' && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
            throw new Error("Não foi possível conectar ao servidor backend (http://127.0.0.1:5000). Certifique-se de que o servidor Python está em execução (execute iniciar.bat ou python run.py).");
        }
    }
};

// ========================================================
// Utilitários Globais
// ========================================================
const Utils = {
    formatCurrency(val) {
        const num = parseFloat(val) || 0;
        return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    },

    formatDate(dateStr) {
        if (!dateStr) return '-';
        const parts = dateStr.split(' ')[0].split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
    },

    formatDateTime(dateStr) {
        if (!dateStr) return '-';
        try {
            const [datePart, timePart] = dateStr.split(' ');
            const parts = datePart.split('-');
            const time = timePart ? timePart.substring(0, 5) : '';
            return `${parts[2]}/${parts[1]}/${parts[0]} ${time}`;
        } catch {
            return dateStr;
        }
    },

    formatPhone(phone) {
        if (!phone) return '-';
        const digits = phone.toString().replace(/\D/g, '');
        if (digits.length === 11) {
            return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
        } else if (digits.length === 10) {
            return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
        }
        return phone;
    },

    showToast(message, type = 'success') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icons = {
            success: '✅',
            warning: '⚠️',
            danger: '❌',
            info: 'ℹ️'
        };

        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || '🔔'}</span>
            <span class="toast-msg">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 4500);
    }
};
