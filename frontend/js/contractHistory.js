// frontend/js/contractHistory.js
import { getContractsHistory } from './api/authService.js';

/**
 * Completed contracts history management system
 * Loads and displays finalized contracts from the backend (no localStorage)
 */
// Load history from the server (source of truth).
async function loadServerContractHistory() {
    const onProviderPage = typeof window !== 'undefined' && window.location?.pathname?.includes('provider.html');
    const selected_rol = onProviderPage ? 'provider' : 'client';
    const data = await getContractsHistory({ selected_rol });
    // Expect an array; if not, normalize
    return Array.isArray(data) ? data : (data?.contracts || []);
}

// Removed localStorage handling: all data comes from the server

/**
 * Get the current user's role from the token
 */
function getCurrentUserRole() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return null;
        const payload = JSON.parse(atob(token.split('.')[1]));
        const roles = payload.user?.roles || [];
    // If both roles, decide based on current view URL
        const onProviderPage = typeof window !== 'undefined' && window.location?.pathname?.includes('provider.html');
        if (roles.includes('provider') && roles.includes('client')) {
            return onProviderPage ? 'provider' : 'client';
        }
        if (roles.includes('provider')) return 'provider';
        if (roles.includes('client')) return 'client';
        return 'client';
    } catch (error) {
    console.error('Error getting user role:', error);
        return 'client';
    }
}

/**
 * Update the history button badge
 */
export function updateHistoryBadge() {
    const historyBtn = document.getElementById('contract-history-btn');
    if (!historyBtn) return;
    
    // Remove existing badge
    const existingBadge = historyBtn.querySelector('.badge');
    if (existingBadge) {
        existingBadge.remove();
    }
    // Requirement: do not show the number of completed contracts next to the button
}

/**
 * Render the contract history inside the modal
 */
export async function renderContractHistory() {
    const container = document.getElementById('contract-history-container');
    if (!container) return;

    // Loading state
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
    // Detect role by current view URL as primary source; fallback to token
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
        
    // Always display the "other" participant according to current role
        const counterpartLabel = isProvider ? 'Cliente' : 'Proveedor';
        const counterpartName = isProvider ? (contract.client_name || '') : (contract.provider_name || '');
    // Display hours as integer (no decimals)
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
 * Set up event listeners for contract history
 */
export function setupContractHistoryListeners() {
    // Button to open history modal
    const historyBtn = document.getElementById('contract-history-btn');
    if (historyBtn) {
        historyBtn.addEventListener('click', async () => {
            // Open the modal first, then render (with loading state inside)
            const modal = new bootstrap.Modal(document.getElementById('contractHistoryModal'));
            modal.show();
            await renderContractHistory();
        });
    }
}

/**
 * Initialize the contract history system
 */
export function initContractHistory() {
    updateHistoryBadge();
    setupContractHistoryListeners();
}

// History is not managed on client anymore; backend is the source of truth
