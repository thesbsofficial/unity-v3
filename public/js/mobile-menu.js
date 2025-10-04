/**
 * SBS Mobile Menu – robust, accessible, shared implementation
 * - Supports .hamburger, .mobile-menu, .mobile-menu-backdrop
 * - Adds ARIA, focus trap, scroll lock
 * - Exposes window.toggleMobileMenu(forceState)
 */

(function () {
  'use strict';

  const SELECTORS = {
    hamburger: '.hamburger',
    menu: '.mobile-menu',
    backdrop: '.mobile-menu-backdrop'
  };

  let els = { hamburger: null, menu: null, backdrop: null };
  let previouslyFocused = null;
  let isOpen = false;

  function q(sel) { return document.querySelector(sel); }

  function prepareHamburger(button) {
    if (!button) return;
    button.setAttribute('aria-label', 'Menu');
    if (els.menu?.id) {
      button.setAttribute('aria-controls', els.menu.id);
    } else {
      button.removeAttribute('aria-controls');
    }
    button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }

  function ensureElements() {
    if (!els.menu || !document.body.contains(els.menu)) {
      els.menu = q(SELECTORS.menu);
      if (els.menu) safeId(els.menu, 'site-mobile-menu');
    }
    if (!els.backdrop || !document.body.contains(els.backdrop)) {
      els.backdrop = q(SELECTORS.backdrop);
      if (els.backdrop) safeId(els.backdrop, 'site-mobile-menu-backdrop');
    }
    if (!els.hamburger || !document.body.contains(els.hamburger)) {
      els.hamburger = q(SELECTORS.hamburger);
      prepareHamburger(els.hamburger);
    }
  }

  function setAria(open) {
    ensureElements();
    if (els.hamburger) {
      els.hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (!els.hamburger.getAttribute('aria-controls') && els.menu?.id) {
        els.hamburger.setAttribute('aria-controls', els.menu.id);
      }
    }
    if (els.menu) {
      els.menu.setAttribute('role', 'dialog');
      els.menu.setAttribute('aria-modal', 'true');
      els.menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    }
  }

  function lockScroll(lock) {
    document.body.classList.toggle('menu-open', !!lock);
    document.body.style.overflow = lock ? 'hidden' : '';
  }

  function getFocusableInMenu() {
    if (!els.menu) return [];
    return Array.from(els.menu.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ));
  }

  function focusTrapHandler(e) {
    if (!isOpen || e.key !== 'Tab') return;
    const focusables = getFocusableInMenu();
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function onKeydown(e) {
    if (!isOpen) return;
    if (e.key === 'Escape') {
      toggle(false);
    } else {
      focusTrapHandler(e);
    }
  }

  function open() {
    ensureElements();
    if (!els.menu || !els.backdrop) return;
    previouslyFocused = document.activeElement;
    isOpen = true;
    els.menu.classList.add('active');
    els.backdrop.classList.add('active');
    els.hamburger?.classList.add('active');
    setAria(true);
    lockScroll(true);

    // Focus first link/button inside the menu for accessibility
    const focusables = getFocusableInMenu();
    if (focusables.length) focusables[0].focus();
  }

  function close() {
    ensureElements();
    if (!els.menu || !els.backdrop) return;
    isOpen = false;
    els.menu.classList.remove('active');
    els.backdrop.classList.remove('active');
    els.hamburger?.classList.remove('active');
    setAria(false);
    lockScroll(false);
    // Restore focus to the hamburger for keyboard users
    if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
      previouslyFocused.focus();
    } else if (els.hamburger) {
      els.hamburger.focus();
    }
  }

  function toggle(forceState) {
    ensureElements();
    const desired = typeof forceState === 'boolean' ? forceState : !isOpen;
    desired ? open() : close();
  }

  function safeId(el, fallbackId) {
    if (!el) return;
    if (!el.id) el.id = fallbackId;
  }

  function handleHamburgerClick(event) {
    const button = event.target.closest(SELECTORS.hamburger);
    if (!button) return;
    els.hamburger = button;
    toggle();
  }

  function init() {
    els.hamburger = q(SELECTORS.hamburger);
    els.menu = q(SELECTORS.menu);
    els.backdrop = q(SELECTORS.backdrop);

    // If markup isn't present on a page, safely exit
    if (!els.menu || !els.backdrop) {
      // Still export a no-op to avoid errors from legacy onclicks
      window.toggleMobileMenu = () => { };
      return;
    }

    // Ensure IDs for ARIA wiring
    safeId(els.menu, 'site-mobile-menu');
    safeId(els.backdrop, 'site-mobile-menu-backdrop');
    prepareHamburger(els.hamburger);

    // Cleanup any inline onclicks to avoid double toggles
    if (els.hamburger) els.hamburger.onclick = null;
    els.backdrop.onclick = null;

    // Wire events
    els.backdrop.addEventListener('click', () => toggle(false));
    document.addEventListener('click', handleHamburgerClick);

    // Close on link click inside menu
    els.menu.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (link) toggle(false);
    });

    // Global keydown for Escape/Tab focus trap
    document.addEventListener('keydown', onKeydown);

    // Auto-close on resize to desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && isOpen) toggle(false);
    });

    // Expose global toggle for legacy compatibility
    window.toggleMobileMenu = toggle;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
