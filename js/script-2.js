/* ============================================================
   BACKPACKERS BIBLE — script-2.js
   Clean rebuild — all functions organised by section

   CONTENTS:
   1.  Utilities
   2.  Header — scroll hide/show (also hides jump menus)
   3.  Header — mega menu (mouse + full keyboard)
   4.  Header — hamburger & mobile menu
   5.  Header — accordion (mobile menu panels)
   6.  Header — search (desktop + mobile)
   7.  Back to top button
   8.  Smooth scroll for anchor links
   9.  Gallery scrollers
   10. Lightbox
   11. Jump menu — active card centring
   12. Map visibility (online/offline)
   13. Cookie consent banner
   14. Read More / Read Less toggle
   15. Mama Africa popup
   16. Preview box (hover blurbs)
   17. Contact email obfuscation
   ============================================================ */

(function () {
    'use strict';


    /* ============================================================
       1. UTILITIES
       ============================================================ */

    function onReady(fn) {
        if (document.readyState !== 'loading') {
            fn();
        } else {
            document.addEventListener('DOMContentLoaded', fn);
        }
    }

    function el(id) {
        return document.getElementById(id);
    }


    /* ============================================================
       2. HEADER — SCROLL HIDE / SHOW
       Adds .is-hidden to #site-header when scrolling down,
       removes it when scrolling up.
       Also hides/shows the jump menu and quick jump menu
       on mobile in sync with the header.
       ============================================================ */

    (function initScrollHeader() {
        var header    = el('site-header');
        var jumpMenu  = document.querySelector('.jump-menu-section');
        var quickMenu = el('quick-jump-menu');
        var mobileMenu = el('mobile-menu');
        if (!header) return;

        var lastScrollY = 0;
        var ticking     = false;
        var THRESHOLD   = 80;

        window.addEventListener('scroll', function () {
            if (!ticking) {
                window.requestAnimationFrame(function () {
                    var scrollY = window.pageYOffset ||
                                  document.documentElement.scrollTop;

                    if (scrollY > lastScrollY && scrollY > THRESHOLD) {
                        /* Scrolling DOWN — hide header and both menus */
                        header.classList.add('is-hidden');
                        if (jumpMenu)  jumpMenu.classList.add('is-hidden');
                        if (quickMenu) quickMenu.classList.add('is-hidden');
                        /* Close mobile menu if open */
                        if (mobileMenu && mobileMenu.classList.contains('is-open')) {
                            closeMobileMenu();
                        }
                    } else {
                        /* Scrolling UP — show everything */
                        header.classList.remove('is-hidden');
                        if (jumpMenu)  jumpMenu.classList.remove('is-hidden');
                        if (quickMenu) quickMenu.classList.remove('is-hidden');
                    }

                    lastScrollY = scrollY;
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }());


    /* ============================================================
       3. HEADER — MEGA MENU
       Opens on hover (mouse) or Enter/Space/ArrowDown (keyboard).
       Closes on Escape, click outside, or focus leaving the menu.
       ============================================================ */

    (function initMegaMenu() {
        var navItems = document.querySelectorAll('.site-nav__item');
        if (!navItems.length) return;

        navItems.forEach(function (item) {
            var trigger = item.querySelector('.site-nav__mega-trigger');
            var menu    = item.querySelector('.site-nav__mega-menu');
            if (!trigger || !menu) return;

            item.addEventListener('mouseenter', function () {
                trigger.setAttribute('aria-expanded', 'true');
            });
            item.addEventListener('mouseleave', function () {
                trigger.setAttribute('aria-expanded', 'false');
            });

            trigger.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    var isOpen = trigger.getAttribute('aria-expanded') === 'true';
                    closeAllMenus();
                    if (!isOpen) {
                        openMenu(trigger, menu);
                        var firstItem = menu.querySelector('[role="menuitem"]');
                        if (firstItem) firstItem.focus();
                    }
                }
            });

            menu.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') {
                    closeAllMenus();
                    trigger.focus();
                }
            });

            menu.addEventListener('focusout', function (e) {
                if (!menu.contains(e.relatedTarget) &&
                    !trigger.contains(e.relatedTarget)) {
                    closeAllMenus();
                }
            });
        });

        document.addEventListener('click', function (e) {
            if (!e.target.closest('.site-nav__item')) {
                closeAllMenus();
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeAllMenus();
        });

        function openMenu(trigger, menu) {
            trigger.setAttribute('aria-expanded', 'true');
            menu.setAttribute('data-open', 'true');
        }

        function closeAllMenus() {
            navItems.forEach(function (item) {
                var trigger = item.querySelector('.site-nav__mega-trigger');
                var menu    = item.querySelector('.site-nav__mega-menu');
                if (trigger) trigger.setAttribute('aria-expanded', 'false');
                if (menu)    menu.removeAttribute('data-open');
            });
        }
    }());


    /* ============================================================
       4. HEADER — HAMBURGER & MOBILE MENU
       ============================================================ */

    function openMobileMenu() {
        var menu   = el('mobile-menu');
        var toggle = el('nav-toggle');
        if (!menu) return;

        menu.removeAttribute('hidden');
        requestAnimationFrame(function () {
            menu.classList.add('is-open');
        });
        document.body.style.overflow = 'hidden';

        if (toggle) {
            toggle.setAttribute('aria-expanded', 'true');
            toggle.setAttribute('aria-label', 'Close navigation menu');
        }

        var closeBtn = menu.querySelector('.mobile-menu__close');
        if (closeBtn) closeBtn.focus();
    }

    function closeMobileMenu() {
        var menu   = el('mobile-menu');
        var toggle = el('nav-toggle');
        if (!menu) return;

        menu.classList.remove('is-open');
        document.body.style.overflow = '';

        if (toggle) {
            toggle.setAttribute('aria-expanded', 'false');
            toggle.setAttribute('aria-label', 'Open navigation menu');
        }

        setTimeout(function () {
            if (!menu.classList.contains('is-open')) {
                menu.setAttribute('hidden', '');
            }
        }, 360);
    }

    window.openMobileMenu  = openMobileMenu;
    window.closeMobileMenu = closeMobileMenu;

    onReady(function () {
        var toggle   = el('nav-toggle');
        var menu     = el('mobile-menu');
        var closeBtn = menu ? menu.querySelector('.mobile-menu__close') : null;

        if (toggle) {
            toggle.addEventListener('click', function () {
                var isOpen = menu && menu.classList.contains('is-open');
                if (isOpen) {
                    closeMobileMenu();
                } else {
                    openMobileMenu();
                }
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', closeMobileMenu);
        }

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && menu && menu.classList.contains('is-open')) {
                closeMobileMenu();
                if (toggle) toggle.focus();
            }
        });

        if (menu) {
            menu.addEventListener('keydown', function (e) {
                if (e.key !== 'Tab') return;
                var focusable = menu.querySelectorAll(
                    'button, a[href], input, [tabindex]:not([tabindex="-1"])'
                );
                var first = focusable[0];
                var last  = focusable[focusable.length - 1];

                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            });
        }
    });


    /* ============================================================
       5. HEADER — ACCORDION (mobile menu panels)
       ============================================================ */

    onReady(function () {
        document.querySelectorAll('.accordion').forEach(function (btn) {
            btn.removeAttribute('onclick');

            btn.addEventListener('click', function () {
                var panelId = btn.getAttribute('aria-controls');
                var panel   = panelId ? el(panelId) : null;
                var isOpen  = btn.getAttribute('aria-expanded') === 'true';

                document.querySelectorAll('.accordion').forEach(function (other) {
                    if (other === btn) return;
                    other.setAttribute('aria-expanded', 'false');
                    var otherId    = other.getAttribute('aria-controls');
                    var otherPanel = otherId ? el(otherId) : null;
                    if (otherPanel) otherPanel.classList.remove('is-open');
                });

                btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
                if (panel) panel.classList.toggle('is-open', !isOpen);
            });
        });
    });


    /* ============================================================
       6. HEADER — SEARCH
       Fetches /search.json on init. Field names: title, desc, url.
       ============================================================ */

    var SEARCH_DATA = [];

    fetch('/search.json')
        .then(function (r) { return r.json(); })
        .then(function (data) { SEARCH_DATA = data; })
        .catch(function () { SEARCH_DATA = []; });

    function runSearch(query, resultsId) {
        var resultsEl = el(resultsId);
        if (!resultsEl) return;

        query = query.trim().toLowerCase();

        if (!query) {
            resultsEl.innerHTML = '';
            resultsEl.classList.remove('is-open');
            return;
        }

        var matches = SEARCH_DATA.filter(function (item) {
            return (
                item.title.toLowerCase().includes(query) ||
                (item.desc && item.desc.toLowerCase().includes(query))
            );
        }).slice(0, 8);

        if (!matches.length) {
            resultsEl.innerHTML =
                '<p class="site-header__search-no-results">No results found for "' +
                escapeHtml(query) + '"</p>';
        } else {
            resultsEl.innerHTML = matches.map(function (item) {
                return (
                    '<a class="search-result-item" href="' + item.url + '" role="option">' +
                    '<strong>' + highlight(item.title, query) + '</strong>' +
                    (item.desc
                        ? '<span>' + highlight(item.desc, query) + '</span>'
                        : '') +
                    '</a>'
                );
            }).join('');
        }

        resultsEl.classList.add('is-open');
    }

    function highlight(text, query) {
        var re = new RegExp(
            '(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')',
            'gi'
        );
        return escapeHtml(text).replace(
            re,
            '<mark style="background:#fce8ed;color:#bc1d23;border-radius:2px;">$1</mark>'
        );
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    window.runSearch = runSearch;

    onReady(function () {
        var desktopInput   = el('site-search-input');
        var desktopResults = el('site-search-results');

        if (desktopInput && desktopResults) {
            desktopInput.addEventListener('input', function () {
                runSearch(this.value, 'site-search-results');
                desktopInput.setAttribute('aria-expanded',
                    this.value ? 'true' : 'false');
            });

            desktopInput.addEventListener('blur', function () {
                setTimeout(function () {
                    desktopResults.classList.remove('is-open');
                    desktopInput.setAttribute('aria-expanded', 'false');
                }, 200);
            });

            desktopInput.addEventListener('focus', function () {
                if (this.value) {
                    desktopResults.classList.add('is-open');
                    desktopInput.setAttribute('aria-expanded', 'true');
                }
            });
        }

        var mobileInput = el('mobile-menu-search-input');
        if (!mobileInput) return;

        var inMenuResults = el('mobile-menu-search-results');
        if (inMenuResults) inMenuResults.parentNode.removeChild(inMenuResults);

        var portal = document.createElement('div');
        portal.id        = 'mobile-menu-search-results';
        portal.className = 'site-header__search-results';
        portal.setAttribute('role', 'listbox');
        portal.setAttribute('aria-live', 'polite');
        portal.setAttribute('aria-label', 'Search results');
        portal.style.cssText = [
            'position:fixed',
            'z-index:999999',
            'width:90vw',
            'max-width:320px'
        ].join(';');
        document.body.appendChild(portal);

        function positionPortal() {
            var rect        = mobileInput.getBoundingClientRect();
            var portalWidth = Math.min(320, window.innerWidth * 0.9);
            var left        = rect.left + (rect.width / 2) - (portalWidth / 2);
            left = Math.max(8, Math.min(left, window.innerWidth - portalWidth - 8));
            portal.style.left  = left + 'px';
            portal.style.top   = (rect.bottom + 6) + 'px';
            portal.style.width = portalWidth + 'px';
        }

        mobileInput.addEventListener('input', function () {
            positionPortal();
            runSearch(this.value, 'mobile-menu-search-results');
        });

        mobileInput.addEventListener('blur', function () {
            setTimeout(function () {
                portal.classList.remove('is-open');
            }, 300);
        });

        mobileInput.addEventListener('focus', function () {
            if (this.value) {
                positionPortal();
                portal.classList.add('is-open');
            }
        });
    });


    /* ============================================================
       7. BACK TO TOP BUTTON
       ============================================================ */

    onReady(function () {
        var bttButton = el('backToTop');
        if (!bttButton) return;

        bttButton.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        window.addEventListener('scroll', function () {
            var scrollY = window.pageYOffset || document.documentElement.scrollTop;
            bttButton.classList.toggle('is-visible', scrollY > 400);
        }, { passive: true });
    });


    /* ============================================================
       8. SMOOTH SCROLL FOR ANCHOR LINKS
       ============================================================ */

    onReady(function () {
        document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
            anchor.addEventListener('click', function (e) {
                var targetId = this.getAttribute('href');
                if (!targetId || targetId === '#') return;

                var target = document.querySelector(targetId);
                if (!target) return;

                e.preventDefault();

                var header       = el('site-header');
                var headerHeight = header ? header.offsetHeight : 0;
                var targetTop    = target.getBoundingClientRect().top +
                                   window.pageYOffset - headerHeight - 16;

                window.scrollTo({ top: targetTop, behavior: 'smooth' });
            });
        });
    });


    /* ============================================================
       9. GALLERY SCROLLERS
       ============================================================ */

    function scrollGallery(id, direction) {
        var container = el(id);
        if (!container) return;
        var card = container.querySelector('.jump-card');
        if (card) {
            var amount = card.offsetWidth + 20;
            container.scrollBy({
                left: direction === 'left' ? -amount : amount,
                behavior: 'smooth'
            });
        }
    }

    function scrollAny(elementId, direction) {
        var container = el(elementId);
        if (!container) return;
        container.scrollBy({
            left: direction === 'left' ? -330 : 330,
            behavior: 'smooth'
        });
    }

    function scrollHostels(button, direction) {
        var container = button.parentElement.querySelector('.hostel-jump-container');
        if (!container) return;
        container.scrollBy({ left: direction * 250, behavior: 'smooth' });
    }

    window.scrollGallery = scrollGallery;
    window.scrollAny     = scrollAny;
    window.scrollHostels = scrollHostels;


    /* ============================================================
       10. LIGHTBOX
       ============================================================ */

    function openLightbox(imageSrc) {
        var lightbox = el('gallery-lightbox');
        var fullImg  = el('full-img');
        if (!lightbox || !fullImg) return;
        fullImg.src = imageSrc;
        lightbox.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        lightbox.setAttribute('tabindex', '-1');
        lightbox.focus();
    }

    function closeLightbox() {
        var lightbox = el('gallery-lightbox');
        if (!lightbox) return;
        lightbox.style.display = 'none';
        document.body.style.overflow = '';
    }

    onReady(function () {
        var lightbox = el('gallery-lightbox');
        if (lightbox) {
            lightbox.addEventListener('click', function (e) {
                if (e.target === lightbox) closeLightbox();
            });
            lightbox.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') closeLightbox();
            });
        }
    });

    window.openLightbox  = openLightbox;
    window.closeLightbox = closeLightbox;


    /* ============================================================
       11. JUMP MENU — ACTIVE CARD CENTRING
       ============================================================ */

    onReady(function () {
        var container = el('top-jump');
        if (!container) return;

        var cards = Array.from(container.querySelectorAll('a.jump-card'));
        if (!cards.length) return;

        function centerActiveCard(link) {
            cards.forEach(function (c) { c.classList.remove('jump-card--active'); });
            link.classList.add('jump-card--active');

            var linkOffset     = link.offsetLeft;
            var linkWidth      = link.offsetWidth;
            var containerWidth = container.offsetWidth;
            var scrollPos      = linkOffset - (containerWidth / 2) + (linkWidth / 2);

            container.scrollTo({ left: scrollPos, behavior: 'smooth' });
        }

        function checkUrlAndCenter() {
            var filename = window.location.pathname.split('/').pop() || 'index.html';
            var activeLink = cards.find(function (link) {
                return link.getAttribute('href').endsWith(filename);
            });
            if (activeLink) {
                centerActiveCard(activeLink);
            } else {
                container.scrollLeft = 0;
            }
        }

        checkUrlAndCenter();

        var targets = cards.map(function (link) {
            var hash = link.href.indexOf('#');
            if (hash !== -1) {
                return el(link.href.substring(hash + 1));
            }
            return null;
        }).filter(Boolean);

        if (targets.length) {
            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        var activeLink = cards.find(function (l) {
                            return l.href.includes('#' + entry.target.id);
                        });
                        if (activeLink && !activeLink.classList.contains('jump-card--active')) {
                            centerActiveCard(activeLink);
                        }
                    }
                });
            }, { rootMargin: '-25% 0px -70% 0px', threshold: 0 });

            targets.forEach(function (t) { observer.observe(t); });
        }
    });


    /* ============================================================
       12. MAP VISIBILITY (ONLINE / OFFLINE)
       ============================================================ */

    function checkMapVisibility() {
        var map      = el('region-map');
        var fallback = el('map-fallback');
        if (!map || !fallback) return;
        var online = navigator.onLine;
        map.style.display      = online ? 'block' : 'none';
        fallback.style.display = online ? 'none'  : 'block';
    }

    window.addEventListener('offline', checkMapVisibility);
    window.addEventListener('online',  checkMapVisibility);
    checkMapVisibility();


    /* ============================================================
       13. COOKIE CONSENT BANNER
       ============================================================ */

    onReady(function () {
        var banner     = el('cookie-banner');
        var acceptBtn  = el('accept-cookies');
        var declineBtn = el('decline-cookies');
        if (!banner || !acceptBtn || !declineBtn) return;

        function loadTrackingScripts() {
            console.log('Tracking consent given — loading scripts.');
        }

        var consent = localStorage.getItem('cookieConsent');

        if (!consent) {
            banner.style.display = 'block';
        } else if (consent === 'accepted') {
            loadTrackingScripts();
        }

        acceptBtn.addEventListener('click', function () {
            localStorage.setItem('cookieConsent', 'accepted');
            banner.style.display = 'none';
            loadTrackingScripts();
        });

        declineBtn.addEventListener('click', function () {
            localStorage.setItem('cookieConsent', 'declined');
            banner.style.display = 'none';
        });
    });


    /* ============================================================
       14. READ MORE / READ LESS TOGGLE
       ============================================================ */

    onReady(function () {
        document.querySelectorAll('details').forEach(function (details) {
            var summary = details.querySelector('summary');
            if (!summary) return;
            details.addEventListener('toggle', function () {
                summary.textContent = details.open ? 'Read Less' : 'Read More';
            });
        });
    });


    /* ============================================================
       15. MAMA AFRICA POPUP
       z-index set to --z-popup (500) in CSS — below header (9999)
       ============================================================ */

    onReady(function () {
        var popup         = el('mama-africa-guide');
        var targetSection = el('mama-afrika');
        if (!popup || !targetSection) return;

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    popup.classList.add('active');
                }
            });
        }, { threshold: 0.5 });

        observer.observe(targetSection);
    });


    /* ============================================================
       16. PREVIEW BOX (hover blurbs on region links)
       ============================================================ */

    onReady(function () {
        var previewLinks = document.querySelectorAll('.preview-link');
        if (!previewLinks.length) return;

        var box = document.createElement('div');
        box.id = 'preview-box';
        document.body.appendChild(box);

        previewLinks.forEach(function (link) {
            link.addEventListener('mouseenter', function () {
                var blurb = link.getAttribute('data-blurb');
                var name  = link.getAttribute('data-name');
                var url   = link.getAttribute('href');

                box.innerHTML =
                    '<h4>' + escapeHtml(name) + '</h4>' +
                    '<p>'  + escapeHtml(blurb) + '</p>' +
                    '<a href="' + url + '" class="btn">Read More →</a>';
                box.style.display = 'block';
            });

            link.addEventListener('mousemove', function (e) {
                box.style.left = (e.pageX + 15) + 'px';
                box.style.top  = (e.pageY + 15) + 'px';
            });

            link.addEventListener('mouseleave', function () {
                box.style.display = 'none';
            });
        });
    });


    /* ============================================================
       17. CONTACT EMAIL OBFUSCATION
       ============================================================ */

    onReady(function () {
        var user   = 'info';
        var domain = 'backpackersbible.com';
        var addr   = user + '@' + domain;

        document.querySelectorAll('.contact-link-multi').forEach(function (box) {
            box.innerHTML =
                '<a href="mailto:' + addr + '" class="blue-link">' + addr + '</a>';
        });
    });


}()); /* End of IIFE */
