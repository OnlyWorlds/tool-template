/**
 * OpenAI Chat Service
 * Handles AI chat functionality using OpenAI's Chat Completions API
 */

import OpenAI from 'openai';
import { SYSTEM_PROMPT, AI_CONFIG } from './responses-config.js';

export interface OnlyWorldsContext {
    type: 'selected_element' | 'full_world';
    data: any; // Will be refined later - flexible for now
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
                instructions += `\n\nContext: ${JSON.stringify(context.data, null, 2)}`;
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
}

// Create singleton instance
export const responsesService = new ResponsesService();