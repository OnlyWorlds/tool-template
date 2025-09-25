/**
 * AI Chat UI Controller
 * Manages the chat interface that replaces the middle column
 */

import { responsesService, OnlyWorldsContext } from './responses-service.js';
import { UI_LABELS } from './responses-config.js';
import { contextService, ContextPreferences, ContextData } from './context-service.js';
import { ONLYWORLDS } from '../compatibility.js';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export class ResponsesUI {
    private chatMessages: ChatMessage[] = [];
    private isVisible: boolean = false;
    private isContextView: boolean = false;
    private currentElement: any = null;
    private currentWorld: any = null;
    private preferences: ContextPreferences = contextService.loadPreferences();
    private elementCounts: Record<string, number> = {};
    private tokenEstimates: Record<string, number> = {};
    private isLoadingCounts: boolean = false;
    private isLoadingTokens: boolean = false;

    init(): void {
        this.preferences = contextService.loadPreferences();
        this.setupEventListeners();
        // Don't load element counts here - wait until authentication is complete
    }

    showChatInterface(): void {
        this.isVisible = true;
        this.isContextView = false;
        this.renderChatInterface();
        this.hideElementListView();
    }

    showContextView(): void {
        this.isVisible = true;
        this.isContextView = true;
        this.renderContextInterface();
        this.hideElementListView();

        // Ensure element counts are loaded when opening context view
        if (!Object.keys(this.elementCounts).length) {
            this.loadElementCounts();
        }
    }

    hideChatInterface(): void {
        this.isVisible = false;
        this.isContextView = false;

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

    toggleContextView(): void {
        if (this.isContextView) {
            this.showChatInterface();
        } else {
            this.showContextView();
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
                        <div class="chat-context-bar">
                            <button id="context-toggle-btn" class="btn-context-toggle" title="${UI_LABELS.CONTEXT_TOGGLE}">
                                <span class="material-icons-outlined">tune</span>
                                <span class="token-indicator" id="token-indicator">~0</span>
                            </button>
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

        // Update token estimate
        this.updateTokenEstimate();
    }

    private renderContextInterface(): void {
        const container = document.querySelector('.element-list-container') as HTMLElement;
        if (!container) return;

        container.innerHTML = `
            <div class="context-interface">
                <div class="context-header">
                    <div class="context-title-section">
                        <h2>${UI_LABELS.CONTEXT_PANEL_TITLE}</h2>
                        <div class="header-token-display" id="header-token-display">
                            <span class="header-token-count" id="header-token-count">~0</span>
                            <span class="header-token-label">tokens</span>
                        </div>
                    </div>
                    <div class="context-controls">
                        <button id="back-to-chat-btn" class="btn-back" title="${UI_LABELS.BACK_TO_CHAT}">
                            <span class="material-icons-outlined">arrow_back</span>
                        </button>
                    </div>
                </div>

                <div class="context-sections">
                    ${this.renderWorldSection()}
                    ${this.renderSelectedElementSection()}
                    ${this.renderCategoriesSection()}
                    ${this.renderSettingsSection()}
                </div>
            </div>
        `;

        this.attachContextEventListeners();
        this.updateHeaderTokenDisplay();
    }

    private renderWorldSection(): string {
        return `
            <div class="context-section">
                <h3>${UI_LABELS.WORLD_SECTION}</h3>
                <p class="context-description">${UI_LABELS.WORLD_ALWAYS_INCLUDED}</p>
                <div class="world-info">
                    <strong>${this.currentWorld?.name || 'Unnamed World'}</strong>
                    <div class="element-counts-preview">
                        ${Object.entries(this.elementCounts).map(([type, count]) =>
                            `<span class="count-item">${type}: ${count}</span>`
                        ).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    private renderSelectedElementSection(): string {
        if (!this.currentElement) {
            return `
                <div class="context-section">
                    <h3>${UI_LABELS.SELECTED_ELEMENT_SECTION}</h3>
                    <p class="context-description">No element selected</p>
                </div>
            `;
        }

        return `
            <div class="context-section">
                <h3>${UI_LABELS.SELECTED_ELEMENT_SECTION}</h3>
                <div class="selected-element-info">
                    <strong>${this.currentElement.name}</strong>
                    <span class="element-type">(${this.currentElement.element_type || 'unknown'})</span>
                </div>

                <div class="selected-element-options">
                    <label class="context-option">
                        <input type="checkbox" id="auto-select-element" ${this.preferences.autoSelect ? 'checked' : ''}>
                        <span>${UI_LABELS.AUTO_SELECT_ELEMENT}</span>
                    </label>

                    <div class="element-level-options">
                        <label class="context-option">
                            <input type="radio" name="element-level" value="minimal" ${this.preferences.selectedElementLevel === 'minimal' ? 'checked' : ''}>
                            <span>${UI_LABELS.SELECTED_MINIMAL}</span>
                        </label>
                        <label class="context-option">
                            <input type="radio" name="element-level" value="full" ${this.preferences.selectedElementLevel === 'full' ? 'checked' : ''}>
                            <span>${UI_LABELS.SELECTED_FULL}</span>
                        </label>
                    </div>
                </div>
            </div>
        `;
    }

    private renderCategoriesSection(): string {
        const categories = ONLYWORLDS.ELEMENT_TYPES;

        return `
            <div class="context-section">
                <h3>${UI_LABELS.CATEGORIES_SECTION}</h3>

                <div class="category-controls">
                    <button id="select-all-categories" class="btn-category-toggle">${UI_LABELS.SELECT_ALL_CATEGORIES}</button>
                    <button id="select-none-categories" class="btn-category-toggle">${UI_LABELS.SELECT_NONE_CATEGORIES}</button>
                </div>

                <div class="category-list">
                    ${categories.map(category => `
                        <label class="category-option">
                            <input type="checkbox" id="category-${category}" ${this.preferences.enabledCategories[category] ? 'checked' : ''}>
                            <span class="category-name">${category}</span>
                            <span class="category-count">(${this.elementCounts[category] || 0})</span>
                            <span class="category-tokens" id="tokens-${category}">~${this.tokenEstimates[category] || 0}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
    }

    private renderSettingsSection(): string {
        return `
            <div class="context-section">
                <h3>Settings</h3>

                <div class="setting-item">
                    <label for="max-tokens">${UI_LABELS.MAX_TOKENS_SETTING}:</label>
                    <input type="number" id="max-tokens" value="${this.preferences.maxTokens}" min="1000" max="100000" step="1000">
                </div>
            </div>
        `;
    }

    private updateHeaderTokenDisplay(): void {
        const totalTokens = this.calculateTotalTokens();
        const warningLevel = contextService.getTokenWarningLevel(totalTokens);

        const headerDisplay = document.getElementById('header-token-display');
        const tokenCount = document.getElementById('header-token-count');

        if (headerDisplay && tokenCount) {
            tokenCount.textContent = `~${totalTokens}`;
            headerDisplay.className = `header-token-display ${warningLevel}`;
        }
    }

    private showLoadingState(): void {
        // Update header to show loading
        const headerTokenCount = document.getElementById('header-token-count');
        if (headerTokenCount) {
            headerTokenCount.innerHTML = '<span class="loading-spinner"></span>Loading...';
        }

        // Update world section to show loading element counts
        const elementCountsPreview = document.querySelector('.element-counts-preview');
        if (elementCountsPreview) {
            elementCountsPreview.innerHTML = '<span class="loading-text">Loading element counts...</span>';
        }

        // Update category counts to show loading
        ONLYWORLDS.ELEMENT_TYPES.forEach(category => {
            const categoryCount = document.querySelector(`#category-${category} + .category-count`);
            if (categoryCount) {
                categoryCount.textContent = '(...)';
            }

            const categoryTokens = document.getElementById(`tokens-${category}`);
            if (categoryTokens) {
                categoryTokens.innerHTML = '<span class="loading-spinner-small"></span>';
            }
        });
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

        // Handle context configuration button
        document.getElementById('context-toggle-btn')?.addEventListener('click', () => {
            this.toggleContextView();
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
            const response = await responsesService.sendMessage(message, await context);

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

    private async getSelectedContext(): Promise<OnlyWorldsContext | undefined> {
        try {
            const contextData = await contextService.buildContextData(
                this.currentElement,
                this.preferences,
                this.currentWorld
            );

            if (contextData.selectedElement || contextData.categories.length > 0) {
                return {
                    type: 'structured_context',
                    data: contextData
                };
            }

            return undefined;
        } catch (error) {
            console.warn('Failed to build context:', error);
            return undefined;
        }
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

        // Load element counts when world data is set (after authentication)
        if (worldData && !Object.keys(this.elementCounts).length) {
            this.loadElementCounts();
        }
    }

    private attachContextEventListeners(): void {
        // Back to chat button
        document.getElementById('back-to-chat-btn')?.addEventListener('click', () => {
            this.showChatInterface();
        });

        // Auto-select element checkbox
        document.getElementById('auto-select-element')?.addEventListener('change', (e) => {
            this.preferences.autoSelect = (e.target as HTMLInputElement).checked;
            this.savePreferencesAndUpdate();
        });

        // Element level radio buttons
        document.querySelectorAll('input[name="element-level"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.preferences.selectedElementLevel = (e.target as HTMLInputElement).value as 'minimal' | 'full';
                this.savePreferencesAndUpdate();
            });
        });

        // Category checkboxes
        ONLYWORLDS.ELEMENT_TYPES.forEach(category => {
            document.getElementById(`category-${category}`)?.addEventListener('change', (e) => {
                this.preferences.enabledCategories[category] = (e.target as HTMLInputElement).checked;
                this.savePreferencesAndUpdate();
            });
        });

        // Select all/none buttons
        document.getElementById('select-all-categories')?.addEventListener('click', () => {
            ONLYWORLDS.ELEMENT_TYPES.forEach(category => {
                this.preferences.enabledCategories[category] = true;
                const checkbox = document.getElementById(`category-${category}`) as HTMLInputElement;
                if (checkbox) checkbox.checked = true;
            });
            this.savePreferencesAndUpdate();
        });

        document.getElementById('select-none-categories')?.addEventListener('click', () => {
            ONLYWORLDS.ELEMENT_TYPES.forEach(category => {
                this.preferences.enabledCategories[category] = false;
                const checkbox = document.getElementById(`category-${category}`) as HTMLInputElement;
                if (checkbox) checkbox.checked = false;
            });
            this.savePreferencesAndUpdate();
        });

        // Max tokens setting
        document.getElementById('max-tokens')?.addEventListener('change', (e) => {
            this.preferences.maxTokens = parseInt((e.target as HTMLInputElement).value) || 50000;
            this.savePreferencesAndUpdate();
        });
    }

    private async loadElementCounts(): Promise<void> {
        if (this.isLoadingCounts) return; // Prevent duplicate loading

        try {
            this.isLoadingCounts = true;
            console.log('Loading element counts...');

            // Show loading state in UI
            if (this.isContextView) {
                this.showLoadingState();
            }

            // Use progressive loading with callback
            this.elementCounts = await contextService.getElementCounts((elementType, count, progress) => {
                // Update individual counts as they come in
                this.elementCounts[elementType] = count;

                // Update UI progressively
                if (this.isContextView) {
                    this.updateProgressiveUI(elementType, count, progress);
                }
            });

            console.log('Element counts loaded:', this.elementCounts);

            await this.updateTokenEstimates();

            // Final refresh of the context interface
            if (this.isContextView) {
                this.renderContextInterface();
            }
        } catch (error) {
            console.warn('Failed to load element counts:', error);
        } finally {
            this.isLoadingCounts = false;
        }
    }

    private updateProgressiveUI(elementType: string, count: number, progress: number): void {
        // Update specific category count
        const categoryLabel = document.querySelector(`#category-${elementType}`)?.parentElement;
        if (categoryLabel) {
            const countSpan = categoryLabel.querySelector('.category-count');
            if (countSpan) {
                countSpan.textContent = `(${count})`;
            }
        }

        // Update world section element counts
        this.updateWorldElementCounts();

        // Update header progress
        const headerTokenCount = document.getElementById('header-token-count');
        if (headerTokenCount) {
            headerTokenCount.innerHTML = `<span class="loading-spinner"></span>Loading... ${progress}%`;
        }

        // Update token estimate as we get data
        this.updateHeaderTokenDisplay();
    }

    private updateWorldElementCounts(): void {
        const elementCountsPreview = document.querySelector('.element-counts-preview');
        if (elementCountsPreview) {
            elementCountsPreview.innerHTML = Object.entries(this.elementCounts)
                .map(([type, count]) => `<span class="count-item">${type}: ${count}</span>`)
                .join('');
        }
    }

    private async updateTokenEstimates(): Promise<void> {
        for (const category of ONLYWORLDS.ELEMENT_TYPES) {
            if (this.preferences.enabledCategories[category]) {
                try {
                    this.tokenEstimates[category] = await contextService.estimateCategoryTokens(category);
                } catch (error) {
                    console.warn(`Failed to estimate tokens for ${category}:`, error);
                    this.tokenEstimates[category] = 0;
                }
            } else {
                this.tokenEstimates[category] = 0;
            }
        }

        // Update UI if in context view
        if (this.isContextView) {
            this.updateTokenDisplays();
        }
    }

    private calculateTotalTokens(): number {
        let total = 0;

        // World info (always included)
        const worldText = `World: ${this.currentWorld?.name || 'Unnamed World'}`;
        total += contextService.estimateTokens(worldText);

        // Selected element
        if (this.preferences.autoSelect && this.currentElement) {
            const elementSize = this.preferences.selectedElementLevel === 'full' ? 500 : 200; // Rough estimate
            total += elementSize;
        }

        // Categories
        Object.entries(this.preferences.enabledCategories).forEach(([category, enabled]) => {
            if (enabled) {
                total += this.tokenEstimates[category] || 0;
            }
        });

        return total;
    }

    private updateTokenDisplays(): void {
        // Update category token displays
        ONLYWORLDS.ELEMENT_TYPES.forEach(category => {
            const tokenDisplay = document.getElementById(`tokens-${category}`);
            if (tokenDisplay) {
                tokenDisplay.textContent = `~${this.tokenEstimates[category] || 0}`;
            }
        });

        // Update header token display
        this.updateHeaderTokenDisplay();
    }

    private async updateTokenEstimate(): Promise<void> {
        const indicator = document.getElementById('token-indicator');
        if (indicator) {
            const totalTokens = this.calculateTotalTokens();
            indicator.textContent = `~${totalTokens}`;

            const warningLevel = contextService.getTokenWarningLevel(totalTokens);
            indicator.className = `token-indicator ${warningLevel}`;
        }
    }

    private savePreferencesAndUpdate(): void {
        contextService.savePreferences(this.preferences);
        this.updateTokenEstimates();

        // Show brief "saved" feedback
        const sections = document.querySelector('.context-sections');
        if (sections) {
            const feedback = document.createElement('div');
            feedback.className = 'preferences-feedback';
            feedback.textContent = UI_LABELS.PREFERENCES_SAVED;
            sections.appendChild(feedback);

            setTimeout(() => {
                feedback.remove();
            }, 2000);
        }
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