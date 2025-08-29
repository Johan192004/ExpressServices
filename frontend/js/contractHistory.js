// frontend/js/contractHistory.js
import { getContractsHistory } from './api/authService.js';

/**
 * Sistema de gestión del historial de contratos completados
 * Carga y visualiza contratos finalizados desde el backend (sin localStorage)
 */
// Carga historial desde el servidor (fuente de verdad).
async function loadServerContractHistory() {
    const onProviderPage = typeof window !== 'undefined' && window.location?.pathname?.includes('provider.html');
    const selected_rol = onProviderPage ? 'provider' : 'client';
    const data = await getContractsHistory({ selected_rol });
    // Esperamos un array; si no, normalizamos
    return Array.isArray(data) ? data : (data?.contracts || []);
}

// Eliminado manejo de localStorage: toda la data se obtiene del servidor

/**
 * Obtiene el rol actual del usuario desde el token
 */
function getCurrentUserRole() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return null;
        const payload = JSON.parse(atob(token.split('.')[1]));
        const roles = payload.user?.roles || [];
        // Si tiene ambos roles, decidir por URL de la vista actual
        const onProviderPage = typeof window !== 'undefined' && window.location?.pathname?.includes('provider.html');
        if (roles.includes('provider') && roles.includes('client')) {
            return onProviderPage ? 'provider' : 'client';
        }
        if (roles.includes('provider')) return 'provider';
        if (roles.includes('client')) return 'client';
        return 'client';
    } catch (error) {
        console.error('Error al obtener rol del usuario:', error);
        return 'client';
    }
}

/**
 * Actualiza el badge del botón de historial
 */
export function updateHistoryBadge() {
    const historyBtn = document.getElementById('contract-history-btn');
    if (!historyBtn) return;
    
    // Remover badge existente
    const existingBadge = historyBtn.querySelector('.badge');
    if (existingBadge) {
        existingBadge.remove();
    }
    // Requisito: no mostrar número de contratos completados junto al botón
}

/**
 * Renderiza el historial de contratos en el modal
 */
export async function renderContractHistory() {
    const container = document.getElementById('contract-history-container');
    if (!container) return;

    // Estado de carga
    container.innerHTML = `
        <div class="text-center text-muted">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-2">Cargando historial...</p>
        </div>
    `;

    let history = [];
    try {
        history = await loadServerContractHistory();
    } catch (error) {
        container.innerHTML = `
            <div class="text-center text-danger">
                <i class="bi bi-exclamation-triangle" style="font-size: 3rem;"></i>
                <p class="mt-3">No se pudo cargar el historial. Intenta nuevamente.</p>
            </div>
        `;
        return;
    }
    const userRole = getCurrentUserRole();
    // Detectar rol por URL de la vista como fuente primaria; fallback al token
    const onProviderPage = typeof window !== 'undefined' && window.location?.pathname?.includes('provider.html');
    const isProvider = onProviderPage || userRole === 'provider';
    
    if (history.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted">
                <i class="bi bi-inbox" style="font-size: 3rem;"></i>
                <p class="mt-3">No tienes contratos completados en tu historial.</p>
            </div>
        `;
        return;
    }
    
    const historyHTML = history.map(contract => {
        const raw = contract.completed_date_co_iso
            ? contract.completed_date_co_iso
            : (contract.completed_date_unix ? new Date(contract.completed_date_unix * 1000) : contract.completed_date);
        const dateObj = raw instanceof Date ? raw : new Date(raw);
        const completedDate = dateObj.toLocaleString('es-CO', {
            timeZone: 'America/Bogota',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Mostrar siempre el "otro" participante según el rol actual
        const counterpartLabel = isProvider ? 'Cliente' : 'Proveedor';
        const counterpartName = isProvider ? (contract.client_name || '') : (contract.provider_name || '');
        // Mostrar horas en entero (sin decimales)
        const hoursDisplay = (contract.agreed_hours !== undefined && contract.agreed_hours !== null && !isNaN(Number(contract.agreed_hours)))
            ? Math.trunc(Number(contract.agreed_hours))
            : 'N/A';
        
        return `
            <div class="card mb-3 shadow-sm contract-history-item" data-contract-id="${contract.id_contract}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <h6 class="card-title fw-bold">${contract.service_name}</h6>
                            <p class="card-text text-muted mb-2">
                                ${counterpartLabel}: ${counterpartName}
                            </p>
                            <div class="d-flex align-items-center justify-content-start">
                                <small class="text-muted">
                                    <i class="bi bi-calendar"></i> Completado: ${completedDate}
                                </small>
                            </div>
                            <div class="mt-2">
                                <strong class="text-success">$${(contract.agreed_price || 0).toLocaleString('es-CO')}</strong>
                                <small class="text-muted ms-2">(${hoursDisplay} horas)</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = historyHTML;
}

/**
 * Configura los event listeners para el historial de contratos
 */
export function setupContractHistoryListeners() {
    // Botón para abrir modal de historial
    const historyBtn = document.getElementById('contract-history-btn');
    if (historyBtn) {
        historyBtn.addEventListener('click', async () => {
            // Abrir el modal primero y luego renderizar (con estado de carga dentro)
            const modal = new bootstrap.Modal(document.getElementById('contractHistoryModal'));
            modal.show();
            await renderContractHistory();
        });
    }
}

/**
 * Inicializa el sistema de historial de contratos
 */
export function initContractHistory() {
    updateHistoryBadge();
    setupContractHistoryListeners();
}

// Ya no se mueve historial en el cliente; el backend es la fuente de verdad
