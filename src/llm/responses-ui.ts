/**
 * AI Chat UI Controller
 * Manages the chat interface that replaces the middle column
 */

import { ONLYWORLDS } from '../compatibility.js';
import { ContextPreferences, contextService } from './context-service.js';
import { UI_LABELS } from './responses-config.js';
import { OnlyWorldsContext, responsesService } from './responses-service.js';

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
        const wasInContextView = this.isContextView;

        this.isVisible = true;
        this.isContextView = false;

        if (wasInContextView) {
            // If we're switching from context view, just restore the messages and header
            this.restoreChatMessages();
            this.updateHeaderForChatView();
            this.showInputField();
        } else {
            // If coming from closed state, render the full interface
            this.renderChatInterface();
        }

        this.hideElementListView();
    }

    showContextView(): void {
        this.isVisible = true;
        this.isContextView = true;
        this.renderContextInMessagesArea();
        this.updateHeaderForContextView();
        this.hideInputField();
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
                        ${isConfigured ? `
                            <button id="context-toggle-btn" class="btn-clear" title="${UI_LABELS.CONTEXT_TOGGLE}">
                                <span class="material-icons-outlined">settings</span>
                                <span class="context-number" id="context-number">~0</span>
                            </button>
                        ` : ''}
                        <button id="clear-chat-btn" class="btn-clear" title="${UI_LABELS.CLEAR_CHAT}">
                            <span class="material-icons-outlined">refresh</span>
                        </button>
                        ${isConfigured ? `
                            <button id="logout-btn" class="btn-clear" title="Reset API key">
                                <span class="material-icons-outlined">key_off</span>
                            </button>
                        ` : ''}
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

    private updateHeaderForContextView(): void {
        const controls = document.querySelector('.chat-controls');
        if (!controls) return;

        const isConfigured = responsesService.isConfigured();

        controls.innerHTML = `
            <button id="back-to-chat-btn" class="btn-clear" title="${UI_LABELS.BACK_TO_CHAT}">
                <span class="material-icons-outlined">arrow_back</span>
            </button>
            <button id="close-chat-btn" class="btn-close" title="Back to elements">
                <span class="material-icons-outlined">close</span>
            </button>
        `;

        // Re-attach event listeners for the new buttons
        document.getElementById('back-to-chat-btn')?.addEventListener('click', () => {
            this.showChatInterface();
        });

        document.getElementById('close-chat-btn')?.addEventListener('click', () => {
            this.hideChatInterface();
        });
    }

    private renderContextInMessagesArea(): void {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        messagesContainer.innerHTML = `
            <div class="context-content">
                <div class="context-title-section">
                    <h3>${UI_LABELS.CONTEXT_PANEL_TITLE}</h3>
                    <div class="context-header-controls">
                        <div class="max-tokens-control">
                            <label for="max-tokens">Max:</label>
                            <input type="number" id="max-tokens" value="${this.preferences.maxTokens}" min="1000" max="100000" step="1000">
                        </div>
                        <div class="header-token-display" id="header-token-display">
                            <span class="header-token-count" id="header-token-count">~0</span>
                            <span class="header-token-label">tokens</span>
                        </div>
                        <div class="config-help" title="Context Configuration: Choose what information to include with your AI chat messages. Token counts are estimates - actual usage may vary.">
                            <span class="material-icons-outlined">help_outline</span>
                        </div>
                    </div>
                </div>

                <!-- Widget row -->
                <div class="context-widgets">
                    ${this.renderContextWidget('world-minimal', 'World Minimal', 'public', true, true, 'Basic world info (always included)')}
                    ${this.renderContextWidget('world-complete', 'World Enhanced', 'language', this.preferences.worldComplete, true, 'Full world description + all elements summary')}
                    ${this.renderContextWidget('world-full', 'Full Data', 'category', this.preferences.worldFull, true, 'Complete world data with selected categories')}
                    ${this.renderContextWidget('selected-minimal', 'Element Minimal', 'description', this.preferences.autoSelect && this.preferences.selectedElementLevel === 'minimal', !!this.currentElement, 'Selected element basic info')}
                    ${this.renderContextWidget('selected-full', 'Element Full', 'article', this.preferences.autoSelect && this.preferences.selectedElementLevel === 'full', !!this.currentElement, 'Selected element complete details')}
                </div>

                <!-- Expandable details area -->
                <div class="widget-details" id="widget-details">
                    <!-- Details will be rendered here when widgets are clicked -->
                </div>
            </div>
        `;

        this.attachContextEventListeners();
        this.updateHeaderTokenDisplay();
    }

    private renderContextWidget(id: string, title: string, icon: string, isEnabled: boolean, isAvailable: boolean, description: string): string {
        const disabledClass = !isAvailable ? 'disabled' : '';
        const enabledClass = isEnabled ? 'enabled' : '';
        const isWorldWidget = id.startsWith('world-');

        return `
            <div class="context-widget ${disabledClass} ${enabledClass}" data-widget-id="${id}">
                <div class="widget-header">
                    <div class="widget-toggle">
                        ${id === 'world-minimal' ?
                            '<span class="widget-required">✓</span>' :
                            `<span class="widget-status ${isEnabled ? 'enabled' : 'disabled'}"><span class="material-icons-outlined">${isEnabled ? 'check_circle' : 'radio_button_unchecked'}</span></span>`
                        }
                    </div>
                    <div class="widget-icon">
                        <span class="material-icons-outlined">${icon}</span>
                    </div>
                </div>
                <div class="widget-content">
                    <h4 class="widget-title">${title}</h4>
                    <p class="widget-description">${description}</p>
                    <div class="widget-expand" data-expand="${id}">
                        <span class="material-icons-outlined">expand_more</span>
                    </div>
                </div>
            </div>
        `;
    }

    private restoreChatMessages(): void {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        messagesContainer.innerHTML = this.renderMessages() + this.renderInitialMessages();
        this.scrollToBottom();
    }

    private updateHeaderForChatView(): void {
        const controls = document.querySelector('.chat-controls');
        if (!controls) return;

        const isConfigured = responsesService.isConfigured();

        controls.innerHTML = `
            ${isConfigured ? `
                <button id="context-toggle-btn" class="btn-clear" title="${UI_LABELS.CONTEXT_TOGGLE}">
                    <span class="material-icons-outlined">settings</span>
                    <span class="context-number" id="context-number">~0</span>
                </button>
            ` : ''}
            <button id="clear-chat-btn" class="btn-clear" title="${UI_LABELS.CLEAR_CHAT}">
                <span class="material-icons-outlined">refresh</span>
            </button>
            ${isConfigured ? `
                <button id="logout-btn" class="btn-clear" title="Reset API key">
                    <span class="material-icons-outlined">key_off</span>
                </button>
            ` : ''}
            <button id="close-chat-btn" class="btn-close" title="Back to elements">
                <span class="material-icons-outlined">close</span>
            </button>
        `;

        // Re-attach event listeners
        this.attachChatHeaderEventListeners();
        // Update token estimate for context button
        this.updateTokenEstimate();
    }

    private attachChatHeaderEventListeners(): void {
        // Clear conversation
        document.getElementById('clear-chat-btn')?.addEventListener('click', () => {
            this.clearConversation();
        });

        // Logout/reset API key
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            this.handleLogout();
        });

        // Close chat interface
        document.getElementById('close-chat-btn')?.addEventListener('click', () => {
            this.hideChatInterface();
        });

        // Handle context configuration button
        document.getElementById('context-toggle-btn')?.addEventListener('click', () => {
            this.toggleContextView();
        });
    }

    private hideInputField(): void {
        const inputArea = document.querySelector('.chat-input-area') as HTMLElement;
        if (inputArea) {
            inputArea.style.display = 'none';
        }
    }

    private showInputField(): void {
        const inputArea = document.querySelector('.chat-input-area') as HTMLElement;
        if (inputArea) {
            inputArea.style.display = 'block';
        }
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

        // Logout/reset API key
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            this.handleLogout();
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

    private handleLogout(): void {
        // Clear API key and conversation
        responsesService.clearApiKey();
        this.chatMessages = [];
        responsesService.clearConversation();

        // Refresh the chat interface to show setup state
        this.renderChatInterface();
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

        // Widget checkboxes
        document.getElementById('widget-world-complete')?.addEventListener('change', (e) => {
            console.log('World complete checkbox changed:', (e.target as HTMLInputElement).checked);
            this.preferences.worldComplete = (e.target as HTMLInputElement).checked;
            this.savePreferencesAndUpdate();
        });

        document.getElementById('widget-world-full')?.addEventListener('change', (e) => {
            this.preferences.worldFull = (e.target as HTMLInputElement).checked;
            this.savePreferencesAndUpdate();
        });

        document.getElementById('widget-selected-minimal')?.addEventListener('change', (e) => {
            this.preferences.autoSelect = (e.target as HTMLInputElement).checked;
            this.savePreferencesAndUpdate();
        });

        document.getElementById('widget-selected-full')?.addEventListener('change', (e) => {
            const checked = (e.target as HTMLInputElement).checked;
            if (checked) {
                this.preferences.selectedElementLevel = 'full';
                this.preferences.autoSelect = true;
                // Uncheck minimal
                const minimalCheckbox = document.getElementById('widget-selected-minimal') as HTMLInputElement;
                if (minimalCheckbox) minimalCheckbox.checked = false;
            } else {
                this.preferences.selectedElementLevel = 'minimal';
            }
            this.savePreferencesAndUpdate();
        });

        // Widget clicking (for all widgets except world-minimal)
        document.querySelectorAll('.context-widget:not([data-widget-id="world-minimal"])').forEach(widget => {
            widget.addEventListener('click', (e) => {
                // Don't trigger if clicking on expand button
                if ((e.target as HTMLElement).closest('.widget-expand')) {
                    return;
                }

                const widgetId = (e.currentTarget as HTMLElement).getAttribute('data-widget-id');
                console.log('Widget clicked:', widgetId);

                if (widgetId === 'world-complete') {
                    this.preferences.worldComplete = !this.preferences.worldComplete;
                } else if (widgetId === 'world-full') {
                    this.preferences.worldFull = !this.preferences.worldFull;
                } else if (widgetId === 'selected-minimal') {
                    if (this.currentElement) {
                        const wasMinimalEnabled = this.preferences.autoSelect && this.preferences.selectedElementLevel === 'minimal';
                        if (wasMinimalEnabled) {
                            this.preferences.autoSelect = false;
                        } else {
                            this.preferences.autoSelect = true;
                            this.preferences.selectedElementLevel = 'minimal';
                        }
                    }
                } else if (widgetId === 'selected-full') {
                    if (this.currentElement) {
                        const wasFullEnabled = this.preferences.autoSelect && this.preferences.selectedElementLevel === 'full';
                        if (wasFullEnabled) {
                            this.preferences.autoSelect = false;
                        } else {
                            this.preferences.autoSelect = true;
                            this.preferences.selectedElementLevel = 'full';
                        }
                    }
                }

                this.savePreferencesAndUpdate();
                // Re-render to update visual state
                this.renderContextInMessagesArea();
            });
        });

        // Widget expansion
        document.querySelectorAll('.widget-expand').forEach(expandBtn => {
            expandBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const widgetId = (e.currentTarget as HTMLElement).getAttribute('data-expand');
                console.log('Widget expand clicked:', widgetId);
                this.toggleWidgetDetails(widgetId!);
            });
        });

        // Max tokens setting (still needed)
        document.getElementById('max-tokens')?.addEventListener('change', (e) => {
            this.preferences.maxTokens = parseInt((e.target as HTMLInputElement).value) || 50000;
            this.savePreferencesAndUpdate();
        });
    }

    private toggleWidgetDetails(widgetId: string): void {
        const detailsContainer = document.getElementById('widget-details');
        if (!detailsContainer) return;

        // Check if this widget is already expanded
        const isExpanded = detailsContainer.getAttribute('data-expanded') === widgetId;

        if (isExpanded) {
            // Collapse
            detailsContainer.innerHTML = '';
            detailsContainer.removeAttribute('data-expanded');
            // Reset all expand buttons
            document.querySelectorAll('.widget-expand').forEach(btn => {
                btn.classList.remove('expanded');
                const icon = btn.querySelector('.material-icons-outlined');
                if (icon) icon.textContent = 'expand_more';
            });
        } else {
            // Expand
            detailsContainer.innerHTML = this.renderWidgetDetails(widgetId);
            detailsContainer.setAttribute('data-expanded', widgetId);
            // Update expand buttons
            document.querySelectorAll('.widget-expand').forEach(btn => {
                btn.classList.remove('expanded');
                const icon = btn.querySelector('.material-icons-outlined');
                if (icon) icon.textContent = 'expand_more';
            });
            const currentBtn = document.querySelector(`[data-expand="${widgetId}"]`);
            if (currentBtn) {
                currentBtn.classList.add('expanded');
                const currentIcon = currentBtn.querySelector('.material-icons-outlined');
                if (currentIcon) currentIcon.textContent = 'expand_less';
            }

            // Attach event listeners for the expanded content
            this.attachWidgetDetailsEventListeners(widgetId);
        }
    }

    private renderWidgetDetails(widgetId: string): string {
        const totalElements = Object.values(this.elementCounts).reduce((sum, count) => sum + count, 0);

        switch (widgetId) {
            case 'world-minimal':
                return `
                    <div class="widget-detail-content">
                        <div class="detail-header">
                            <h4>Includes</h4>
                            <span class="header-token-estimate">~300 tokens</span>
                        </div>
                        <div class="includes-list">
                            <div class="include-item">
                                <span class="material-icons-outlined">public</span>
                                <span>World name</span>
                            </div>
                            <div class="include-item">
                                <span class="material-icons-outlined">numbers</span>
                                <span>Element counts (${totalElements} total)</span>
                            </div>
                            <div class="category-icons-compact">
                                ${Object.entries(this.elementCounts).map(([type, count]) => `
                                    <div class="category-icon-item" title="${type}">
                                        <span class="material-icons-outlined">${this.getCategoryIcon(type)}</span>
                                        <span class="category-icon-count">${count}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `;

            case 'world-complete':
                return `
                    <div class="widget-detail-content">
                        <div class="detail-header">
                            <h4>Includes</h4>
                            <span class="header-token-estimate">~${this.calculateWorldCompleteTokens()} tokens</span>
                        </div>
                        <div class="includes-list">
                            <div class="include-item">
                                <span class="material-icons-outlined">description</span>
                                <span>Description</span>
                            </div>
                            <div class="include-item">
                                <span class="material-icons-outlined">image</span>
                                <span>Image URL</span>
                            </div>
                            <div class="include-item">
                                <span class="material-icons-outlined">schedule</span>
                                <span>Time fields</span>
                            </div>
                        </div>
                        <div class="token-estimate">Estimated: ~${this.calculateWorldCompleteTokens()} tokens</div>
                    </div>
                `;

            case 'world-full':
                const selectedTokens = Object.entries(this.preferences.enabledCategories)
                    .filter(([_, enabled]) => enabled)
                    .reduce((total, [category]) => total + (this.tokenEstimates[category] || 0), 0);
                return `
                    <div class="widget-detail-content">
                        <div class="detail-header">
                            <h4>Includes - Category Selection</h4>
                            <span class="header-token-estimate">~${selectedTokens} tokens</span>
                        </div>
                        <div class="category-controls">
                            <button id="select-all-categories" class="btn-category-toggle">All</button>
                            <button id="select-none-categories" class="btn-category-toggle">None</button>
                        </div>
                        <div class="category-compact-grid">
                            ${ONLYWORLDS.ELEMENT_TYPES.map(category => `
                                <label class="category-compact-checkbox" title="${category}">
                                    <input type="checkbox" id="category-${category}" ${this.preferences.enabledCategories[category] ? 'checked' : ''}>
                                    <span class="material-icons-outlined">${this.getCategoryIcon(category)}</span>
                                    <span class="category-count">${this.elementCounts[category] || 0}</span>
                                    <span class="category-tokens">~${this.tokenEstimates[category] || 0}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                `;

            case 'selected-minimal':
                return `
                    <div class="widget-detail-content">
                        <div class="detail-header">
                            <h4>Includes</h4>
                            <span class="header-token-estimate">~200 tokens</span>
                        </div>
                        ${this.currentElement ? `
                            <div class="includes-list">
                                <div class="include-item">
                                    <span class="material-icons-outlined">label</span>
                                    <span>Name: <strong>${this.currentElement.name}</strong></span>
                                </div>
                                <div class="include-item">
                                    <span class="material-icons-outlined">category</span>
                                    <span>Type: ${this.currentElement.type || this.currentElement.element_type || 'unknown'}</span>
                                </div>
                            </div>
                        ` : `
                            <p class="no-element">No element selected</p>
                        `}
                    </div>
                `;

            case 'selected-full':
                return `
                    <div class="widget-detail-content">
                        <div class="detail-header">
                            <h4>Includes</h4>
                            <span class="header-token-estimate">~${this.calculateSelectedElementTokens()} tokens</span>
                        </div>
                        ${this.currentElement ? `
                            <div class="includes-list">
                                <div class="include-item">
                                    <span class="material-icons-outlined">article</span>
                                    <span>All fields for: <strong>${this.currentElement.name}</strong> (${this.currentElement.type || this.currentElement.element_type || 'unknown'})</span>
                                </div>
                                <div class="include-item">
                                    <span class="material-icons-outlined">link</span>
                                    <span>All relationships and linked elements</span>
                                </div>
                                <div class="include-item">
                                    <span class="material-icons-outlined">data_object</span>
                                    <span>Full field values for all linked elements</span>
                                </div>
                            </div>
                        ` : `
                            <p class="no-element">No element selected</p>
                        `}
                    </div>
                `;

            default:
                return '<p>Details not available</p>';
        }
    }

    private getCategoryIcon(category: string): string {
        return (ONLYWORLDS.ELEMENT_ICONS as any)[category] || 'category';
    }

    private attachWidgetDetailsEventListeners(widgetId: string): void {
        if (widgetId === 'world-full') {
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
        }
    }

    private calculateWorldCompleteTokens(): number {
        // Rough estimate for world complete context
        return 2000; // Base world info + element summaries
    }

    private calculateSelectedElementTokens(): number {
        // Rough estimate for selected element with all relationships
        return 1500; // Base element + relationships + linked elements
    }

    private async loadElementCounts(): Promise<void> {
        if (this.isLoadingCounts) return; // Prevent duplicate loading

        try {
            this.isLoadingCounts = true; 


            // Use progressive loading with callback
            this.elementCounts = await contextService.getElementCounts((elementType, count, progress) => {
                // Update individual counts as they come in
                this.elementCounts[elementType] = count;

            });
 

            await this.updateTokenEstimates();

            // Final refresh of the context interface
            if (this.isContextView) {
                this.renderContextInMessagesArea();
            }
        } catch (error) {
            console.warn('Failed to load element counts:', error);
        } finally {
            this.isLoadingCounts = false;
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

        // Update token estimate in header
        this.updateTokenEstimate();
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


    private async updateTokenEstimate(): Promise<void> {
        const indicator = document.getElementById('context-number');
        if (indicator) {
            const totalTokens = this.calculateTotalTokens();
            indicator.textContent = `~${totalTokens}`;

            const warningLevel = contextService.getTokenWarningLevel(totalTokens);
            indicator.className = `context-number ${warningLevel}`;
        }
    }

    private savePreferencesAndUpdate(): void {
        contextService.savePreferences(this.preferences);
        this.updateTokenEstimates();
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