/**
 * 🚨 SBS ERROR LOGGING SYSTEM
 * Comprehensive error tracking and debugging
 */

class SBSErrorLogger {
    constructor() {
        this.errors = [];
        this.maxErrors = 100;
        this.sessionId = this.generateSessionId();
        this.init();
    }

    init() {
        // Catch all JavaScript errors
        window.addEventListener('error', (event) => {
            this.logError('JAVASCRIPT_ERROR', {
                message: event.message,
                filename: event.filename,
                line: event.lineno,
                column: event.colno,
                stack: event.error?.stack
            });
        });

        // Catch unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.logError('PROMISE_REJECTION', {
                message: event.reason?.message || event.reason,
                stack: event.reason?.stack
            });
        });

        // Catch network errors - DISABLED TO FIX FETCH ISSUES
        // this.interceptFetch();
        // this.interceptXHR();

        // Add visual error indicator
        this.createErrorIndicator();

        console.log('🚨 SBS Error Logger initialized - Session:', this.sessionId);
    }

    generateSessionId() {
        return 'SBS_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    logError(type, details, severity = 'ERROR') {
        const error = {
            id: this.errors.length + 1,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            type,
            severity,
            details,
            url: window.location.href,
            userAgent: navigator.userAgent,
            viewport: `${window.innerWidth}x${window.innerHeight}`
        };

        this.errors.push(error);
        
        // Keep only recent errors
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }

        // Console output with styling
        const style = severity === 'ERROR' ? 'color: red; font-weight: bold;' : 
                     severity === 'WARN' ? 'color: orange;' : 'color: blue;';
        
        console.log(`%c🚨 SBS ${severity} #${error.id}`, style);
        console.log(`Type: ${type}`);
        console.log(`Details:`, details);
        console.log(`Time: ${error.timestamp}`);
        console.log('---');

        // Update error indicator
        this.updateErrorIndicator();

        // Store in localStorage for persistence
        try {
            localStorage.setItem('sbs_errors', JSON.stringify(this.errors.slice(-20)));
        } catch (e) {
            console.warn('Could not save errors to localStorage');
        }

        return error.id;
    }

    interceptFetch() {
        const originalFetch = window.fetch;
        const logger = this; // Store reference to avoid 'this' context issues
        window.fetch = async (...args) => {
            const startTime = performance.now();
            try {
                const response = await originalFetch.apply(window, args);
                const endTime = performance.now();
                
                if (!response.ok) {
                    logger.logError('FETCH_ERROR', {
                        url: args[0],
                        status: response.status,
                        statusText: response.statusText,
                        duration: Math.round(endTime - startTime) + 'ms'
                    });
                } else {
                    logger.logError('FETCH_SUCCESS', {
                        url: args[0],
                        status: response.status,
                        duration: Math.round(endTime - startTime) + 'ms'
                    }, 'INFO');
                }
                
                return response;
            } catch (error) {
                const endTime = performance.now();
                logger.logError('FETCH_NETWORK_ERROR', {
                    url: args[0],
                    message: error.message,
                    duration: Math.round(endTime - startTime) + 'ms'
                });
                throw error;
            }
        };
    }

    interceptXHR() {
        const originalXHR = window.XMLHttpRequest;
        window.XMLHttpRequest = function() {
            const xhr = new originalXHR();
            const originalSend = xhr.send;
            
            xhr.send = function(...args) {
                const startTime = performance.now();
                
                xhr.addEventListener('loadend', () => {
                    const endTime = performance.now();
                    const duration = Math.round(endTime - startTime) + 'ms';
                    
                    if (xhr.status >= 400) {
                        window.sbsLogger.logError('XHR_ERROR', {
                            url: xhr.responseURL || 'unknown',
                            status: xhr.status,
                            statusText: xhr.statusText,
                            duration
                        });
                    } else if (xhr.status > 0) {
                        window.sbsLogger.logError('XHR_SUCCESS', {
                            url: xhr.responseURL || 'unknown',
                            status: xhr.status,
                            duration
                        }, 'INFO');
                    }
                });
                
                return originalSend.apply(this, args);
            };
            
            return xhr;
        };
    }

    createErrorIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'sbs-error-indicator';
        indicator.innerHTML = '🚨';
        indicator.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 99999;
            background: #ff4444;
            color: white;
            padding: 8px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            display: none;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        `;
        
        indicator.addEventListener('click', () => this.showErrorPanel());
        document.body.appendChild(indicator);
    }

    updateErrorIndicator() {
        const indicator = document.getElementById('sbs-error-indicator');
        if (!indicator) return;

        const errorCount = this.errors.filter(e => e.severity === 'ERROR').length;
        
        if (errorCount > 0) {
            indicator.style.display = 'block';
            indicator.textContent = `🚨 ${errorCount}`;
            indicator.title = `${errorCount} errors detected - Click to view`;
        }
    }

    showErrorPanel() {
        // Remove existing panel
        const existing = document.getElementById('sbs-error-panel');
        if (existing) existing.remove();

        const panel = document.createElement('div');
        panel.id = 'sbs-error-panel';
        panel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 100000;
            background: white;
            border: 2px solid #ff4444;
            border-radius: 10px;
            padding: 20px;
            max-width: 80vw;
            max-height: 80vh;
            overflow: auto;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        `;

        const recentErrors = this.errors.slice(-10);
        
        panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; color: #ff4444;">🚨 SBS Error Log</h3>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: #ff4444; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">×</button>
            </div>
            <div style="margin-bottom: 15px;">
                <strong>Session:</strong> ${this.sessionId}<br>
                <strong>Total Errors:</strong> ${this.errors.length}<br>
                <strong>URL:</strong> ${window.location.href}
            </div>
            <div style="background: #f5f5f5; padding: 10px; border-radius: 5px; max-height: 300px; overflow: auto;">
                ${recentErrors.map(error => `
                    <div style="margin-bottom: 10px; padding: 8px; background: white; border-radius: 3px; border-left: 3px solid ${error.severity === 'ERROR' ? '#ff4444' : '#44ff44'};">
                        <strong>${error.type}</strong> (#${error.id})<br>
                        <small>${error.timestamp}</small><br>
                        <pre style="margin: 5px 0; font-size: 11px; overflow: auto;">${JSON.stringify(error.details, null, 2)}</pre>
                    </div>
                `).join('')}
            </div>
            <div style="margin-top: 15px; text-align: center;">
                <button onclick="window.sbsLogger.exportErrors()" 
                        style="background: #4444ff; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; margin: 0 5px;">
                    📋 Copy All Errors
                </button>
                <button onclick="window.sbsLogger.clearErrors()" 
                        style="background: #44ff44; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; margin: 0 5px;">
                    🗑️ Clear Errors
                </button>
            </div>
        `;

        document.body.appendChild(panel);
    }

    exportErrors() {
        const errorReport = {
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            errors: this.errors
        };

        const text = JSON.stringify(errorReport, null, 2);
        
        // Copy to clipboard
        navigator.clipboard.writeText(text).then(() => {
            alert('✅ Error report copied to clipboard!');
        }).catch(() => {
            // Fallback - show in new window
            const win = window.open('', '_blank');
            win.document.write(`<pre>${text}</pre>`);
        });
    }

    clearErrors() {
        this.errors = [];
        localStorage.removeItem('sbs_errors');
        document.getElementById('sbs-error-indicator').style.display = 'none';
        document.getElementById('sbs-error-panel')?.remove();
        console.log('🗑️ SBS Error log cleared');
    }

    // Manual error logging
    log(message, details = {}, severity = 'INFO') {
        return this.logError('MANUAL_LOG', { message, ...details }, severity);
    }

    // Check for common issues
    runDiagnostics() {
        console.log('🔍 Running SBS Diagnostics...');
        
        // Check if jQuery is loaded
        if (typeof jQuery === 'undefined') {
            this.logError('MISSING_DEPENDENCY', { library: 'jQuery' }, 'WARN');
        }
        
        // Check for missing elements
        const criticalElements = ['#nav', '.menu', '#content'];
        criticalElements.forEach(selector => {
            if (!document.querySelector(selector)) {
                this.logError('MISSING_ELEMENT', { selector }, 'WARN');
            }
        });
        
        // Check localStorage
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
        } catch (e) {
            this.logError('STORAGE_ERROR', { message: 'localStorage not available' }, 'WARN');
        }
        
        console.log('🔍 Diagnostics complete - Check error panel for issues');
    }
}

// Initialize global error logger
window.sbsLogger = new SBSErrorLogger();

// Add keyboard shortcut to show errors (Ctrl+Shift+E)
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        window.sbsLogger.showErrorPanel();
    }
});

// Run initial diagnostics
setTimeout(() => {
    window.sbsLogger.runDiagnostics();
}, 1000);