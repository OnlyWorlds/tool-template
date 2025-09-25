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

        const isConfigured = responsesService.isConfigured();
        const hasMessages = this.chatMessages.length > 0;

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

                <div class="chat-messages" id="chat-messages">
                    ${this.renderMessages()}
                    ${this.renderInitialMessages()}
                </div>

                <div class="chat-input-area">
                    ${isConfigured ? `
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
                    ` : ''}

                    <div class="chat-input-container">
                        <textarea
                            id="chat-input"
                            placeholder="${isConfigured ? UI_LABELS.PLACEHOLDER_CHAT : UI_LABELS.PLACEHOLDER_SETUP}"
                            rows="1"
                        ></textarea>
                        <button
                            id="send-chat-btn"
                            class="btn-send"
                            title="${UI_LABELS.SEND_BUTTON}"
                        >
                            <span class="material-icons-outlined">send</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.attachChatEventListeners();
        this.setupAutoResizeTextarea();
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

        // Send message on Enter key (but allow Shift+Enter for newlines)
        document.getElementById('chat-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
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

        // No longer need setup button - everything is conversational now

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
        const input = document.getElementById('chat-input') as HTMLTextAreaElement;
        const sendBtn = document.getElementById('send-chat-btn') as HTMLButtonElement;

        if (!input || !sendBtn) return;

        const message = input.value.trim();
        if (!message) return;

        // Check if this looks like an API key setup
        if (!responsesService.isConfigured() && this.isApiKey(message)) {
            await this.handleApiKeySetup(message);
            input.value = '';
            return;
        }

        // Regular message handling - if not configured and not an API key, explain what's needed
        if (!responsesService.isConfigured()) {
            this.addMessage('assistant', UI_LABELS.INVALID_KEY);
            input.value = '';
            return;
        }

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

    private renderInitialMessages(): string {
        if (this.chatMessages.length > 0) {
            return ''; // Don't show initial messages if there's chat history
        }

        if (!responsesService.isConfigured()) {
            // Show setup message
            return `
                <div class="chat-message assistant">
                    <div class="message-content">
                        ${UI_LABELS.SETUP_COMBINED}
                    </div>
                </div>
            `;
        } else {
            // Show welcome message for configured chat
            return `
                <div class="chat-welcome">
                    <p>Chat ready</p>
                </div>
            `;
        }
    }

    private isApiKey(input: string): boolean {
        // Check if input looks like an OpenAI API key
        return input.startsWith('sk-') && input.length >= 20;
    }

    private async handleApiKeySetup(apiKey: string): Promise<void> {
        // Validate API key format
        if (!this.isApiKey(apiKey)) {
            this.addMessage('assistant', UI_LABELS.INVALID_KEY);
            return;
        }

        // Add user message but hide the actual key
        this.addMessage('user', '•'.repeat(20) + ' (API key)');

        // Show processing message
        this.showTypingIndicator();

        try {
            // Set the API key
            responsesService.setApiKey(apiKey);

            // Test the connection with a simple request
            const testResponse = await responsesService.sendMessage('Hello');

            this.hideTypingIndicator();

            if (testResponse.error) {
                // API key didn't work
                responsesService.clearApiKey();
                this.addMessage('assistant', UI_LABELS.CONNECTION_ERROR);
            } else {
                // Success!
                this.addMessage('assistant', UI_LABELS.SETUP_SUCCESS);

                // Clear setup messages and refresh interface
                setTimeout(() => {
                    this.renderChatInterface();
                }, 1000);
            }
        } catch (error) {
            this.hideTypingIndicator();
            responsesService.clearApiKey();
            this.addMessage('assistant', UI_LABELS.CONNECTION_ERROR);
        }
    }

    private setupAutoResizeTextarea(): void {
        const textarea = document.getElementById('chat-input') as HTMLTextAreaElement;
        if (!textarea) return;

        textarea.addEventListener('input', () => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        });
    }
}

// Export singleton instance
export const responsesUI = new ResponsesUI();