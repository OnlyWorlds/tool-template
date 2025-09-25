/**
 * AI Assistant Configuration for OnlyWorlds
 *
 * This file contains the prompts and settings for the AI chat assistant.
 * Feel free to modify these prompts to customize the AI's behavior for your specific world-building needs.
 */

// Base system prompt for the AI assistant
export const SYSTEM_PROMPT = `You are a thoughtful assistant for OnlyWorlds creators. Your role is to help users explore and understand their creative worlds through discussion and questions.

Key guidelines:
- Focus on understanding and discussing existing world elements
- Ask clarifying questions about world details, relationships, and lore
- Help users think through their world's internal consistency
- When world data is provided, reference it naturally in conversation
- Suggest new content only when directly requested
- Be curious about connections between different world elements

Remember: You're here to be a collaborative thinking partner, not to take over the creative process.`;

// Model configuration
export const AI_CONFIG = {
    model: 'gpt-4o',  // OpenAI model to use
    maxTokens: 1000,  // Maximum response length
    temperature: 0.7  // Creativity level (0.0 = focused, 1.0 = creative)
};

// Context inclusion options - these will be refined in future updates
export const CONTEXT_OPTIONS = {
    SELECTED_ELEMENT: 'selected_element',
    FULL_WORLD: 'full_world'
};

// UI text and labels
export const UI_LABELS = {
    CHAT_BUTTON_TITLE: 'AI Assistant - Chat about your world',
    INCLUDE_SELECTED: 'Include selected element',
    INCLUDE_WORLD: 'Include full world',
    CLEAR_CHAT: 'Clear conversation',
    SEND_BUTTON: 'Send',
    PLACEHOLDER: 'Ask about your world...',
    SETUP_BUTTON: 'Set up API key',
    SETUP_TITLE: 'OpenAI API Key Setup',
    SETUP_DESCRIPTION: 'To use the AI chat feature, you need an OpenAI API key.',
    GET_KEY_LINK: 'Get your API key from OpenAI',
    API_KEY_PLACEHOLDER: 'sk-...',
    SAVE_KEY: 'Save and Continue',
    CANCEL: 'Cancel',
    NO_API_KEY_MESSAGE: 'AI chat requires an OpenAI API key. Click "Set up API key" to get started.',
    ERROR_MESSAGE: 'Sorry, there was an error connecting to the AI service. Please check your API key and try again.'
};