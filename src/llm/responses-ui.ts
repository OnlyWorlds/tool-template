/**
 * AI Chat UI Controller
 * Manages the chat interface that replaces the middle column
 */

import { responsesService, OnlyWorldsContext } from './responses-service.js';
import { UI_LABELS } from './responses-config.js';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export class ResponsesUI {
    private chatMessages: ChatMessage[] = [];
    private isVisible: boolean = false;
    private currentElement: any = null;
    private currentWorld: any = null;

    init(): void {
        this.setupEventListeners();
    }

    showChatInterface(): void {
        this.isVisible = true;
        this.renderChatInterface();
        this.hideElementListView();
    }

    hideChatInterface(): void {
        this.isVisible = false;

        // Restore the original element list structure
        const container = document.querySelector('.element-list-container') as HTMLElement;
        if (container) {
            container.innerHTML = `
                <div class="list-header">
                    <div class="list-header-row">
                        <h2 id="list-title">Select a Category</h2>
                        <button id="create-element-btn" class="btn-add-element hidden" title="Create new element">
                            <span class="material-icons-outlined">add</span>
                        </button>
                    </div>
                    <input type="text" id="search-input" placeholder="" class="search-input hidden" />
                </div>
                <div id="element-list" class="element-list">
                    <p class="empty-state">Select a category from the sidebar to view elements</p>
                </div>
            `;
        }

        // Trigger custom event to notify the main app to restore view
        document.dispatchEvent(new CustomEvent('chatInterfaceHidden'));
    }

    toggleChatInterface(): void {
        if (this.isVisible) {
            this.hideChatInterface();
        } else {
            this.showChatInterface();
        }
    }

    private renderChatInterface(): void {
        const container = document.querySelector('.element-list-container') as HTMLElement;
        if (!container) return;

        container.innerHTML = `
            <div class="chat-interface">
                <div class="chat-header">
                    <h2>AI Assistant</h2>
                    <div class="chat-controls">
                        <button id="clear-chat-btn" class="btn-clear" title="${UI_LABELS.CLEAR_CHAT}">
                            <span class="material-icons-outlined">refresh</span>
                        </button>
                        <button id="close-chat-btn" class="btn-close" title="Back to elements">
                            <span class="material-icons-outlined">close</span>
                        </button>
                    </div>
                </div>

                ${!responsesService.isConfigured() ? `
                    <div class="chat-setup-notice">
                        <span class="material-icons-outlined">info</span>
                        <div>
                            <p>${UI_LABELS.NO_API_KEY_MESSAGE}</p>
                            <button id="setup-api-key-btn" class="btn-setup" style="margin-top: 0.5rem; padding: 0.5rem 1rem; background: white; color: var(--status-info); border: 1px solid white; border-radius: 4px; cursor: pointer;">
                                ${UI_LABELS.SETUP_BUTTON}
                            </button>
                        </div>
                    </div>
                ` : ''}

                <div class="chat-messages" id="chat-messages">
                    ${this.renderMessages()}
                    ${this.chatMessages.length === 0 ? `
                        <div class="chat-welcome">
                            <p>👋 Hi! I'm here to help you explore and understand your world.</p>
                            <p>Ask me questions about your world elements, their relationships, or anything else you'd like to discuss!</p>
                        </div>
                    ` : ''}
                </div>

                <div class="chat-input-area">
                    <div class="chat-context-options">
                        <label class="context-option">
                            <input type="checkbox" id="include-selected" ${!this.currentElement ? 'disabled' : ''}>
                            <span>${UI_LABELS.INCLUDE_SELECTED} ${!this.currentElement ? '(none selected)' : ''}</span>
                        </label>
                        <label class="context-option">
                            <input type="checkbox" id="include-world">
                            <span>${UI_LABELS.INCLUDE_WORLD}</span>
                        </label>
                    </div>

                    <div class="chat-input-container">
                        <input
                            type="text"
                            id="chat-input"
                            placeholder="${UI_LABELS.PLACEHOLDER}"
                            ${!responsesService.isConfigured() ? 'disabled' : ''}
                        >
                        <button
                            id="send-chat-btn"
                            class="btn-send"
                            title="${UI_LABELS.SEND_BUTTON}"
                            ${!responsesService.isConfigured() ? 'disabled' : ''}
                        >
                            <span class="material-icons-outlined">send</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.attachChatEventListeners();
    }

    private renderMessages(): string {
        return this.chatMessages.map(msg => `
            <div class="chat-message ${msg.role}">
                <div class="message-content">
                    ${msg.content}
                </div>
                <div class="message-timestamp">
                    ${msg.timestamp.toLocaleTimeString()}
                </div>
            </div>
        `).join('');
    }

    private attachChatEventListeners(): void {
        // Send message on button click
        document.getElementById('send-chat-btn')?.addEventListener('click', () => {
            this.sendMessage();
        });

        // Send message on Enter key
        document.getElementById('chat-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // Clear conversation
        document.getElementById('clear-chat-btn')?.addEventListener('click', () => {
            this.clearConversation();
        });

        // Close chat interface
        document.getElementById('close-chat-btn')?.addEventListener('click', () => {
            this.hideChatInterface();
        });

        // Setup API key button
        document.getElementById('setup-api-key-btn')?.addEventListener('click', () => {
            this.showApiKeySetup();
        });

        // Handle context checkboxes
        const includeSelected = document.getElementById('include-selected') as HTMLInputElement;
        const includeWorld = document.getElementById('include-world') as HTMLInputElement;

        includeWorld?.addEventListener('change', (e) => {
            if ((e.target as HTMLInputElement).checked && includeSelected) {
                includeSelected.checked = false;
                includeSelected.disabled = true;
            } else if (includeSelected) {
                includeSelected.disabled = !this.currentElement;
            }
        });

        includeSelected?.addEventListener('change', (e) => {
            if ((e.target as HTMLInputElement).checked && includeWorld) {
                includeWorld.checked = false;
            }
        });
    }

    private async sendMessage(): Promise<void> {
        const input = document.getElementById('chat-input') as HTMLInputElement;
        const sendBtn = document.getElementById('send-chat-btn') as HTMLButtonElement;

        if (!input || !sendBtn) return;

        const message = input.value.trim();
        if (!message) return;

        // Add user message to chat
        this.addMessage('user', message);
        input.value = '';

        // Show loading state
        sendBtn.disabled = true;
        this.showTypingIndicator();

        try {
            // Prepare context if checkboxes are selected
            const context = this.getSelectedContext();

            // Get AI response
            const response = await responsesService.sendMessage(message, context);

            // Remove typing indicator
            this.hideTypingIndicator();

            if (response.error) {
                this.addMessage('assistant', `❌ ${response.error}`);
            } else {
                this.addMessage('assistant', response.content);
            }

        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage('assistant', `❌ ${UI_LABELS.ERROR_MESSAGE}`);
            console.error('Chat error:', error);
        } finally {
            sendBtn.disabled = false;
        }
    }

    private getSelectedContext(): OnlyWorldsContext | undefined {
        const includeSelected = document.getElementById('include-selected') as HTMLInputElement;
        const includeWorld = document.getElementById('include-world') as HTMLInputElement;

        if (includeWorld?.checked && this.currentWorld) {
            return {
                type: 'full_world',
                data: this.currentWorld
            };
        } else if (includeSelected?.checked && this.currentElement) {
            return {
                type: 'selected_element',
                data: this.currentElement
            };
        }

        return undefined;
    }

    private addMessage(role: 'user' | 'assistant', content: string): void {
        this.chatMessages.push({
            role,
            content,
            timestamp: new Date()
        });

        this.updateMessagesDisplay();
        this.scrollToBottom();
    }

    private updateMessagesDisplay(): void {
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = this.renderMessages();
        }
    }

    private scrollToBottom(): void {
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    private showTypingIndicator(): void {
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            const typingDiv = document.createElement('div');
            typingDiv.id = 'typing-indicator';
            typingDiv.className = 'chat-message assistant typing';
            typingDiv.innerHTML = `
                <div class="message-content">
                    <div class="typing-dots">
                        <span></span><span></span><span></span>
                    </div>
                </div>
            `;
            messagesContainer.appendChild(typingDiv);
            this.scrollToBottom();
        }
    }

    private hideTypingIndicator(): void {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    private clearConversation(): void {
        this.chatMessages = [];
        responsesService.clearConversation();
        this.updateMessagesDisplay();
    }

    private hideElementListView(): void {
        // We don't actually hide it, we replace the content
        // The container structure remains the same for consistent layout
    }

    private showElementListView(): void {
        // This will be called from the main app to restore the element list view
        // The actual restoration logic will be handled by the viewer
    }

    private setupEventListeners(): void {
        // Any global event listeners can be set up here
    }

    // Methods to update context from the main app
    setCurrentElement(element: any): void {
        this.currentElement = element;

        // Update checkbox state if chat is visible
        if (this.isVisible) {
            const includeSelected = document.getElementById('include-selected') as HTMLInputElement;
            if (includeSelected) {
                includeSelected.disabled = !element;
                const label = includeSelected.parentElement?.querySelector('span');
                if (label) {
                    label.textContent = `${UI_LABELS.INCLUDE_SELECTED} ${!element ? '(none selected)' : ''}`;
                }
            }
        }
    }

    setCurrentWorld(worldData: any): void {
        this.currentWorld = worldData;
    }

    // Method to check if chat is visible (for other components)
    isChatVisible(): boolean {
        return this.isVisible;
    }

    private showApiKeySetup(): void {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${UI_LABELS.SETUP_TITLE}</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p>${UI_LABELS.SETUP_DESCRIPTION}</p>
                    <p><a href="https://platform.openai.com/api-keys" target="_blank">${UI_LABELS.GET_KEY_LINK}</a></p>
                    <br>
                    <label for="api-key-input">OpenAI API Key:</label>
                    <input type="password" id="api-key-input" placeholder="${UI_LABELS.API_KEY_PLACEHOLDER}" style="width: 100%; padding: 0.5rem; margin: 0.5rem 0; border: 1px solid var(--border-primary); border-radius: 4px;">
                    <div style="margin-top: 1rem; display: flex; gap: 0.5rem; justify-content: flex-end;">
                        <button id="cancel-api-key" class="btn" style="background: var(--bg-secondary); border: 1px solid var(--border-primary);">${UI_LABELS.CANCEL}</button>
                        <button id="save-api-key" class="btn" style="background: var(--brand-primary); color: white; border: none;">${UI_LABELS.SAVE_KEY}</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.classList.add('visible');

        const apiKeyInput = modal.querySelector('#api-key-input') as HTMLInputElement;
        const saveBtn = modal.querySelector('#save-api-key') as HTMLButtonElement;
        const cancelBtn = modal.querySelector('#cancel-api-key') as HTMLButtonElement;
        const closeBtn = modal.querySelector('.modal-close') as HTMLButtonElement;

        const closeModal = () => {
            modal.classList.remove('visible');
            setTimeout(() => modal.remove(), 300);
        };

        const saveApiKey = () => {
            const apiKey = apiKeyInput.value.trim();
            if (!apiKey) {
                apiKeyInput.style.borderColor = 'var(--status-error)';
                return;
            }

            if (!apiKey.startsWith('sk-')) {
                alert('Please enter a valid OpenAI API key (starts with "sk-")');
                return;
            }

            responsesService.setApiKey(apiKey);
            closeModal();

            // Refresh the chat interface to reflect the new state
            this.renderChatInterface();
        };

        saveBtn.addEventListener('click', saveApiKey);
        cancelBtn.addEventListener('click', closeModal);
        closeBtn.addEventListener('click', closeModal);

        apiKeyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveApiKey();
            }
        });

        // Focus the input
        setTimeout(() => apiKeyInput.focus(), 100);

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }
}

// Export singleton instance
export const responsesUI = new ResponsesUI();