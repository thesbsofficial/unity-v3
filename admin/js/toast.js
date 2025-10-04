(function () {
    if (typeof window === 'undefined') {
        return;
    }

    const CONTAINER_ID = 'admin-toast-container';

    function ensureContainer() {
        let container = document.getElementById(CONTAINER_ID);
        if (!container) {
            container = document.createElement('div');
            container.id = CONTAINER_ID;
            container.className = 'fixed top-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm';
            document.body.appendChild(container);
        }
        return container;
    }

    function buildToast(message, type, options) {
        const container = ensureContainer();
        const toast = document.createElement('div');
        const {
            duration = 4000,
            dismissible = true,
            icon,
            description
        } = options || {};

        const typeStyles = {
            success: {
                base: 'border-green-500/40 bg-green-500/10 text-green-100',
                icon: icon || '✅'
            },
            error: {
                base: 'border-red-500/40 bg-red-500/10 text-red-100',
                icon: icon || '⚠️'
            },
            info: {
                base: 'border-blue-500/40 bg-blue-500/10 text-blue-100',
                icon: icon || 'ℹ️'
            },
            warning: {
                base: 'border-amber-500/40 bg-amber-500/10 text-amber-100',
                icon: icon || '⚠️'
            }
        };

        const selected = typeStyles[type] || typeStyles.info;

        toast.className = `pointer-events-auto rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm ${selected.base}`;
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');

        toast.innerHTML = `
            <div class="flex items-start gap-3">
                <div class="text-xl leading-none">${selected.icon}</div>
                <div class="flex-1">
                    <p class="font-semibold tracking-tight">${message}</p>
                    ${description ? `<p class="mt-1 text-sm/relaxed opacity-80">${description}</p>` : ''}
                </div>
                ${dismissible ? '<button type="button" class="ml-2 text-lg opacity-60 hover:opacity-100">×</button>' : ''}
            </div>
        `;

        if (dismissible) {
            const closeButton = toast.querySelector('button');
            closeButton?.addEventListener('click', () => dismissToast(toast));
        }

        container.appendChild(toast);

        if (duration > 0) {
            setTimeout(() => dismissToast(toast), duration);
        }

        return toast;
    }

    function dismissToast(toast) {
        if (!toast || toast.dataset.dismissed) return;
        toast.dataset.dismissed = 'true';
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        toast.style.transition = 'opacity 150ms ease, transform 150ms ease';
        setTimeout(() => toast.remove(), 180);
    }

    window.adminToast = {
        show(message, options) {
            buildToast(message, options?.type || 'info', options);
        },
        success(message, options) {
            buildToast(message, 'success', options);
        },
        error(message, options) {
            buildToast(message, 'error', options);
        },
        info(message, options) {
            buildToast(message, 'info', options);
        },
        warning(message, options) {
            buildToast(message, 'warning', options);
        },
        dismissAll() {
            const container = document.getElementById(CONTAINER_ID);
            if (!container) return;
            Array.from(container.children).forEach(child => dismissToast(child));
        }
    };

    document.addEventListener('keyup', (event) => {
        if (event.key === 'Escape') {
            window.adminToast.dismissAll();
        }
    });
})();
