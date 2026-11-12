/**
 * calendar.js - Calendário de Produção e Histórico de Serviços
 * SneakerClean - Gestão de Limpeza de Tênis
 */

const Calendar = {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1, // 1-12
    eventsData: {},
    selectedDateStr: null,

    MONTH_NAMES: [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ],

    async init() {
        this.bindEvents();
        await this.loadEvents();
    },

    bindEvents() {
        const btnPrev = document.getElementById('cal-prev-month');
        const btnNext = document.getElementById('cal-next-month');
        const btnToday = document.getElementById('cal-today-btn');

        if (btnPrev) {
            btnPrev.addEventListener('click', () => {
                this.currentMonth--;
                if (this.currentMonth < 1) {
                    this.currentMonth = 12;
                    this.currentYear--;
                }
                this.loadEvents();
            });
        }

        if (btnNext) {
            btnNext.addEventListener('click', () => {
                this.currentMonth++;
                if (this.currentMonth > 12) {
                    this.currentMonth = 1;
                    this.currentYear++;
                }
                this.loadEvents();
            });
        }

        if (btnToday) {
            btnToday.addEventListener('click', () => {
                const now = new Date();
                this.currentYear = now.getFullYear();
                this.currentMonth = now.getMonth() + 1;
                this.loadEvents();
            });
        }
    },

    async loadEvents() {
        try {
            const data = await API.getCalendarEvents(this.currentYear, this.currentMonth);
            this.eventsData = data.events_by_day || {};
            this.renderCalendarGrid();
            
            // Se hoje estiver no mês atual, selecionar hoje por padrão
            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            if (this.currentYear === now.getFullYear() && this.currentMonth === (now.getMonth() + 1)) {
                this.selectDay(todayStr);
            } else {
                // Selecionar o 1º dia do mês
                const firstDayStr = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-01`;
                this.selectDay(firstDayStr);
            }
        } catch (err) {
            console.error("Erro ao carregar calendário:", err);
            Utils.showToast("Falha ao carregar eventos do calendário.", "danger");
        }
    },

    renderCalendarGrid() {
        const titleEl = document.getElementById('calendar-month-year-title');
        if (titleEl) {
            titleEl.textContent = `${this.MONTH_NAMES[this.currentMonth - 1]} de ${this.currentYear}`;
        }

        const gridEl = document.getElementById('calendar-days-grid');
        if (!gridEl) return;

        // Cabeçalho dos dias da semana
        const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        let html = weekDays.map(d => `<div class="cal-day-header">${d}</div>`).join('');

        // Primeiro dia do mês e total de dias
        const firstDayIndex = new Date(this.currentYear, this.currentMonth - 1, 1).getDay();
        const totalDaysInMonth = new Date(this.currentYear, this.currentMonth, 0).getDate();
        const prevMonthTotalDays = new Date(this.currentYear, this.currentMonth - 1, 0).getDate();

        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        // Dias do mês anterior para completar primeira semana
        for (let i = firstDayIndex - 1; i >= 0; i--) {
            const dayNum = prevMonthTotalDays - i;
            html += `<div class="cal-day-cell other-month"><span class="cal-day-num">${dayNum}</span></div>`;
        }

        // Dias do mês atual
        for (let day = 1; day <= totalDaysInMonth; day++) {
            const dayStr = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = dayStr === todayStr;
            const isSelected = dayStr === this.selectedDateStr;
            const dayEvents = this.eventsData[dayStr] || { started: [], completed: [], delivered: [] };

            const startedCount = dayEvents.started.length;
            const completedCount = dayEvents.completed.length;
            const deliveredCount = dayEvents.delivered.length;

            html += `
                <div class="cal-day-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" onclick="Calendar.selectDay('${dayStr}')">
                    <span class="cal-day-num">${day}</span>
                    <div class="cal-event-badges">
                        ${startedCount > 0 ? `<div class="cal-badge start" title="${startedCount} serviço(s) iniciado(s)">🟢 ${startedCount}</div>` : ''}
                        ${completedCount > 0 ? `<div class="cal-badge ready" title="${completedCount} serviço(s) pronto(s)">🔵 ${completedCount}</div>` : ''}
                        ${deliveredCount > 0 ? `<div class="cal-badge deliv" title="${deliveredCount} serviço(s) entregue(s)">🟣 ${deliveredCount}</div>` : ''}
                    </div>
                </div>
            `;
        }

        // Dias do próximo mês para completar grade de 35 ou 42 células
        const totalRendered = firstDayIndex + totalDaysInMonth;
        const remainingCells = (7 - (totalRendered % 7)) % 7;
        for (let i = 1; i <= remainingCells; i++) {
            html += `<div class="cal-day-cell other-month"><span class="cal-day-num">${i}</span></div>`;
        }

        gridEl.innerHTML = html;
    },

    async selectDay(dateStr) {
        this.selectedDateStr = dateStr;

        // Atualizar classe selected nos cells
        const allCells = document.querySelectorAll('.cal-day-cell');
        allCells.forEach(c => c.classList.remove('selected'));

        const titleEl = document.getElementById('selected-day-title');
        if (titleEl) {
            titleEl.textContent = `Serviços em ${Utils.formatDate(dateStr)}`;
        }

        const listEl = document.getElementById('day-orders-list');
        if (!listEl) return;

        try {
            const orders = await API.getCalendarDay(dateStr);

            if (!orders || orders.length === 0) {
                listEl.innerHTML = `
                    <div style="text-align: center; color: var(--text-muted); padding: 2rem;">
                        <p style="font-size: 1.5rem; margin-bottom: 0.5rem;">📅</p>
                        <p>Nenhuma movimentação de pedido registrada para este dia.</p>
                    </div>
                `;
                return;
            }

            listEl.innerHTML = orders.map(o => {
                const isCreatedToday = o.created_at && o.created_at.startsWith(dateStr);
                const isCompletedToday = o.completion_date && o.completion_date.startsWith(dateStr);
                const isDeliveredToday = o.delivered_date && o.delivered_date.startsWith(dateStr);

                let eventTag = '';
                if (isCreatedToday) eventTag += '<span class="cal-badge start">Iniciado</span> ';
                if (isCompletedToday) eventTag += '<span class="cal-badge ready">Pronto</span> ';
                if (isDeliveredToday) eventTag += '<span class="cal-badge deliv">Entregue</span> ';

                const itemsSummary = o.items ? o.items.map(i => `${i.brand} (${i.color_type})`).join(', ') : '-';

                return `
                    <div style="background: var(--bg-main); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 0.85rem;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.4rem;">
                            <div>
                                <span class="order-id-badge">#${o.id}</span>
                                <strong>${o.client_name}</strong>
                            </div>
                            <div>${eventTag}</div>
                        </div>
                        <div style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 0.4rem;">
                            👟 ${itemsSummary} • <strong>${Utils.formatCurrency(o.total_price)}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem;">
                            <span class="status-pill ${Dashboard.getStatusClass(o.status)}">${o.status}</span>
                            <div style="display: flex; gap: 0.4rem;">
                                <button class="btn-icon-subtle" title="Notificar WhatsApp" onclick="Orders.openWhatsAppModal(${o.id})">💬</button>
                                <button class="btn-icon-subtle" title="Auditar Pedido" onclick="Orders.openAuditModal(${o.id})">✏️</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (err) {
            console.error("Erro ao buscar detalhes do dia:", err);
            listEl.innerHTML = `<p style="color: #EF4444; padding: 1rem;">Erro ao carregar detalhes do dia.</p>`;
        }
    }
};

window.Calendar = Calendar;
