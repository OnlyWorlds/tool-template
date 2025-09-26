/**
 * Export Modal
 * Provides three options for exporting local world data:
 * 1. Download as JSON file
 * 2. Copy to clipboard
 * 3. Upload to OnlyWorlds.com (with API credentials)
 */

import { modeRouter } from '../modes/mode-router.js';
import apiService from '../api.js';
import { authManager } from '../auth.js';

export class ExportModal {
    private modal: HTMLElement | null = null;

    show(): void {
        this.createModal();
        document.body.appendChild(this.modal!);
        this.modal!.classList.add('visible');

        // Focus on the first button
        const downloadBtn = this.modal!.querySelector('#download-btn') as HTMLButtonElement;
        if (downloadBtn) {
            downloadBtn.focus();
        }
    }

    hide(): void {
        if (this.modal) {
            this.modal.classList.remove('visible');
            setTimeout(() => {
                if (this.modal && this.modal.parentNode) {
                    this.modal.parentNode.removeChild(this.modal);
                }
                this.modal = null;
            }, 300);
        }
    }

    private createModal(): void {
        this.modal = document.createElement('div');
        this.modal.className = 'modal export-modal';

        this.modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-body">
                    <div class="export-section">
                        <h4>Download as File</h4>
                        <p>Save your world as a JSON file to your computer</p>
                        <button type="button" id="download-btn" class="btn btn-primary">Download JSON File</button>
                    </div>

                    <div class="export-section">
                        <h4>Copy to Clipboard</h4>
                        <p>Copy the JSON data to your clipboard for easy sharing or backup</p>
                        <button type="button" id="clipboard-btn" class="btn btn-secondary">Copy to Clipboard</button>
                    </div>

                    <div class="export-section">
                        <h4>Upload to OnlyWorlds.com</h4>
                        <p><strong>⚠️ Warning:</strong> This will replace your entire online world with the local data.</p>
                        <div class="upload-form">
                            <div class="upload-inputs">
                                <input type="text" id="upload-api-key" placeholder="API Key" class="upload-input" maxlength="10" />
                                <input type="password" id="upload-api-pin" placeholder="PIN" class="upload-input upload-input-pin" maxlength="4" />
                            </div>
                            <button type="button" id="upload-btn" class="btn btn-primary" disabled>Replace Online World</button>
                        </div>
                        <div class="help-text">Get your API credentials from <a href="https://www.onlyworlds.com" target="_blank">onlyworlds.com</a></div>
                    </div>

                    <div id="export-status" class="export-status hidden"></div>
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    private attachEventListeners(): void {
        if (!this.modal) return;

        // No close button - only click outside to close

        // Click outside to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });

        // Download button
        const downloadBtn = this.modal.querySelector('#download-btn') as HTMLButtonElement;
        downloadBtn?.addEventListener('click', () => this.handleDownload());

        // Clipboard button
        const clipboardBtn = this.modal.querySelector('#clipboard-btn') as HTMLButtonElement;
        clipboardBtn?.addEventListener('click', () => this.handleClipboard());

        // Upload button
        const uploadBtn = this.modal.querySelector('#upload-btn') as HTMLButtonElement;
        uploadBtn?.addEventListener('click', () => this.handleUpload());

        // Upload input validation
        const apiKeyInput = this.modal.querySelector('#upload-api-key') as HTMLInputElement;
        const apiPinInput = this.modal.querySelector('#upload-api-pin') as HTMLInputElement;

        const validateUploadInputs = () => {
            const apiKey = apiKeyInput.value.trim();
            const apiPin = apiPinInput.value.trim();
            const isValid = apiKey.length === 10 && apiPin.length === 4;
            uploadBtn.disabled = !isValid;
        };

        apiKeyInput?.addEventListener('input', validateUploadInputs);
        apiPinInput?.addEventListener('input', validateUploadInputs);

        // Enter key handling
        apiKeyInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                apiPinInput.focus();
            }
        });

        apiPinInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !uploadBtn.disabled) {
                this.handleUpload();
            }
        });

        // Keyboard shortcuts
        this.modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hide();
            }
        });
    }

    private async handleDownload(): Promise<void> {
        try {
            const jsonData = modeRouter.exportToJSON();
            const jsonString = JSON.stringify(jsonData, null, 2);

            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            const worldName = jsonData.World?.name || 'OnlyWorldsData';
            const safeWorldName = worldName.replace(/[^a-zA-Z0-9_-]/g, '_');
            a.href = url;
            a.download = `${safeWorldName}.json`;

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showStatus('✅ File downloaded successfully!', 'success');

            // Auto-close after success
            setTimeout(() => this.hide(), 1500);

        } catch (error) {
            console.error('Download error:', error);
            this.showStatus('❌ Failed to download file. Please try again.', 'error');
        }
    }

    private async handleClipboard(): Promise<void> {
        try {
            const jsonData = modeRouter.exportToJSON();
            const jsonString = JSON.stringify(jsonData, null, 2);

            await navigator.clipboard.writeText(jsonString);
            this.showStatus('✅ Copied to clipboard!', 'success');

            // Auto-close after success
            setTimeout(() => this.hide(), 1500);

        } catch (error) {
            console.error('Clipboard error:', error);

            // Fallback: try legacy method
            try {
                const jsonData = modeRouter.exportToJSON();
                const jsonString = JSON.stringify(jsonData, null, 2);

                const textArea = document.createElement('textarea');
                textArea.value = jsonString;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);

                this.showStatus('✅ Copied to clipboard!', 'success');
                setTimeout(() => this.hide(), 1500);
            } catch (fallbackError) {
                this.showStatus('❌ Failed to copy to clipboard. Please try manually selecting and copying the data.', 'error');
            }
        }
    }

    private async handleUpload(): Promise<void> {
        const uploadBtn = this.modal!.querySelector('#upload-btn') as HTMLButtonElement;
        const apiKeyInput = this.modal!.querySelector('#upload-api-key') as HTMLInputElement;
        const apiPinInput = this.modal!.querySelector('#upload-api-pin') as HTMLInputElement;

        if (uploadBtn.disabled) {
            this.showStatus('Please enter valid API credentials (10-digit key and 4-digit PIN)', 'error');
            return;
        }

        const apiKey = apiKeyInput.value.trim();
        const apiPin = apiPinInput.value.trim();

        // Set loading state
        const originalText = uploadBtn.textContent;
        uploadBtn.textContent = 'Uploading...';
        uploadBtn.disabled = true;
        this.setFormDisabled(true);

        try {
            // Get local world data
            const localData = modeRouter.exportToJSON();

            // Test authentication first
            this.showStatus('🔐 Authenticating...', 'info');

            // Set up temporary authentication
            await this.authenticateTemporary(apiKey, apiPin);

            this.showStatus('📤 Uploading world data...', 'info');

            // Clear existing world data first
            this.showStatus('🗑️ Clearing existing world data...', 'info');
            await this.clearOnlineWorld();

            // Upload all elements to the online world
            await this.uploadWorldData(localData);

            // Success! Switch to online mode
            this.showStatus('✅ Upload successful! Switching to online mode...', 'success');

            // Store the credentials for online mode
            localStorage.setItem('ow_api_key', apiKey);
            localStorage.setItem('ow_api_pin', apiPin);

            // Clear local data and switch to online mode
            modeRouter.clearLocalWorld();

            // Hide modal first to prevent UI conflicts
            this.hide();

            // Switch to online mode without page reload
            await modeRouter.switchToOnlineMode();

            // Trigger a gentle app refresh without full page reload
            window.dispatchEvent(new CustomEvent('worldReplaced'));

        } catch (error) {
            console.error('Upload error:', error);
            const errorMessage = this.getUploadErrorMessage(error);
            this.showStatus(`❌ ${errorMessage}`, 'error');

            // Restore form
            uploadBtn.textContent = originalText;
            uploadBtn.disabled = false;
            this.setFormDisabled(false);
        }
    }

    private async authenticateTemporary(apiKey: string, apiPin: string): Promise<void> {
        // Store current credentials
        const currentKey = localStorage.getItem('ow_api_key');
        const currentPin = localStorage.getItem('ow_api_pin');

        try {
            // Set temporary credentials
            localStorage.setItem('ow_api_key', apiKey);
            localStorage.setItem('ow_api_pin', apiPin);

            // Test authentication
            await authManager.authenticate(apiKey, apiPin);

            // If we get here, authentication succeeded
        } catch (error) {
            // Restore original credentials on failure
            if (currentKey) {
                localStorage.setItem('ow_api_key', currentKey);
            } else {
                localStorage.removeItem('ow_api_key');
            }

            if (currentPin) {
                localStorage.setItem('ow_api_pin', currentPin);
            } else {
                localStorage.removeItem('ow_api_pin');
            }

            throw error;
        }
    }

    private async clearOnlineWorld(): Promise<void> {
        const elementTypes = modeRouter.getElementTypes();

        // Get and delete all existing elements
        for (const elementType of elementTypes) {
            try {
                const result = await (window as any).apiService.getElements(elementType);
                if (result.success && result.data) {
                    const elements = result.data;

                    for (const element of elements) {
                        await (window as any).apiService.deleteElement(elementType, element.id);
                    }
                }
            } catch (error) {
                // Some element types might not exist or be empty - that's OK
                console.log(`No existing ${elementType} elements to clear (or error accessing):`, error);
            }
        }
    }

    private async uploadWorldData(localData: any): Promise<void> {
        const elementTypes = modeRouter.getElementTypes();
        let uploadedCount = 0;
        let totalElements = 0;

        // Count total elements first
        for (const elementType of elementTypes) {
            const capitalizedType = elementType.charAt(0).toUpperCase() + elementType.slice(1);
            const elements = localData[capitalizedType] || [];
            totalElements += elements.length;
        }

        // Upload each element type
        for (const elementType of elementTypes) {
            const capitalizedType = elementType.charAt(0).toUpperCase() + elementType.slice(1);
            const elements = localData[capitalizedType] || [];

            for (const element of elements) {
                try {
                    // Clean element data for API upload
                    const cleanElement = this.cleanElementForUpload(element);

                    await (window as any).apiService.createElement(elementType, cleanElement);
                    uploadedCount++;

                    // Update progress
                    this.showStatus(`📤 Uploading... (${uploadedCount}/${totalElements})`, 'info');
                } catch (error) {
                    console.error(`Failed to upload ${elementType} "${element.name}":`, error);

                    // Parse validation errors from 422 response
                    let errorMessage = `Failed to upload ${elementType} "${element.name || 'Unnamed'}"`;
                    if (error && typeof error === 'object' && 'message' in error) {
                        const errorStr = error.message as string;
                        if (errorStr.includes('422')) {
                            errorMessage += ' - Validation error (check element data)';
                        } else {
                            errorMessage += ` - ${errorStr}`;
                        }
                    }

                    throw new Error(errorMessage);
                }
            }
        }
    }

    private cleanElementForUpload(element: any): any {
        const cleaned: any = {};

        // Fields to exclude from upload
        const excludeFields = [
            'world', // Will be set by API
            'created_at', // Will be set by API
            'updated_at', // Will be set by API
            '_localMeta' // Local-only metadata
        ];

        // Copy all fields except excluded ones
        for (const [key, value] of Object.entries(element)) {
            if (excludeFields.includes(key)) {
                continue;
            }

            // Clean null/undefined values
            if (value === null || value === undefined) {
                continue;
            }

            // Clean empty strings (but keep non-empty strings)
            if (value === '') {
                continue;
            }

            // Clean empty arrays
            if (Array.isArray(value) && value.length === 0) {
                continue;
            }

            cleaned[key] = value;
        }

        return cleaned;
    }

    private setFormDisabled(disabled: boolean): void {
        const apiKeyInput = this.modal!.querySelector('#upload-api-key') as HTMLInputElement;
        const apiPinInput = this.modal!.querySelector('#upload-api-pin') as HTMLInputElement;
        const downloadBtn = this.modal!.querySelector('#download-btn') as HTMLButtonElement;
        const clipboardBtn = this.modal!.querySelector('#clipboard-btn') as HTMLButtonElement;

        apiKeyInput.disabled = disabled;
        apiPinInput.disabled = disabled;
        downloadBtn.disabled = disabled;
        clipboardBtn.disabled = disabled;
    }

    private getUploadErrorMessage(error: any): string {
        if (!error) return 'Unknown error occurred';

        const message = error instanceof Error ? error.message : String(error);

        if (message.includes('authentication') || message.includes('credentials')) {
            return 'Invalid API credentials. Please check your API key and PIN.';
        }

        if (message.includes('network') || message.includes('fetch')) {
            return 'Network error. Please check your internet connection and try again.';
        }

        if (message.includes('quota') || message.includes('limit')) {
            return 'Upload limit reached. Please contact OnlyWorlds support.';
        }

        // Return the original message if it's already user-friendly
        return message;
    }

    private showStatus(message: string, type: 'info' | 'success' | 'error'): void {
        const statusEl = this.modal!.querySelector('#export-status') as HTMLElement;

        statusEl.textContent = message;
        statusEl.className = `export-status ${type}`;
        statusEl.classList.remove('hidden');

        // Auto-hide info messages
        if (type === 'info') {
            setTimeout(() => {
                if (statusEl.textContent === message) {
                    statusEl.classList.add('hidden');
                }
            }, 5000);
        }
    }
}