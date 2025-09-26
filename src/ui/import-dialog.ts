/**
 * JSON Import Dialog
 * Provides multiple ways to import JSON: file upload, clipboard paste, drag & drop
 */

import { modeRouter } from '../modes/mode-router.js';

export class ImportDialog {
    private modal: HTMLElement | null = null;

    show(): void {
        this.createModal();
        document.body.appendChild(this.modal!);
        this.modal!.classList.add('visible');

        // Focus on the first input
        const fileInput = this.modal!.querySelector('#json-file-input') as HTMLInputElement;
        if (fileInput) {
            fileInput.focus();
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
        this.modal.className = 'modal import-dialog';

        this.modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-body">
                    <div class="import-section">
                        <h3>Upload JSON file</h3>
                        <input type="file" id="json-file-input" accept=".json" class="file-input" />
                        <button type="button" id="file-browse-btn" class="btn btn-primary btn-small">Select OnlyWorlds JSON File</button>
                    </div>

                    <div class="import-section">
                        <h3>Paste OnlyWorlds JSON data</h3>
                        <textarea id="json-paste-area" placeholder="Paste your OnlyWorlds JSON data here..." rows="10"></textarea>
                        <div id="json-validation-status" class="json-validation-status hidden"></div>
                        <div class="paste-actions">
                            <button type="button" id="paste-clear-btn" class="btn btn-secondary btn-small">Clear</button>
                            <button type="button" id="paste-import-btn" class="btn btn-primary btn-small" disabled>Import from Text</button>
                        </div>
                    </div>

                    <div id="import-status" class="import-status hidden"></div>
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    private attachEventListeners(): void {
        if (!this.modal) return;

        // No close button or cancel button - only click outside to close

        // Click outside to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });

        // File input
        const fileInput = this.modal.querySelector('#json-file-input') as HTMLInputElement;
        fileInput?.addEventListener('change', (e) => this.handleFileSelect(e));

        // Paste area buttons
        const clearBtn = this.modal.querySelector('#paste-clear-btn') as HTMLButtonElement;
        const importBtn = this.modal.querySelector('#paste-import-btn') as HTMLButtonElement;

        clearBtn?.addEventListener('click', () => {
            const textarea = this.modal!.querySelector('#json-paste-area') as HTMLTextAreaElement;
            textarea.value = '';
            textarea.focus();
            // Re-validate after clearing
            this.validatePasteAreaJSON();
        });

        importBtn?.addEventListener('click', () => this.handlePasteImport());

        // Real-time JSON validation for paste area
        const pasteArea = this.modal.querySelector('#json-paste-area') as HTMLTextAreaElement;
        pasteArea?.addEventListener('input', () => this.validatePasteAreaJSON());
        pasteArea?.addEventListener('paste', () => {
            // Validate after paste event completes
            setTimeout(() => this.validatePasteAreaJSON(), 10);
        });

        // File browse button
        const fileBrowseBtn = this.modal.querySelector('#file-browse-btn') as HTMLButtonElement;
        fileBrowseBtn?.addEventListener('click', () => {
            fileInput?.click();
        });

        // Keyboard shortcuts
        this.modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hide();
            }
        });
    }

    private handleFileSelect(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (file) {
            this.importFromFile(file);
        }
    }


    private validatePasteAreaJSON(): void {
        const textarea = this.modal!.querySelector('#json-paste-area') as HTMLTextAreaElement;
        const importBtn = this.modal!.querySelector('#paste-import-btn') as HTMLButtonElement;
        const validationStatus = this.modal!.querySelector('#json-validation-status') as HTMLElement;

        const jsonText = textarea.value.trim();

        if (!jsonText) {
            // Empty text - hide validation, disable button
            validationStatus.classList.add('hidden');
            importBtn.disabled = true;
            importBtn.textContent = 'Import from Text';
            return;
        }

        try {
            const jsonData = JSON.parse(jsonText);

            // Basic OnlyWorlds validation
            if (!jsonData || typeof jsonData !== 'object') {
                throw new Error('JSON must be an object');
            }

            if (!jsonData.World || typeof jsonData.World !== 'object') {
                throw new Error('Missing "World" object');
            }

            const world = jsonData.World;
            if (!world.api_key || !world.name) {
                throw new Error('World must have "api_key" and "name" fields');
            }

            // Valid JSON and structure
            validationStatus.classList.add('hidden'); // Hide success message too
            importBtn.disabled = false;
            importBtn.textContent = 'Import from Text';

        } catch (error) {
            // Invalid JSON or structure - don't show technical error details
            validationStatus.classList.add('hidden'); // Hide validation status for errors
            importBtn.disabled = true;
            importBtn.textContent = 'Invalid JSON';
        }
    }

    private handlePasteImport(): void {
        const textarea = this.modal!.querySelector('#json-paste-area') as HTMLTextAreaElement;
        const jsonText = textarea.value.trim();

        if (!jsonText) {
            this.showStatus('Please paste JSON data first.', 'error');
            return;
        }

        try {
            const jsonData = JSON.parse(jsonText);
            this.setButtonsLoading(true);
            this.importJSON(jsonData).catch(() => {
                this.setButtonsLoading(false); // Only re-enable on error
            });
        } catch (error) {
            console.error('JSON parse error:', error);
            this.showStatus('Invalid JSON format. Please check your data and try again.', 'error');
        }
    }

    private async importFromFile(file: File): Promise<void> {
        this.setButtonsLoading(true);

        try {
            const text = await this.readFileAsText(file);

            // Validate JSON first
            let jsonData;
            try {
                jsonData = JSON.parse(text);
            } catch (parseError) {
                throw new Error('File contains invalid JSON format');
            }

            await this.importJSON(jsonData);
        } catch (error) {
            console.error('File import error:', error);
            const friendlyMessage = this.getFriendlyErrorMessage(error);
            this.showStatus(friendlyMessage, 'error');
            this.setButtonsLoading(false); // Only re-enable on error
        }
    }

    private readFileAsText(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
                resolve(reader.result as string);
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };

            reader.readAsText(file);
        });
    }

    private async importJSON(jsonData: any): Promise<void> {
        try {
            // Import through mode router
            await modeRouter.importFromJSON(jsonData);

            // Count elements for logging
            const elementCount = this.countElements(jsonData);
            const worldName = jsonData.World?.name || 'Unnamed World';
            console.log(`Imported local world: ${worldName} (${elementCount} elements)`);

            // Hide dialog immediately and trigger app refresh
            this.hide();
            this.triggerAppRefresh();

        } catch (error) {
            console.error('Import error:', error);
            const friendlyMessage = this.getFriendlyErrorMessage(error);
            this.showStatus(friendlyMessage, 'error');
        }
    }

    private showStatus(message: string, type: 'info' | 'success' | 'error'): void {
        const statusEl = this.modal!.querySelector('#import-status') as HTMLElement;

        statusEl.textContent = message;
        statusEl.className = `import-status ${type}`;
        statusEl.classList.remove('hidden');

        // Auto-hide info messages
        if (type === 'info') {
            setTimeout(() => {
                if (statusEl.textContent === message) {
                    statusEl.classList.add('hidden');
                }
            }, 3000);
        }
    }

    private setButtonsLoading(loading: boolean): void {
        const importBtn = this.modal!.querySelector('#paste-import-btn') as HTMLButtonElement;
        const clearBtn = this.modal!.querySelector('#paste-clear-btn') as HTMLButtonElement;
        const cancelBtn = this.modal!.querySelector('#import-cancel-btn') as HTMLButtonElement;
        const fileInput = this.modal!.querySelector('#json-file-input') as HTMLInputElement;
        const fileBrowseBtn = this.modal!.querySelector('#file-browse-btn') as HTMLButtonElement;
        const closeBtn = this.modal!.querySelector('.modal-close') as HTMLButtonElement;

        if (loading) {
            // Hide buttons instead of showing loading state to avoid green flash
            if (importBtn) importBtn.style.display = 'none';
            if (fileBrowseBtn) fileBrowseBtn.style.display = 'none';
            if (clearBtn) clearBtn.disabled = true;
            if (cancelBtn) {
                cancelBtn.disabled = true;
                cancelBtn.textContent = 'Please wait...';
            }
            if (closeBtn) closeBtn.disabled = true;
            if (fileInput) fileInput.disabled = true;
        } else {
            // Re-show and re-enable all interactive elements
            if (importBtn) importBtn.style.display = '';
            if (fileBrowseBtn) fileBrowseBtn.style.display = '';
            if (clearBtn) clearBtn.disabled = false;
            if (cancelBtn) {
                cancelBtn.disabled = false;
                cancelBtn.textContent = 'Cancel';
            }
            if (closeBtn) closeBtn.disabled = false;
            if (fileInput) fileInput.disabled = false;

            // Re-validate paste area to restore correct button state
            this.validatePasteAreaJSON();
        }
    }

    private getFriendlyErrorMessage(error: any): string {
        if (!error) return 'Unknown error occurred';

        const message = error instanceof Error ? error.message : String(error);

        // Convert technical errors to user-friendly messages
        if (message.includes('JSON.parse')) {
            return 'Invalid JSON format. Please check for syntax errors like missing quotes or commas.';
        }

        if (message.includes('missing "World" object')) {
            return 'This doesn\'t appear to be OnlyWorlds data. Make sure your JSON has a "World" section.';
        }

        if (message.includes('api_key') || message.includes('name')) {
            return 'Invalid OnlyWorlds format. The World section must have "api_key" and "name" fields.';
        }

        if (message.includes('must be an object')) {
            return 'JSON data must be an object (enclosed in { } brackets).';
        }

        // Return the original message if it's already user-friendly
        return message;
    }

    private countElements(jsonData: any): number {
        let count = 0;
        const elementTypes = ['Character', 'Location', 'Event', 'Object', 'Ability', 'Creature', 'Species', 'Language', 'Law', 'Institution', 'Family', 'Collective', 'Title', 'Trait', 'Phenomenon', 'Construct', 'Narrative', 'Relation', 'Map', 'Pin', 'Marker', 'Zone'];

        for (const type of elementTypes) {
            if (Array.isArray(jsonData[type])) {
                count += jsonData[type].length;
            }
        }

        return count;
    }

    private triggerAppRefresh(): void {
        // Trigger a custom event that the main app can listen to
        window.dispatchEvent(new CustomEvent('localWorldImported'));
    }
}