(function () {
  'use strict';

  const SELECTORS = {
    modal: '#cart-modal',
    backdrop: '#cart-backdrop',
    items: '#cart-items',
    summary: '#cart-summary',
    total: '#cart-total',
    checkout: '[data-cart-checkout]',
    clear: '[data-cart-clear]',
    emptyCta: '[data-cart-continue]'
  };

  const CLASSES = {
    active: 'active',
    openBody: 'cart-open'
  };

  const globalWindow = typeof window !== 'undefined' ? window : {};
  const CLOUDFLARE_ACCOUNT = globalWindow.SBS_CF_ACCOUNT || '7B8CAeDtA5h1f1Dyh_X-hg';
  const CLOUDFLARE_TRANSFORM = 'w=360,h=480,fit=cover,quality=85,format=auto';

  function deriveItemImage(item) {
    if (!item) {
      return '/images/placeholder.webp';
    }

    const directCandidates = [
      item.imageUrl,
      item.image_url,
      item.thumbnail,
      typeof item.image === 'string' ? item.image : item.image?.url
    ];

    const directUrl = directCandidates.find((src) => typeof src === 'string' && src.trim().length);
    if (directUrl) {
      return directUrl;
    }

    const cdnId = [item.image_id, item.imageId, item.image?.id]
      .find((id) => typeof id === 'string' && id.trim().length);

    if (cdnId) {
      return `https://imagedelivery.net/${CLOUDFLARE_ACCOUNT}/${cdnId}/${CLOUDFLARE_TRANSFORM}`;
    }

    return '/images/placeholder.webp';
  }

  function deriveItemPrice(item) {
    if (!item) return null;

    const parseValue = (value) => {
      if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
      }
      if (typeof value === 'string') {
        const cleaned = value.replace(/[^0-9,.-]/g, '');
        if (!cleaned) return null;
        const normalized = cleaned.includes(',') && !cleaned.includes('.')
          ? cleaned.replace(',', '.')
          : cleaned.replace(/,/g, '');
        if (!normalized) return null;
        const parsed = Number.parseFloat(normalized);
        return Number.isNaN(parsed) ? null : parsed;
      }
      return null;
    };

    const directCandidates = [
      item.price,
      item.amount,
      item.priceValue,
      item.price_amount,
      item?.pricing?.price,
      item?.pricing?.amount
    ];

    for (const candidate of directCandidates) {
      const value = parseValue(candidate);
      if (value !== null && value >= 0) {
        return value;
      }
    }

    const cents = typeof item.price_cents === 'number'
      ? item.price_cents
      : Number.parseInt(item.price_cents, 10);
    if (Number.isFinite(cents) && cents >= 0) {
      return cents / 100;
    }

    return null;
  }

  const CartUI = {
    initialised: false,
    els: {},
    wasCreated: false,
    previouslyFocused: null,

    init() {
      if (this.initialised) return;
      if (!window.SBSCart) {
        console.warn('SBSCart not available – cart UI skipped');
        return;
      }

      this.ensureStructure();
      this.cacheElements();
      this.attachListeners();
      this.render();

      window.addEventListener('cart-updated', () => this.render());
      window.addEventListener('cart-item-added', (event) => this.handleItemAdded(event.detail));
      window.addEventListener('cart-item-removed', () => this.pulseCount());
      window.addEventListener('cart-cleared', () => this.render());

      this.initialised = true;
      window.SBSCartUI = this;
      window.toggleCart = (forceState) => {
        if (typeof forceState === 'boolean') {
          forceState ? this.open() : this.close();
        } else {
          this.toggle();
        }
      };
    },

    ensureStructure() {
      if (!document.querySelector(SELECTORS.modal)) {
        const modal = document.createElement('div');
        modal.id = 'cart-modal';
        modal.className = 'cart-drawer';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-label', 'Shopping basket');
        modal.setAttribute('aria-hidden', 'true');
        modal.innerHTML = `
          <div class="cart-drawer__panel" tabindex="-1">
            <header class="cart-drawer__header">
              <div>
                <span class="cart-drawer__title">Your Basket</span>
                <span class="cart-drawer__subtitle" id="cart-summary">0 items</span>
              </div>
              <button class="cart-drawer__close" type="button" data-cart-close aria-label="Close basket">&times;</button>
            </header>
            <div class="cart-drawer__body">
              <div class="cart-items" id="cart-items"></div>
            </div>
            <footer class="cart-drawer__footer">
              <div class="cart-drawer__total">
                <span>Total</span>
                <span id="cart-total">€0.00</span>
              </div>
              <button class="cart-drawer__checkout" type="button" data-cart-checkout>Checkout</button>
              <button class="cart-drawer__clear" type="button" data-cart-clear>Clear basket</button>
            </footer>
          </div>`;
        document.body.appendChild(modal);
        this.wasCreated = true;
      }

      if (!document.querySelector(SELECTORS.backdrop)) {
        const backdrop = document.createElement('div');
        backdrop.id = 'cart-backdrop';
        backdrop.className = 'cart-backdrop';
        document.body.appendChild(backdrop);
      }
    },

    cacheElements() {
      this.els.modal = document.querySelector(SELECTORS.modal);
      this.els.panel = this.els.modal?.querySelector('.cart-drawer__panel');
      this.els.backdrop = document.querySelector(SELECTORS.backdrop);
      this.els.items = document.querySelector(SELECTORS.items);
      this.els.summary = document.querySelector(SELECTORS.summary);
      this.els.total = document.querySelector(SELECTORS.total);
      this.els.checkout = document.querySelector(SELECTORS.checkout);
      this.els.clear = document.querySelector(SELECTORS.clear);
    },

    attachListeners() {
      if (!this.els.modal) return;

      document.addEventListener('click', (event) => {
        const toggleBtn = event.target.closest('.cart-toggle');
        if (toggleBtn) {
          event.preventDefault();
          this.toggle();
          return;
        }

        if (event.target.matches('[data-cart-close]')) {
          event.preventDefault();
          this.close();
          return;
        }

        if (event.target === this.els.backdrop) {
          this.close();
          return;
        }

        const removeBtn = event.target.closest('[data-cart-remove]');
        if (removeBtn) {
          event.preventDefault();
          const index = Number(removeBtn.getAttribute('data-cart-remove'));
          if (!Number.isNaN(index)) {
            window.SBSCart.removeItem(index);
          }
          return;
        }

        if (event.target.matches('[data-cart-continue]')) {
          event.preventDefault();
          this.close();
          return;
        }

        if (event.target.matches(SELECTORS.checkout)) {
          event.preventDefault();
          this.checkout();
          return;
        }

        if (event.target.matches(SELECTORS.clear)) {
          event.preventDefault();
          window.SBSCart.clear();
          this.notify('Basket cleared');
          this.close();
        }
      });

      document.addEventListener('keydown', (event) => {
        if (!this.isOpen()) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          this.close();
        }
        if (event.key === 'Tab') {
          this.handleFocusTrap(event);
        }
      });
    },

    isOpen() {
      return this.els.modal?.classList.contains(CLASSES.active) || false;
    },

    open() {
      if (!this.els.modal || !this.els.backdrop) return;
      this.render();
      this.previouslyFocused = document.activeElement;
      this.els.modal.classList.add(CLASSES.active);
      this.els.backdrop.classList.add(CLASSES.active);
      this.els.modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add(CLASSES.openBody);
      this.focusFirstElement();
      this.pulseCount();
    },

    close() {
      if (!this.els.modal || !this.els.backdrop) return;
      this.els.modal.classList.remove(CLASSES.active);
      this.els.backdrop.classList.remove(CLASSES.active);
      this.els.modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove(CLASSES.openBody);

      if (this.previouslyFocused && typeof this.previouslyFocused.focus === 'function') {
        this.previouslyFocused.focus();
      }
    },

    toggle() {
      this.isOpen() ? this.close() : this.open();
    },

    render() {
      if (!this.els.items) return;
      const items = window.SBSCart.getItems();

      if (!items.length) {
        this.els.items.innerHTML = `
          <div class="cart-empty">
            <div class="cart-empty__icon">🛒</div>
            <p>Your basket is empty — add some fire fits and make it yours.</p>
            <button class="cart-empty__cta" type="button" data-cart-continue>Start browsing</button>
          </div>`;
        this.updateSummary(0, { total: 0, hasPricedItems: false });
        if (this.els.total) {
          this.els.total.textContent = '€0.00';
          this.els.total.classList.remove('cart-total--pending');
        }
        if (this.els.checkout) {
          this.els.checkout.disabled = true;
          this.els.checkout.setAttribute('aria-disabled', 'true');
        }
        if (this.els.clear) this.els.clear.disabled = true;
        return;
      }

      const totals = this.calculateTotals(items);

      const itemMarkup = items.map((item, index) => {
        const price = deriveItemPrice(item);
        const formattedPrice = price !== null ? `€${price.toFixed(2)}` : 'Pay at collection';
        const subtitleParts = [];
        if (item.size) subtitleParts.push(`Size ${item.size}`);
        if (item.brand) subtitleParts.push(item.brand);
        return `
          <article class="cart-item">
            <img class="cart-item__image" src="${deriveItemImage(item)}" alt="${(item.name || item.category || 'Basket item').replace(/"/g, '&quot;')}">
            <div class="cart-item__info">
              <h4>${item.name || item.category || 'Basket item'}</h4>
              <p>${subtitleParts.join(' · ')}</p>
            </div>
            <div class="cart-item__meta">
              <span class="cart-item__price">${formattedPrice}</span>
              <button class="cart-item__remove" type="button" data-cart-remove="${index}">Remove</button>
            </div>
          </article>`;
      }).join('');

      this.els.items.innerHTML = itemMarkup;

      if (!totals.hasPricedItems) {
        this.els.items.insertAdjacentHTML('afterbegin', `
          <div class="cart-notice" role="status">
            <strong>Heads up:</strong> Prices will be confirmed at collection. Checkout will unlock once totals are available.
          </div>
        `);
      }

      this.updateSummary(items.length, totals);
      if (this.els.total) {
        this.els.total.textContent = totals.totalFormatted;
        this.els.total.classList.toggle('cart-total--pending', !totals.hasPricedItems);
      }
      if (this.els.checkout) {
        const disabled = !totals.hasPricedItems;
        this.els.checkout.disabled = disabled;
        if (disabled) {
          this.els.checkout.setAttribute('aria-disabled', 'true');
        } else {
          this.els.checkout.removeAttribute('aria-disabled');
        }
      }
      if (this.els.clear) this.els.clear.disabled = false;
    },

    calculateTotals(items) {
      let total = 0;
      let pricedItems = 0;

      items.forEach((item) => {
        const value = deriveItemPrice(item);
        if (Number.isFinite(value)) {
          total += value;
          pricedItems += 1;
        }
      });

      const hasPricedItems = pricedItems > 0;

      return {
        total,
        hasPricedItems,
        totalFormatted: hasPricedItems ? `€${total.toFixed(2)}` : 'Pay at collection'
      };
    },

    updateSummary(count, totals) {
      if (!this.els.summary) return;
      if (count === 0) {
        this.els.summary.textContent = '0 items';
        return;
      }
      const label = count === 1 ? 'item' : 'items';
      const totalLabel = totals.hasPricedItems ? ` · €${totals.total.toFixed(2)}` : ' · Pay at collection';
      this.els.summary.textContent = `${count} ${label}${totalLabel}`;
    },

    checkout() {
      const items = window.SBSCart.getItems();
      if (!items.length) {
        this.notify('Your basket is empty');
        return;
      }
      window.location.href = '/checkout.html';
    },

    handleItemAdded(detail) {
      this.pulseCount();
      this.open();
      if (detail?.item) {
        this.notify('Added to basket!');
      }
    },

    focusFirstElement() {
      if (!this.els.modal) return;
      const focusable = this.getFocusableElements();
      if (focusable.length) {
        focusable[0].focus();
      }
    },

    handleFocusTrap(event) {
      const focusable = this.getFocusableElements();
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },

    getFocusableElements() {
      if (!this.els.modal) return [];
      return Array.from(this.els.modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
        .filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
    },

    pulseCount() {
      const counters = document.querySelectorAll('#cart-count, #basket-count, #nav-cart-count, #mobile-cart-count');
      counters.forEach(counter => {
        counter.classList.remove('cart-count--pulse');
        // force reflow
        void counter.offsetWidth;
        counter.classList.add('cart-count--pulse');
      });
    },

    notify(message) {
      let container = document.getElementById('cart-toast');
      if (!container) {
        container = document.createElement('div');
        container.id = 'cart-toast';
        document.body.appendChild(container);
      }

      const toast = document.createElement('div');
      toast.className = 'cart-toast__item';
      toast.textContent = message;
      container.appendChild(toast);

      requestAnimationFrame(() => toast.classList.add('show'));

      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 250);
      }, 2500);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CartUI.init());
  } else {
    CartUI.init();
  }
})();
