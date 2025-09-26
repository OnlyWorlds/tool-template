/**
 * UI Error handling types and utilities
 * Demonstrates discriminated unions and error recovery patterns for UI components
 */

import { ApiError } from './api-result.js';

// UI-specific error states with simple recovery actions
export type UiErrorState =
  | { type: 'loading'; message: string }
  | { type: 'empty'; message: string; action?: { label: string; handler: () => void } }
  | { type: 'auth_required'; message: string; action: { label: string; handler: () => void } }
  | { type: 'network_error'; message: string }
  | { type: 'fatal_error'; message: string; supportInfo?: string };

// Convert API errors to UI error states with appropriate recovery actions
export const mapApiErrorToUiState = (
  apiError: ApiError,
  retryHandler: () => Promise<void>
): UiErrorState => {
  switch (apiError.type) {
    case 'AUTHENTICATION_ERROR':
      return {
        type: 'auth_required',
        message: apiError.message,
        action: {
          label: 'Reconnect',
          handler: () => {
            // Focus on the API key input for reconnection
            const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
            apiKeyInput?.focus();
          }
        }
      };

    case 'NETWORK_ERROR':
      return {
        type: 'network_error',
        message: apiError.message
      };

    case 'RESOURCE_NOT_FOUND':
      return {
        type: 'empty',
        message: `No ${apiError.resourceType}s found in this world.`,
        action: {
          label: `Create ${apiError.resourceType}`,
          handler: () => {
            // Trigger create element modal
            const createBtn = document.getElementById('create-element-btn') as HTMLButtonElement;
            if (createBtn) {
              createBtn.dataset.elementType = apiError.resourceType;
              createBtn.click();
            }
          }
        }
      };

    case 'VALIDATION_ERROR':
      return {
        type: 'fatal_error',
        message: `Invalid ${apiError.field}: ${apiError.message}`
      };

    case 'SDK_ERROR':
      return {
        type: 'network_error',
        message: 'SDK connection issue. Please refresh the page.'
      };

    case 'UNKNOWN_ERROR':
      return {
        type: 'fatal_error',
        message: 'An unexpected error occurred.',
        supportInfo: 'If this persists, check the browser console for details and report the issue on GitHub.'
      };

    default:
      return {
        type: 'fatal_error',
        message: 'Unknown error occurred.',
        supportInfo: 'Please refresh the page and try again.'
      };
  }
};

// Render UI error state to HTML with appropriate styling and actions
export const renderErrorState = (errorState: UiErrorState, container: HTMLElement): void => {
  const errorDiv = document.createElement('div');
  errorDiv.className = `error-state error-${errorState.type}`;

  switch (errorState.type) {
    case 'loading':
      errorDiv.innerHTML = `
        <div class="loading-spinner"></div>
        <p class="loading-text">${errorState.message}</p>
      `;
      break;

    case 'empty':
      errorDiv.innerHTML = `
        <p class="empty-text">${errorState.message}</p>
      `;

      if (errorState.action) {
        const actionBtn = errorDiv.querySelector('.action-btn') as HTMLButtonElement;
        actionBtn?.addEventListener('click', errorState.action.handler);
      }
      break;

    case 'auth_required':
      errorDiv.innerHTML = `
        <div class="auth-icon">🔐</div>
        <p class="error-text">${errorState.message}</p>
        <button class="btn-primary action-btn">${errorState.action.label}</button>
      `;

      const authBtn = errorDiv.querySelector('.action-btn') as HTMLButtonElement;
      authBtn?.addEventListener('click', errorState.action.handler);
      break;

    case 'network_error':
      errorDiv.innerHTML = `
        <div class="network-icon">📡</div>
        <p class="error-text">${errorState.message}</p>
        <p class="support-info">Try refreshing the page or check your connection.</p>
      `;
      break;

    case 'fatal_error':
      errorDiv.innerHTML = `
        <div class="fatal-icon">💥</div>
        <p class="error-text">${errorState.message}</p>
        ${errorState.supportInfo ? `<p class="support-info">${errorState.supportInfo}</p>` : ''}
        <button class="btn-outline" onclick="window.location.reload()">Refresh Page</button>
      `;
      break;
  }

  container.innerHTML = '';
  container.appendChild(errorDiv);
};