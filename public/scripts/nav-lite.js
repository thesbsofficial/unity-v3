(function () {
  const prefersReducedMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };

  function formatCartCount(count) {
    return count > 9 ? '9+' : String(count);
  }

  function triggerCountBump(element) {
    if (!element || prefersReducedMotion.matches) return;
    element.classList.remove('count-bump');
    void element.offsetWidth;
    element.classList.add('count-bump');
  }

  function parseCart() {
    try {
      return JSON.parse(localStorage.getItem('cart')) || [];
    } catch (error) {
      return [];
    }
  }

  function updateCartCount() {
    const cartItems = parseCart();
    const totalItems = cartItems.reduce(
      (sum, item) => sum + (item.quantity || 0),
      0
    );
    const formatted = formatCartCount(totalItems);

    const navCount = document.getElementById('nav-cart-count');
    if (navCount && navCount.textContent !== formatted) {
      navCount.textContent = formatted;
      triggerCountBump(navCount);
    }

    const mobileCount = document.getElementById('mobile-cart-count');
    if (mobileCount && mobileCount.textContent !== formatted) {
      mobileCount.textContent = formatted;
      triggerCountBump(mobileCount);
    }
  }

  function toggleMobileMenu(forceState) {
    const navLinks = document.getElementById('nav-links');
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const overlay = document.getElementById('mobile-menu-overlay');

    if (!navLinks || !menuToggle) return;

    const shouldOpen =
      typeof forceState === 'boolean'
        ? forceState
        : !navLinks.classList.contains('active');

    navLinks.classList.toggle('active', shouldOpen);
    menuToggle.classList.toggle('active', shouldOpen);
    if (overlay) {
      overlay.classList.toggle('active', shouldOpen);
    }
    document.body.classList.toggle('menu-open', shouldOpen);
    menuToggle.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
  }

  function closeMobileMenu() {
    toggleMobileMenu(false);
  }

  function openCartFromNav() {
    closeMobileMenu();
    window.location.href = '/#basket';
  }

  function setupMobileNavLinks() {
    const navLinks = document.getElementById('nav-links');
    if (!navLinks) return;

    const interactiveElements = navLinks.querySelectorAll('a, button');
    interactiveElements.forEach((element) => {
      element.addEventListener('click', () => {
        if (element.classList.contains('mobile-basket')) {
          return;
        }
        closeMobileMenu();
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeMobileMenu();
      }
    });
  }

  function initNavCtaPulse() {
    const cta = document.getElementById('nav-cta');
    if (!cta || prefersReducedMotion.matches) return;

    requestAnimationFrame(() => {
      cta.classList.add('nav-cta--pulse');
      cta.addEventListener(
        'animationend',
        () => cta.classList.remove('nav-cta--pulse'),
        { once: true }
      );
    });
  }

  function setupHeaderScroll() {
    const header = document.getElementById('site-header');
    if (!header) return;

    const updateHeaderState = () => {
      const shouldShrink = window.scrollY > 10;
      header.classList.toggle('header--shrink', shouldShrink);
    };

    updateHeaderState();

    let ticking = false;
    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            updateHeaderState();
            ticking = false;
          });
          ticking = true;
        }
      },
      { passive: true }
    );
  }

  function checkAuthStatus() {
    const token = localStorage.getItem('sbs_auth_token');
    const user = localStorage.getItem('sbs_user');
    const authLinks = document.querySelectorAll('[data-auth-link]');

    if (!authLinks.length) return;

    if (token && user) {
      authLinks.forEach((link) => {
        link.href = '/dashboard.html';
        link.title = 'Account';
        link.textContent = 'Account';
      });
    } else {
      authLinks.forEach((link) => {
        link.href = '/login.html';
        link.title = 'Sign In';
        link.textContent = 'Sign In';
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupHeaderScroll();
    setupMobileNavLinks();
    initNavCtaPulse();
    checkAuthStatus();
    updateCartCount();
  });

  window.addEventListener('storage', (event) => {
    if (event.key === 'cart') {
      updateCartCount();
    }
  });

  window.toggleMobileMenu = toggleMobileMenu;
  window.closeMobileMenu = closeMobileMenu;
  window.openCartFromNav = openCartFromNav;
})();
