/**
 * OpenAI Chat Service
 * Handles AI chat functionality using OpenAI's Chat Completions API
 */

import OpenAI from 'openai';
import { SYSTEM_PROMPT, AI_CONFIG } from './responses-config.js';
import { ContextData } from './context-service.js';

export interface OnlyWorldsContext {
    type: 'selected_element' | 'full_world' | 'structured_context';
    data: any | ContextData; // Support both legacy and new structured context
}

export interface ChatResponse {
    content: string;
    error?: string;
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: number;
}

class ResponsesService {
    private client: OpenAI | null = null;
    private messages: ChatMessage[] = [];
    private storageKey = 'ow_chat_messages';

    constructor() {
        this.loadConversationFromStorage();
    }

    private initializeClient(apiKey: string): void {
        this.client = new OpenAI({
            apiKey,
            dangerouslyAllowBrowser: true // Required for browser usage
        });
    }

    private getStoredApiKey(): string | null {
        try {
            return localStorage.getItem('ow_openai_api_key');
        } catch {
            return null;
        }
    }

    setApiKey(apiKey: string): void {
        try {
            localStorage.setItem('ow_openai_api_key', apiKey);
            this.initializeClient(apiKey);
        } catch (error) {
            console.warn('Could not store API key:', error);
        }
    }

    clearApiKey(): void {
        try {
            localStorage.removeItem('ow_openai_api_key');
            this.client = null;
        } catch (error) {
            console.warn('Could not clear API key:', error);
        }
    }

    isConfigured(): boolean {
        if (this.client) return true;

        // Try to initialize with stored API key
        const storedKey = this.getStoredApiKey();
        if (storedKey) {
            this.initializeClient(storedKey);
            return true;
        }

        return false;
    }

    async sendMessage(input: string, context?: OnlyWorldsContext): Promise<ChatResponse> {
        if (!this.isConfigured()) {
            return {
                content: '',
                error: 'No API key configured. Please set up your OpenAI API key.'
            };
        }

        try {
            // Add user message to conversation
            const userMessage: ChatMessage = {
                role: 'user',
                content: input,
                timestamp: Date.now()
            };
            this.messages.push(userMessage);

            // Build instructions with system prompt and context
            let instructions = SYSTEM_PROMPT;
            if (context) {
                instructions += '\n\n' + this.formatContext(context);
            }

            // Use Responses API - it maintains conversation state automatically
            const response = await this.client!.responses.create({
                model: AI_CONFIG.model,
                instructions: instructions,
                input: input,
            });

            const content = response.output_text || 'No response received';

            // Add assistant response to conversation
            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content,
                timestamp: Date.now()
            };
            this.messages.push(assistantMessage);

            this.saveConversationToStorage();

            return { content };

        } catch (error) {
            console.error('Error creating AI response:', error);
            return {
                content: '',
                error: error instanceof Error && error.message.includes('API key')
                    ? 'Invalid API key. Please check your OpenAI API key and try again.'
                    : 'Failed to get AI response. Please try again.'
            };
        }
    }

    clearConversation(): void {
        this.messages = [];
        this.clearConversationFromStorage();
    }

    getMessages(): ChatMessage[] {
        return [...this.messages]; // Return copy
    }

    // Note: Responses API maintains conversation state automatically
    // We keep local messages for UI display purposes only

    private saveConversationToStorage(): void {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.messages));
        } catch (error) {
            console.warn('Could not save conversation to localStorage:', error);
        }
    }

    private loadConversationFromStorage(): void {
        try {
            const storedMessages = localStorage.getItem(this.storageKey);
            if (storedMessages) {
                this.messages = JSON.parse(storedMessages);
            }
        } catch (error) {
            console.warn('Could not load conversation from localStorage:', error);
            this.messages = [];
        }
    }

    private clearConversationFromStorage(): void {
        try {
            localStorage.removeItem(this.storageKey);
        } catch (error) {
            console.warn('Could not clear conversation from localStorage:', error);
        }
    }

    // Method to get conversation status for UI
    hasActiveConversation(): boolean {
        return this.messages.length > 0;
    }

    private formatContext(context: OnlyWorldsContext): string {
        switch (context.type) {
            case 'structured_context':
                return this.formatStructuredContext(context.data as ContextData);

            case 'selected_element':
                return `Selected Element Context:\n${JSON.stringify(context.data, null, 2)}`;

            case 'full_world':
                return `Full World Context:\n${JSON.stringify(context.data, null, 2)}`;

            default:
                return `Context: ${JSON.stringify(context.data, null, 2)}`;
        }
    }

    private formatStructuredContext(contextData: ContextData): string {
        let formattedContext = '';

        // Always include world info
        formattedContext += `World Information:\n`;
        formattedContext += `Name: ${contextData.world.name}\n`;
        formattedContext += `Element Counts: ${Object.entries(contextData.world.elementCounts)
            .map(([type, count]) => `${type}: ${count}`)
            .join(', ')}\n`;

        if (contextData.world.version) {
            formattedContext += `Version: ${contextData.world.version}\n`;
        }

        // Add selected element if present
        if (contextData.selectedElement) {
            formattedContext += `\nSelected Element (${contextData.selectedElement.level}):\n`;
            formattedContext += `Type: ${contextData.selectedElement.data.type}\n`;
            formattedContext += `Name: ${contextData.selectedElement.data.name}\n`;

            if (contextData.selectedElement.level === 'minimal') {
                formattedContext += `Description: ${contextData.selectedElement.data.data.description || 'No description'}\n`;
                formattedContext += `Supertype: ${contextData.selectedElement.data.data.supertype || 'None'}\n`;
                formattedContext += `Subtype: ${contextData.selectedElement.data.data.subtype || 'None'}\n`;
            } else {
                // Full context
                formattedContext += `Full Data:\n${JSON.stringify(contextData.selectedElement.data.data, null, 2)}\n`;

                if (contextData.selectedElement.data.linkedElements && contextData.selectedElement.data.linkedElements.length > 0) {
                    formattedContext += `Linked Elements:\n`;
                    for (const linked of contextData.selectedElement.data.linkedElements) {
                        formattedContext += `- ${linked.type}: ${linked.name}\n`;
                    }
                }
            }
        }

        // Add category data if present
        if (contextData.categories.length > 0) {
            formattedContext += `\nElement Categories:\n`;
            for (const category of contextData.categories) {
                formattedContext += `\n${category.type} (${category.count} elements):\n`;
                for (const element of category.elements) {
                    formattedContext += `- ${element.name}: ${element.data.description || 'No description'}\n`;
                }
            }
        }

        return formattedContext;
    }
}

// Create singleton instance
export const responsesService = new ResponsesService();