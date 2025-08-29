// frontend/js/contractHistory.js

/**
 * Sistema de gestión del historial de contratos completados
 * Maneja el almacenamiento local y la visualización de contratos finalizados
 */

// Clave para localStorage
const HISTORY_STORAGE_KEY = 'express_services_contract_history';

/**
 * Obtiene el historial de contratos desde localStorage
 */
export function getContractHistory() {
    try {
        const history = localStorage.getItem(HISTORY_STORAGE_KEY);
        return history ? JSON.parse(history) : [];
    } catch (error) {
        console.error('Error al cargar historial de contratos:', error);
        return [];
    }
}

/**
 * Guarda el historial de contratos en localStorage
 */
function saveContractHistory(history) {
    try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
        console.error('Error al guardar historial de contratos:', error);
    }
}

/**
 * Agrega un contrato al historial cuando se marca como completado
 */
export function addContractToHistory(contract) {
    const history = getContractHistory();
    
    // Verificar si el contrato ya existe en el historial
    const existingIndex = history.findIndex(c => c.id_contract === contract.id_contract);
    
    if (existingIndex === -1) {
        // Agregar información adicional al contrato
        const historyContract = {
            ...contract,
            completed_date: new Date().toISOString(),
            completed_by: getCurrentUserRole() // 'client' o 'provider'
        };
        
        history.unshift(historyContract); // Agregar al inicio del array
        saveContractHistory(history);
        
        // Actualizar badge del botón de historial
        updateHistoryBadge();
        
        return true;
    }
    
    return false;
}

/**
 * Elimina un contrato específico del historial
 */
export function removeContractFromHistory(contractId) {
    const history = getContractHistory();
    const filteredHistory = history.filter(c => c.id_contract !== contractId);
    
    if (filteredHistory.length !== history.length) {
        saveContractHistory(filteredHistory);
        updateHistoryBadge();
        return true;
    }
    
    return false;
}

/**
 * Limpia todo el historial de contratos
 */
export function clearContractHistory() {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
    updateHistoryBadge();
}

/**
 * Obtiene el rol actual del usuario desde el token
 */
function getCurrentUserRole() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return null;
        
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.user?.selected_rol || 'client';
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
export function renderContractHistory() {
    const container = document.getElementById('contract-history-container');
    if (!container) return;
    
    const history = getContractHistory();
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
        const completedDate = new Date(contract.completed_date).toLocaleDateString('es-ES', {
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
        historyBtn.addEventListener('click', () => {
            renderContractHistory();
            const modal = new bootstrap.Modal(document.getElementById('contractHistoryModal'));
            modal.show();
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

/**
 * Verifica si un contrato debe ser movido al historial después de completarse
 * Esto se llama después de que un contrato se marca como completado por ambas partes
 */
export function checkAndMoveToHistory(contract) {
    // Solo mover al historial si ambas partes han marcado como completado
    if (contract.client_marked_completed && contract.provider_marked_completed) {
        return addContractToHistory(contract);
    }
    return false;
}
