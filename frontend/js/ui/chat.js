
import { getMessages, sendMessage } from '../api/authService.js';
import { showAlert } from '../utils/modalUtils.js';

let currentConversationId = null;
let chatPollingInterval = null;
let lastMessageId = null; // Track the last loaded message

// Open the chat modal and load messages
export async function openChatModal(conversationId) {
    currentConversationId = conversationId;
    
    // If modal HTML doesn't exist yet, inject it
    if (!document.getElementById('chatModal')) {
                        const modalHtml = `
                                <div class="modal fade" id="chatModal" tabindex="-1">
                                    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
                                        <div class="modal-content">
                                            <div class="modal-header">
                                                <h5 class="modal-title fw-bold" id="chat-modal-title">Chat</h5>
                                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                            </div>
                                            <div class="modal-body" id="chat-messages-container" style="display: flex; flex-direction: column-reverse; height: 400px; overflow-y: auto;"></div>
                                            <div class="modal-footer">
                                                <form id="chat-send-form" class="w-100 d-flex">
                                                    <input type="text" id="chat-message-input" class="form-control me-2" placeholder="Escribe un mensaje..." required>
                                                    <button type="submit" class="btn btn-primary"><i class="bi bi-send-fill"></i></button>
                                                </form>
                                            </div>
                                        </div>
                                    </div>
                                </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    // Add form listener only once
        setupChatFormListener();
    // Configure modal events
        setupModalEvents();
    }
    
    // Set the modal title dynamically depending on current view (client/provider)
    const titleEl = document.getElementById('chat-modal-title');
    if (titleEl) {
        const path = (window.location && window.location.pathname) || '';
        // If we are in the provider dashboard, show "Chat con Cliente", else default to "Chat con Proveedor"
        if (path.includes('/views/private/provider.html')) {
            titleEl.textContent = 'Chat con Cliente';
        } else {
            titleEl.textContent = 'Chat con Proveedor';
        }
    }
    
    const chatModal = new bootstrap.Modal(document.getElementById('chatModal'));
    const messagesContainer = document.getElementById('chat-messages-container');
    
    messagesContainer.innerHTML = '<p class="text-center text-muted">Cargando mensajes...</p>';
    chatModal.show();

    try {
        // Load initial messages
        await loadInitialMessages(conversationId);
        // Start polling for new messages
        startChatPolling(conversationId);
    } catch (error) {
        messagesContainer.innerHTML = `<p class="text-center text-danger">${error.message}</p>`;
    }
}

// Render messages in the container
function renderMessages(messages) {
    const messagesContainer = document.getElementById('chat-messages-container');
    if (messages.length === 0) {
        messagesContainer.innerHTML = '<p class="text-center text-muted">Aún no hay mensajes. ¡Inicia la conversación!</p>';
        return;
    }

    messagesContainer.innerHTML = ''; // Clear container
    const token = localStorage.getItem('token');
    if (!token) return;
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentUserId = payload.user.id;

    messages.forEach(msg => {
        appendMessage(msg, currentUserId);
    });
}

// Append a single message to the view
function appendMessage(msg, currentUserId) {
    const messagesContainer = document.getElementById('chat-messages-container');
    const isSender = msg.sender_id === currentUserId;
    const messageElement = document.createElement('div');
    messageElement.className = `chat-bubble ${isSender ? 'sent' : 'received'}`;
    messageElement.dataset.messageId = msg.id_message; // Add ID for tracking
    const sentRaw = msg.sent_at_co_iso
        ? msg.sent_at_co_iso
        : (msg.sent_at_unix ? new Date(msg.sent_at_unix * 1000) : msg.sent_at);
    const sentAt = sentRaw instanceof Date ? sentRaw : new Date(sentRaw);
    const timeCO = sentAt.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' });
    const fullCO = sentAt.toLocaleString('es-CO', { timeZone: 'America/Bogota', weekday: 'short', year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    messageElement.innerHTML = `
        <div class="message-content">${msg.content}</div>
        <div class="message-time" title="${fullCO}">${timeCO}</div>
    `;
    messagesContainer.prepend(messageElement);
}

// Handle message sending
function setupChatFormListener() {
    const chatForm = document.getElementById('chat-send-form');
    const messageInput = document.getElementById('chat-message-input');
    
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = messageInput.value.trim();
        if (!content || !currentConversationId) return;

        const originalButtonHtml = e.target.querySelector('button').innerHTML;
        e.target.querySelector('button').disabled = true;

        try {
            const newMessage = await sendMessage(currentConversationId, content);
            const token = localStorage.getItem('token');
            const payload = JSON.parse(atob(token.split('.')[1]));
            appendMessage(newMessage, payload.user.id);
            
            // Don't update lastMessageId here so polling can detect this and remote messages
            messageInput.value = '';
            
            // Force a near-term check for new messages
            setTimeout(() => {
                if (currentConversationId) {
                    checkForNewMessages(currentConversationId);
                }
            }, 1000); // Check after 1 second
            
        } catch (error) {
            await showAlert(`Error al enviar mensaje: ${error.message}`, 'error');
        } finally {
            e.target.querySelector('button').disabled = false;
            e.target.querySelector('button').innerHTML = originalButtonHtml;
        }
    });
}

// ===================================================================
// POLLING FUNCTIONS FOR NEAR-REAL-TIME MESSAGES
// ===================================================================

// Load initial messages
async function loadInitialMessages(conversationId) {
    const messages = await getMessages(conversationId);
    renderMessages(messages);
    // Store the last message ID
    if (messages.length > 0) {
        lastMessageId = messages[messages.length - 1].id_message;
    }
}

// Start polling for new messages
function startChatPolling(conversationId) {
    // Clear any previous polling
    stopChatPolling();
    
    console.log('🔄 Starting chat polling every 5 seconds...');
    
    chatPollingInterval = setInterval(async () => {
        try {
            await checkForNewMessages(conversationId);
        } catch (error) {
            console.error('Error checking new messages:', error);
        }
    }, 5000); // Every 5 seconds
}

// Stop polling
function stopChatPolling() {
    if (chatPollingInterval) {
        clearInterval(chatPollingInterval);
        chatPollingInterval = null;
        console.log('⏹️ Chat polling stopped');
    }
}

// Check and append only new messages
async function checkForNewMessages(conversationId) {
    try {
        const allMessages = await getMessages(conversationId);
        
        // If no messages or no last reference
        if (!allMessages.length || !lastMessageId) {
            return;
        }
        
        // Collect existing DOM message IDs to avoid duplicates
        const existingMessageIds = Array.from(document.querySelectorAll('.chat-bubble')).map(bubble => {
            return bubble.dataset.messageId;
        }).filter(id => id); // Keep only valid IDs
        
        // Find new messages (after the last we have)
        const lastMessageIndex = allMessages.findIndex(msg => msg.id_message === lastMessageId);
        
        if (lastMessageIndex === -1) {
            // Last message reference no longer exists, reload all
            console.log('🔄 Reloading all messages...');
            renderMessages(allMessages);
            lastMessageId = allMessages.length > 0 ? allMessages[allMessages.length - 1].id_message : null;
            return;
        }
        
        // Slice new messages and filter out ones already in the DOM
        const newMessages = allMessages.slice(lastMessageIndex + 1).filter(msg => {
            return !existingMessageIds.includes(msg.id_message.toString());
        });
        
        if (newMessages.length > 0) {
            console.log(`✉️ ${newMessages.length} new message(s) received`);
            
            const token = localStorage.getItem('token');
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentUserId = payload.user.id;
            
            // Append only the new messages
            newMessages.forEach(msg => {
                appendMessage(msg, currentUserId);
            });
            
            // Update lastMessageId to the most recent in the list
            lastMessageId = allMessages[allMessages.length - 1].id_message;
        }
    } catch (error) {
        console.error('Error checking new messages:', error);
    }
}

// Set up modal events
function setupModalEvents() {
    const chatModal = document.getElementById('chatModal');
    
    // Stop polling when modal closes
    chatModal.addEventListener('hidden.bs.modal', () => {
        stopChatPolling();
        currentConversationId = null;
        lastMessageId = null;
        console.log('💬 Chat closed, polling stopped');
    });
}