
import { setupModalListeners } from './handlers/modalHandlers.js';
import { setupAuthForms } from './handlers/authHandlers.js';
import { loadCities, loadAndSetupCategories, loadInitialServices  } from './handlers/pageHandlers.js';

//  PUNTO DE ENTRADA PRINCIPAL 
document.addEventListener('DOMContentLoaded', () => {
    setupAuthForms();
    setupModalListeners();
    loadAndSetupCategories();
    loadCities();
    loadInitialServices(); 
});