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
    PLACEHOLDER_SETUP: 'Paste your OpenAI API key here...',
    PLACEHOLDER_CHAT: 'Ask about your world...',
    SETUP_COMBINED: 'Hi! I\'m an AI assistant for world building purposes. I need an OpenAI API key to operate.\n\nYou can get one from https://platform.openai.com/api-keys, and paste it in here.',
    SETUP_SUCCESS: 'Perfect! I\'m all set up. What would you like to discuss about your world?',
    INVALID_KEY: 'That doesn\'t look like a valid OpenAI API key. Keys should start with "sk-" and be around 50+ characters long.',
    CONNECTION_ERROR: 'I couldn\'t connect with that API key. Please check it\'s valid and try again.',
    ERROR_MESSAGE: 'Sorry, there was an error. Please try again or check your API key.'
};