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
   6b. Header — language selector
   7.  Back to top button
   8.  Smooth scroll for anchor links
   9.  Gallery scrollers
   10. Lightbox
   11. Jump menu — active card centring and hover photos
   12. Map visibility (online/offline)
   13. Cookie consent banner
   14. Read More / Read Less toggle
   15. Mama Africa popup
   16. Preview box (hover blurbs)
   17. Contact email obfuscation
   18.  Map facade (lazy load on mobile)
   19. Things to do map
   20. WTF button
   21. Vibe Meter
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
       3b. HEADER — "HOME" DROPDOWN POSITIONING
       The small dropdown is position:fixed (like the mega menus),
       so line it up under its trigger whenever it is about to show.
       ============================================================ */

    (function initHeaderDropdown() {
        var items = document.querySelectorAll('.site-nav__item--dropdown');
        if (!items.length) return;

        items.forEach(function (item) {
            var trigger = item.querySelector('.site-nav__mega-trigger');
            var menu    = item.querySelector('.site-nav__mega-menu--dropdown');
            if (!trigger || !menu) return;

            function place() {
                var r    = trigger.getBoundingClientRect();
                var w    = menu.offsetWidth || 220;
                var left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
                menu.style.left = left + 'px';
            }

            item.addEventListener('mouseenter', place);
            trigger.addEventListener('focus', place);
            trigger.addEventListener('keydown', place);
        });
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
       6b. HEADER — LANGUAGE SELECTOR
       Desktop: flag button toggles a one-item dropdown. The dropdown
       link is a plain <a href>, so switching language is ordinary
       navigation. Closes on Escape, click outside, or focus leaving.
       Mobile menu: builds a row of both flags at the top of the open
       menu (above "Free offline guides"), from the same header markup,
       so the pages need no extra HTML. The current language is shown
       but not linked; the other flag links to the translated page.
       ============================================================ */

    onReady(function () {
        var root = el('lang-switch');
        var btn  = el('lang-switch-btn');
        var menu = el('lang-switch-menu');
        if (!root || !btn || !menu) return;

        /* ---- flag row inside the mobile menu ---- */
        var mobile = el('mobile-menu');
        var other  = menu.querySelector('a');
        var curImg = btn.querySelector('img');
        var othImg = other ? other.querySelector('img') : null;
        var anchor = mobile ? mobile.querySelector('.accordion--downloads') : null;

        if (mobile && other && curImg && othImg && anchor && !mobile.querySelector('.mobile-menu__lang')) {
            var isEs   = (document.documentElement.lang || '').toLowerCase().indexOf('es') === 0;
            var curLbl = btn.getAttribute('title') || '';
            var othLbl = other.getAttribute('title') || '';

            var row = document.createElement('div');
            row.className = 'mobile-menu__lang';
            row.setAttribute('role', 'group');
            row.setAttribute('aria-label', isEs ? 'Idioma' : 'Language');

            var curEl = document.createElement('span');
            curEl.className = 'mobile-menu__lang-item';
            curEl.setAttribute('aria-current', 'true');
            curEl.innerHTML = '<img src="' + curImg.getAttribute('src') + '" alt="">' +
                              '<span class="sr-only">' + curLbl + (isEs ? ' (idioma actual)' : ' (current language)') + '</span>';

            var othEl = document.createElement('a');
            othEl.href = other.getAttribute('href');
            if (other.getAttribute('hreflang')) othEl.setAttribute('hreflang', other.getAttribute('hreflang'));
            if (other.getAttribute('lang'))     othEl.setAttribute('lang', other.getAttribute('lang'));
            othEl.innerHTML = '<img src="' + othImg.getAttribute('src') + '" alt="">' +
                              '<span class="sr-only">' + othLbl + '</span>';

            // English flag first, Spanish second, on both language versions
            if (isEs) { row.appendChild(othEl); row.appendChild(curEl); }
            else      { row.appendChild(curEl); row.appendChild(othEl); }

            mobile.insertBefore(row, anchor);
        }

        function openLang() {
            menu.removeAttribute('hidden');
            btn.setAttribute('aria-expanded', 'true');
        }

        function closeLang(returnFocus) {
            menu.setAttribute('hidden', '');
            btn.setAttribute('aria-expanded', 'false');
            if (returnFocus) btn.focus();
        }

        btn.addEventListener('click', function () {
            if (menu.hasAttribute('hidden')) {
                openLang();
            } else {
                closeLang();
            }
        });

        document.addEventListener('click', function (e) {
            if (!root.contains(e.target)) closeLang();
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && !menu.hasAttribute('hidden')) {
                closeLang(true);
            }
        });

        root.addEventListener('focusout', function (e) {
            if (!menu.hasAttribute('hidden') && e.relatedTarget && !root.contains(e.relatedTarget)) {
                closeLang();
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
       11. JUMP MENU — ACTIVE CARD CENTRING AND HOVER PHOTOS
       Deferred until after first paint so it never competes with
       LCP. Initial positioning is instant (no visible scroll-jank
       on load); smooth scrolling is kept for the in-page scroll-spy
       behaviour as the user scrolls between sections.
       ============================================================ */

    function deferToIdle(fn) {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(fn, { timeout: 2000 });
        } else {
            /* Safari fallback: wait a frame so paint has happened,
               then a short timeout to stay off the critical path. */
            requestAnimationFrame(function () {
                setTimeout(fn, 200);
            });
        }
    }

    onReady(function () {
        var container = el('top-jump');
        if (!container) return;

        var cards = Array.from(container.querySelectorAll('a.jump-card'));
        if (!cards.length) return;

        function centerActiveCard(link, instant) {
            cards.forEach(function (c) { c.classList.remove('jump-card--active'); });
            link.classList.add('jump-card--active');

            var linkOffset     = link.offsetLeft;
            var linkWidth      = link.offsetWidth;
            var containerWidth = container.offsetWidth;
            var scrollPos      = linkOffset - (containerWidth / 2) + (linkWidth / 2);

            container.scrollTo({ left: scrollPos, behavior: instant ? 'auto' : 'smooth' });
        }

        function checkUrlAndCenter(instant) {
            var filename = window.location.pathname.split('/').pop() || 'index.html';
            var activeLink = cards.find(function (link) {
                return link.getAttribute('href').endsWith(filename);
            });
            if (activeLink) {
                centerActiveCard(activeLink, instant);
            } else {
                container.scrollLeft = 0;
            }
        }

        function initScrollSpy() {
            var targets = cards.map(function (link) {
                var hash = link.href.indexOf('#');
                if (hash !== -1) {
                    return el(link.href.substring(hash + 1));
                }
                return null;
            }).filter(Boolean);

            if (!targets.length) return;

            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        var activeLink = cards.find(function (l) {
                            return l.href.includes('#' + entry.target.id);
                        });
                        if (activeLink && !activeLink.classList.contains('jump-card--active')) {
                            centerActiveCard(activeLink, false);
                        }
                    }
                });
            }, { rootMargin: '-25% 0px -70% 0px', threshold: 0 });

            targets.forEach(function (t) { observer.observe(t); });
        }

        /* Everything below touches layout (offsetLeft/offsetWidth)
           or starts a scroll animation. None of it is needed for
           first paint, so it's pushed off the critical path. */
        deferToIdle(function () {
            checkUrlAndCenter(true);
            initScrollSpy();
        });
    });


    /* ------------------------------------------------------------
       11b. Jump menu — hover photos (desktop only)
       Each .jump-card may carry data-photo="...". On hover or
       keyboard focus the photo is fetched and fades in over the
       map image. Touch devices, coarse pointers and Save-Data
       connections never download any of them. A missing file is
       ignored silently (no broken-image icon).
       ------------------------------------------------------------ */
    onReady(function () {
        if (!window.matchMedia ||
            !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
        if (navigator.connection && navigator.connection.saveData) return;

        var strip = el('top-jump');
        if (!strip) return;

        function loadPhoto(card) {
            if (card.getAttribute('data-photo-state')) return;
            var src = card.getAttribute('data-photo');
            if (!src) return;
            card.setAttribute('data-photo-state', 'loading');

            var photo = new Image();
            photo.className = 'jump-card-photo';
            photo.alt = '';
            photo.setAttribute('aria-hidden', 'true');
            photo.decoding = 'async';

            photo.onload = function () {
                var base = card.querySelector('.jump-card-img');
                if (base) { base.after(photo); } else { card.appendChild(photo); }
                void photo.offsetWidth; /* commit opacity:0 so the fade runs */
                photo.classList.add('jump-card-photo--ready');
                card.setAttribute('data-photo-state', 'loaded');
            };
            photo.onerror = function () {
                card.setAttribute('data-photo-state', 'missing');
            };
            photo.src = src;
        }

        function cardFromEvent(e) {
            return e.target && e.target.closest ? e.target.closest('a.jump-card') : null;
        }

        var restQueued = false;
        function preloadRest() {
            if (restQueued) return;
            restQueued = true;
            deferToIdle(function () {
                var pending = Array.from(strip.querySelectorAll('a.jump-card[data-photo]'));
                (function next() {
                    var card = pending.shift();
                    if (!card) return;
                    loadPhoto(card);
                    setTimeout(next, 150); /* trickle, don't burst */
                })();
            });
        }

        function onEnter(e) {
            var card = cardFromEvent(e);
            if (card) loadPhoto(card);
            preloadRest();
        }

        strip.addEventListener('mouseover', onEnter, { passive: true });
        strip.addEventListener('focusin',   onEnter);
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

            /* .hostel-toggle buttons use "Hostels" / "Close".
               Set text immediately on load, then update on each toggle. */
            if (summary.classList.contains('hostel-toggle')) {
                summary.textContent = details.open ? 'Close' : 'Hostels';
                details.addEventListener('toggle', function () {
                    summary.textContent = details.open ? 'Close' : 'Hostels';
                });
                return;
            }

            /* Standard Read More / Read Less */
            summary.textContent = details.open ? 'Read Less' : 'Read More';
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


/* ============================================================
   ARIA OVERRIDES — mobile menu and accordion
   Wraps the functions defined in script.js/script-2.js to
   keep aria-expanded and hidden attributes in sync.
   Previously inline in national.html — now centralised here
   so all pages benefit automatically.
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

    var origToggleMobileMenu = window.toggleMobileMenu;
    window.toggleMobileMenu = function () {
        if (origToggleMobileMenu) origToggleMobileMenu();
        var menu = document.getElementById('mobile-menu');
        var btn  = document.getElementById('hamburger-icon');
        if (!menu || !btn) return;
        var visible = getComputedStyle(menu).display !== 'none' && !menu.hasAttribute('hidden');
        btn.setAttribute('aria-expanded', visible ? 'true' : 'false');
        btn.setAttribute('aria-label', visible ? 'Close navigation menu' : 'Open navigation menu');
        if (visible) {
            menu.removeAttribute('hidden');
            var closeBtn = menu.querySelector('.close-btn');
            if (closeBtn) setTimeout(function () { closeBtn.focus(); }, 50);
        } else {
            btn.focus();
        }
    };

    var closeBtn = document.querySelector('#mobile-menu .close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                window.toggleMobileMenu();
            }
        });
    }

    var origToggleAccordion = window.toggleAccordion;
    window.toggleAccordion = function (el) {
        if (origToggleAccordion) origToggleAccordion(el);
        var panelId = el.getAttribute('aria-controls');
        if (!panelId) return;
        var panel = document.getElementById(panelId);
        if (!panel) return;
        var isOpen = panel.style.display === 'block' || panel.classList.contains('open');
        el.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    };

});



/* ============================================================
   MAP IFRAME — MOBILE ZOOM
   On mobile (≤768px), reduce the zoom level in all map iframe
   src URLs by 1.5 stops so the region fits a small screen.
   Pitch and bearing are preserved — the 3D effect stays.
   ============================================================ */
(function () {
    if (window.innerWidth > 768) return;

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('iframe[src*="map.html"]').forEach(function (iframe) {
            var src = iframe.src;
            src = src.replace(/([?&]zoom=)([\d.]+)/, function (match, key, val) {
                var reduced = Math.max(parseFloat(val) - 1.5, 3);
                return key + reduced;
            });
            iframe.src = src;
        });
    });
}());



/* ============================================================
   18. MAP FACADE (LAZY LOAD ON MOBILE)
   ============================================================ */
document.addEventListener("DOMContentLoaded", function() {
  const mapFrames = document.querySelectorAll('.sa-hostel-map-iframe');

  mapFrames.forEach(mapFrame => {
    const container  = mapFrame.closest('.sa-hostel-map-shell');
    const poster     = container.querySelector('.sa-hostel-map-poster');
    const overlayCircle = container.querySelector('.map-overlay-circle');

    function wakeUpMap(hideBadge) {
      if (mapFrame.getAttribute('src') === 'about:blank') {
        mapFrame.src = mapFrame.getAttribute('data-src');
        // Always hide the poster — it's replaced by the live map
        if (poster) poster.style.display = 'none';
        // Only hide the yellow circle if the user triggered the load
        // (on desktop it stays visible as an informational badge over the map)
        if (hideBadge && overlayCircle) overlayCircle.style.display = 'none';
      }
    }

    // 1. Desktop: auto-load immediately; keep the yellow circle visible
    if (window.innerWidth > 768) {
      wakeUpMap(false);
    }
    // 2. Mobile: tap the poster OR the yellow circle to load the map
    else {
      if (poster) {
        poster.style.cursor = 'pointer';
        poster.addEventListener('click', function() { wakeUpMap(true); }, { once: true });
      }
      if (overlayCircle) {
        overlayCircle.addEventListener('click', function() { wakeUpMap(true); }, { once: true });
      }
      // Fallback: tap anywhere on the shell
      if (container) {
        container.addEventListener('click', function() { wakeUpMap(true); }, { once: true });
      }
    }
  });
});


/* ============================================================
   19. THINGS TO DO MAP
   ============================================================ */

/* ==========================================================================
   ATTRACTIONS MAP CONTROLLER (script-2.js)
   - MapLibre GL Direct DOM Rendering with Overlay Spinner
   - Pins come from a pre-built static file per region (see
     build-attractions.mjs) — no live Overpass query in the browser
   - MapLibre itself is loaded on demand, not on every page view
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initAttractionsMap();
  initGygLinks();
});

const MAPLIBRE_JS  = 'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js';
const MAPLIBRE_CSS = 'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css';

/* GetYourGuide affiliate tracking.
   Paste your GetYourGuide partner ID between the quotes once you have it.
   While it is empty the button still works, but bookings are not tracked
   to you. Applies to every link carrying the data-gyg-link attribute. */
const GYG_PARTNER_ID = '';

function initGygLinks() {
  if (!GYG_PARTNER_ID) return;
  document.querySelectorAll('a[data-gyg-link]').forEach(a => {
    try {
      const url = new URL(a.href);
      url.searchParams.set('partner_id', GYG_PARTNER_ID);
      url.searchParams.set('utm_medium', 'online_publisher');
      url.searchParams.set('cmp', 'bb-map'); // shows in your reports that the booking came from the map button
      a.href = url.toString();
    } catch (e) { /* leave the plain link alone */ }
  });
}

/* Where the pre-built pin files live. A region's file is named after its
   page URL (e.g. /spain/en/regions/andalusia -> andalusia.json).
   Override per page with data-src on #attractions-map if ever needed. */
const ATTRACTIONS_DATA_BASE = '/spain/assets/data/attractions/';

/**
 * Curated Fallback Datasets for Regions (Guarantees zero timeouts)
 */
const REGIONAL_FALLBACKS = {
  'Extremadura': {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-6.3418, 38.9161] },
        properties: {
          name: 'Roman Theatre of Mérida',
          subtitle: 'UNESCO World Heritage Site',
          category: 'historic',
          description: 'Magnificent ancient Roman theatre built in 15 BC, still hosting classical theatre festivals today.',
          website: 'https://www.turismoextremadura.com/',
          wikipedia: 'Roman_Theatre_of_Mérida'
        }
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-5.8794, 39.4608] },
        properties: {
          name: 'Trujillo Castle',
          subtitle: 'Historic Castle & Fortress',
          category: 'historic',
          description: 'Impressive Moorish mountaintop fortress offering panoramic views over the conquistador town of Trujillo.',
          website: 'https://www.turismoextremadura.com/',
          wikipedia: 'Castle_of_Trujillo'
        }
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-6.3711, 39.4764] },
        properties: {
          name: 'Cáceres Old Town (Ciudad Monumental)',
          subtitle: 'UNESCO Medieval Old Town',
          category: 'historic',
          description: 'Stunning walled medieval and Renaissance city featuring ancient palaces, towers, and cobblestone streets.',
          website: 'https://www.turismoextremadura.com/',
          wikipedia: 'Cáceres'
        }
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-5.3267, 39.4528] },
        properties: {
          name: 'Royal Monastery of Santa María de Guadalupe',
          subtitle: 'UNESCO Monastery Sanctuary',
          category: 'historic',
          description: 'A masterpiece of Spanish architecture blending Gothic, Mudejar, Renaissance, and Baroque styles.',
          website: 'https://www.monasterioguadalupe.com/',
          wikipedia: 'Real_Monasterio_de_Santa_María_de_Guadalupe'
        }
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-6.0864, 40.0294] },
        properties: {
          name: 'Plasencia Cathedral Complex',
          subtitle: 'Historic Cathedrals',
          category: 'historic',
          description: 'Unique architectural complex combining an old Romanesque cathedral and a magnificent New Gothic cathedral.',
          website: 'https://www.turismoextremadura.com/',
          wikipedia: 'Plasencia_Cathedral'
        }
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-6.8833, 39.4833] },
        properties: {
          name: 'Alcántara Roman Bridge',
          subtitle: 'Ancient Roman Engineering',
          category: 'historic',
          description: 'Enormous triumphal Roman stone arch bridge built across the Tagus River in 104 AD.',
          website: 'https://www.turismoextremadura.com/',
          wikipedia: 'Alcántara_Bridge'
        }
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-6.0333, 39.8333] },
        properties: {
          name: 'Monfragüe National Park',
          subtitle: 'Nature Reserve & Viewpoint',
          category: 'leisure',
          description: 'Spectacular protected nature reserve famous for dramatic quartzite cliffs and soaring griffon vultures.',
          website: 'https://www.miteco.gob.es/',
          wikipedia: 'Monfragüe_National_Park'
        }
      }
    ]
  }
};

let globalMapInstance = null;

function initAttractionsMap() {
  const mapShell = document.getElementById('attractions-map');
  if (!mapShell) return;

  const loadBtn = mapShell.querySelector('.bb-load-attractions-btn');
  const posterWrap = mapShell.querySelector('.bb-map-poster-wrap');
  const mapContainer = document.getElementById('direct-map-container');

  if (!loadBtn || !mapContainer) return;

  // Warm-up: begin fetching the map library as soon as the visitor shows
  // intent (hover, touch or keyboard focus), so the click feels instant.
  ['pointerenter', 'touchstart', 'focus'].forEach(evt => {
    loadBtn.addEventListener(evt, () => { ensureMapLibre().catch(() => {}); }, { once: true, passive: true });
  });

  loadBtn.addEventListener('click', async () => {
    if (posterWrap) {
      posterWrap.style.display = 'none';
    }

    if (mapContainer.clientHeight === 0) {
      mapContainer.style.height = '450px';
      mapContainer.style.width = '100%';
    }

    let spinnerOverlay = mapShell.querySelector('.map-loading-overlay');
    if (!spinnerOverlay) {
      spinnerOverlay = document.createElement('div');
      spinnerOverlay.className = 'map-loading-overlay';
      spinnerOverlay.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(255,255,255,0.92); display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:10; font-family:sans-serif;';
      spinnerOverlay.innerHTML = `
        <div style="width: 42px; height: 42px; border: 4px solid #e0e0e0; border-top: 4px solid #e74c3c; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 12px;"></div>
        <p style="font-size: 14px; font-weight: 600; color: #222; margin: 0;">Loading attractions & tours...</p>
        <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
      `;
      mapShell.style.position = 'relative';
      mapShell.appendChild(spinnerOverlay);
    } else {
      spinnerOverlay.style.display = 'flex';
    }

    const regionName = mapShell.getAttribute('data-region') || 'Extremadura';
    const centerAttr = mapShell.getAttribute('data-center') || '0,0';
    const zoomAttr = mapShell.getAttribute('data-zoom') || '10';

    const [lng, lat] = centerAttr.split(',').map(Number);
    const zoom = parseFloat(zoomAttr);

    // Start both downloads at once: the pin file and the map library.
    const dataPromise = fetchAttractionsData(mapShell, regionName);

    try {
      await ensureMapLibre();

      if (!globalMapInstance) {
        globalMapInstance = new maplibregl.Map({
          container: 'direct-map-container',
          style: {
            version: 8,
            sources: {
              'raster-tiles': {
                type: 'raster',
                tiles: [
                  'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                  'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
                  'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
                ],
                tileSize: 256,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              }
            },
            layers: [
              {
                id: 'simple-tiles',
                type: 'raster',
                source: 'raster-tiles',
                minzoom: 0,
                maxzoom: 19
              }
            ]
          },
          center: [lng, lat],
          zoom: zoom,
          cooperativeGestures: true
        });

        globalMapInstance.addControl(new maplibregl.NavigationControl(), 'top-right');
        setupMapPopups(globalMapInstance);
      } else {
        globalMapInstance.setCenter([lng, lat]);
        globalMapInstance.setZoom(zoom);
      }

      setTimeout(() => {
        if (globalMapInstance) globalMapInstance.resize();
      }, 100);

      globalMapInstance.on('load', async () => {
        globalMapInstance.resize();
        await loadAttractionsData(globalMapInstance, dataPromise, spinnerOverlay);
      });

      if (globalMapInstance.loaded()) {
        await loadAttractionsData(globalMapInstance, dataPromise, spinnerOverlay);
      }

    } catch (err) {
      console.error('[Attractions Map] Initialization error:', err);
      if (spinnerOverlay) {
        spinnerOverlay.innerHTML = `<p style="color: #d9534f; font-weight: bold;">Error loading map: ${err.message}</p>`;
      }
    }
  });
}

/**
 * Loads MapLibre GL (JS + CSS) the first time it's needed.
 * If the page still has the old <script>/<link> tags in <head>, this
 * simply does nothing.
 */
let maplibrePromise = null;
function ensureMapLibre() {
  if (typeof maplibregl !== 'undefined') return Promise.resolve();
  if (maplibrePromise) return maplibrePromise;

  maplibrePromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[href*="maplibre-gl.css"]')) {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = MAPLIBRE_CSS;
      document.head.appendChild(css);
    }
    const js = document.createElement('script');
    js.src = MAPLIBRE_JS;
    js.onload = () => resolve();
    js.onerror = () => {
      maplibrePromise = null; // allow a retry on the next click
      reject(new Error('Map library failed to load. Please check your connection and try again.'));
    };
    document.head.appendChild(js);
  });
  return maplibrePromise;
}

/**
 * Fetches the region's pre-built pin file (a small static GeoJSON).
 * Never rejects: on any failure it falls back to the curated dataset
 * (if there is one) or an empty map.
 */
function fetchAttractionsData(mapShell, regionName) {
  const slug = window.location.pathname.split('/').filter(Boolean).pop().replace(/\.html$/, '');
  const url = mapShell.getAttribute('data-src') || (ATTRACTIONS_DATA_BASE + slug + '.json');

  return fetch(url)
    .then(res => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .catch(err => {
      console.warn(`[Attractions Map] Could not load ${url}.`, err);
      return REGIONAL_FALLBACKS[regionName] || { type: 'FeatureCollection', features: [] };
    });
}

async function loadAttractionsData(map, dataPromise, spinnerOverlay) {
  const geojson = await dataPromise;

  console.log(`[Attractions Map] Plotted ${geojson.features.length} pins on map.`);

  if (map.getSource('attractions-source')) {
    map.getSource('attractions-source').setData(geojson);
  } else {
    map.addSource('attractions-source', {
      type: 'geojson',
      data: geojson
    });

    map.addLayer({
      id: 'attractions-pins',
      type: 'circle',
      source: 'attractions-source',
      paint: {
        'circle-radius': 9,
        'circle-color': [
          'match',
          ['get', 'category'],
          'museum', '#e67e22',
          'viewpoint', '#2ecc71',
          'historic', '#8e44ad',
          '#e74c3c'
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    });
  }

  if (spinnerOverlay) {
    spinnerOverlay.style.display = 'none';
  }
}

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function setupMapPopups(map) {
  const popup = new maplibregl.Popup({
    closeButton: true,
    closeOnClick: false,
    maxWidth: '300px'
  });

  map.on('mouseenter', 'attractions-pins', () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', 'attractions-pins', () => {
    map.getCanvas().style.cursor = '';
  });

  map.on('click', 'attractions-pins', (e) => {
    if (!e.features || !e.features.length) return;

    const feature = e.features[0];
    const coords = feature.geometry.coordinates.slice();
    const props = feature.properties;

    let popupHtml = `<div class="bb-map-popup" style="font-family:sans-serif; padding:4px;">
      <h3 style="margin:0 0 2px; font-size:15px; font-weight:bold; color:#111;">${escapeHtml(props.name)}</h3>
      <p style="margin:0 0 8px; font-size:11px; font-weight:700; color:#e67e22; text-transform:uppercase; letter-spacing:0.5px;">${escapeHtml(props.subtitle)}</p>`;

    if (props.description) {
      popupHtml += `<p style="margin:4px 0 8px; font-size:13px; color:#444; line-height:1.4;">${escapeHtml(props.description)}</p>`;
    }

    if (props.website) {
      popupHtml += `<p style="margin:6px 0 2px; font-size:13px;"><a href="${props.website}" target="_blank" rel="noopener" style="color:#0066cc; text-decoration:underline; font-weight:600;">Official Website &rarr;</a></p>`;
    }

    if (props.wikiUrl || props.wikipedia) {
      let wikiTitle = props.wikipedia ? (props.wikipedia.includes(':') ? props.wikipedia.split(':')[1] : props.wikipedia) : '';
      let wikiUrl = props.wikiUrl || `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiTitle)}`;
      popupHtml += `<p style="margin:4px 0 2px; font-size:13px;"><a href="${wikiUrl}" target="_blank" rel="noopener" style="color:#0066cc; text-decoration:underline; font-weight:600;">Wikipedia Article &rarr;</a></p>`;
    } else if (props.wikidata) {
      let wikidataUrl = `https://www.wikidata.org/wiki/${encodeURIComponent(props.wikidata)}`;
      popupHtml += `<p style="margin:4px 0 2px; font-size:13px;"><a href="${wikidataUrl}" target="_blank" rel="noopener" style="color:#0066cc; text-decoration:underline; font-weight:600;">Wikidata Record &rarr;</a></p>`;
    }

    popupHtml += `</div>`;

    while (Math.abs(e.lngLat.lng - coords[0]) > 180) {
      coords[0] += e.lngLat.lng > coords[0] ? 360 : -360;
    }

    popup.setLngLat(coords).setHTML(popupHtml).addTo(map);
  });
}


/* ============================================================
   21. VIBE METER
   ============================================================ */




/* VIBEMETER ENGINE v9 — one copy in /js/script-2.js */
(function () {
  const VM_SVG_TEMPLATE = "<svg\n width=\"100%\"\n height=\"100%\"\n viewBox=\"37.722286 52.766296 167.72946 158.74797\"\n version=\"1.1\"\n xmlns:xlink=\"http://www.w3.org/1999/xlink\"\n xmlns=\"http://www.w3.org/2000/svg\">\n\n<defs>\n  <path id=\"pathQuietBase\" d=\"m 90.945802,167.19329 c 17.683908,12.4017 22.966118,10.56442 27.788998,11.94238\" fill=\"none\" />\n  <path id=\"pathWild\" d=\"m 157.63169,93.575242 c 9.01588,10.732498 14.57346,16.236728 14.68704,35.823658\" fill=\"none\" />\n</defs>\n\n<!-- BACKGROUND -->\n<rect style=\"fill:#ffd400;\" width=\"167.72946\" height=\"158.74797\" x=\"37.722286\" y=\"52.766296\" ry=\"0.43908408\"/>\n\n<!-- OUTER RIM -->\n<circle style=\"fill:#d6d6d6;stroke:#000000;stroke-width:0.4;\" cx=\"124.0995\" cy=\"127.88613\" r=\"60.077427\"/>\n<circle style=\"fill:#cbcbcb;stroke:#000000;stroke-width:1.5561;\" cx=\"124.0995\" cy=\"127.88613\" r=\"57.932709\"/>\n<circle style=\"fill:#ffffff;stroke:#000000;stroke-width:0.4;\" cx=\"124.0995\" cy=\"127.88613\" r=\"55.844093\"/>\n\n<!-- UPDATED FIVE-COLOUR SCALE -->\n<g transform=\"translate(37.722286,52.766296)\">\n <path style=\"fill:#14d700;fill-opacity:1;stroke:#000000;stroke-width:0.5;stroke-linejoin:round;\" d=\"m 86.35103,120.63396 c -19.597061,0 -32.280315,-11.96803 -36.762367,-18.64343 0,0.0477 -6.675395,4.76814 -6.675395,4.76814 8.725696,10.48991 20.884456,22.02881 43.485442,22.02881 0,-0.33377 -0.04768,-8.15352 -0.04768,-8.15352 z\"/>\n <path style=\"fill:#e1ff00;fill-opacity:1;stroke:#000000;stroke-width:0.5;stroke-linejoin:round;\" d=\"M 49.573961,101.69397 C 38.103125,85.80485 40.382764,68.516068 43.171625,60.974715 c -0.03868,0.02792 -7.773307,-2.6214 -7.773307,-2.6214 -3.397686,13.214831 -5.636394,29.827171 7.592744,48.151865 0.270617,-0.19536 6.582899,-4.81121 6.582899,-4.81121 z\"/>\n <path style=\"fill:#ffbc00;fill-opacity:1;stroke:#000000;stroke-width:0.5;stroke-linejoin:round;\" d=\"m 43.115348,60.892623 c 6.073946,-18.632 21.383697,-26.981269 29.119547,-29.173613 -0.04535,-0.01479 -2.464346,-7.824516 -2.464346,-7.824516 -12.677803,5.044733 -27.416991,13.028341 -34.421992,34.516349 0.317327,0.103455 7.766791,2.48178 7.766791,2.48178 z\"/>\n <path style=\"fill:#ff6a00;fill-opacity:1;stroke:#000000;stroke-width:0.5;stroke-linejoin:round;\" d=\"M 72.389708,31.887766 c 18.626858,-6.0897 34.401212,1.344576 40.735712,6.296718 -0.0148,-0.0453 4.86325,-6.606427 4.86325,-6.606427 -11.5534,-7.259122 -26.695881,-14.448495 -48.177963,-7.425343 0.103709,0.317243 2.579001,7.735052 2.579001,7.735052 z\"/>\n <path style=\"fill:#ff0000;fill-opacity:1;stroke:#000000;stroke-width:0.5;stroke-linejoin:round;\" d=\"m 113.15642,38.333652 c 15.89614,11.461107 19.18478,28.586627 18.91636,36.622643 0.0279,-0.03865 8.20334,0.03637 8.20334,0.03637 -0.94294,-13.612008 -4.05711,-30.082701 -22.3899,-43.300638 -0.1952,0.270729 -4.7298,6.641629 -4.7298,6.641629 z\"/>\n <path style=\"fill:none;stroke:#000000;stroke-width:0.5;stroke-linecap:round;stroke-linejoin:round;\" d=\"m 124.60136,37.323444 c 9.60242,9.710409 15.53134,23.061013 15.53134,37.796391 M 48.360073,37.115257 c 9.728324,-9.731521 23.169785,-15.750899 38.017147,-15.7509 m 38.22414,15.959087 C 114.85716,27.469656 101.33017,21.364356 86.37722,21.364357 M 32.621742,75.119835 c 0,-14.840969 6.014196,-28.277247 15.738331,-38.004578 m 0.15454,76.163123 C 38.699698,103.53911 32.621742,90.039262 32.621742,75.119835 m 15.892871,38.158545 c 9.715888,9.641 23.093707,15.59693 37.862607,15.59693 v -8.16506\"/>\n <path style=\"fill:none;stroke:#000000;stroke-width:0.5;stroke-linecap:round;stroke-linejoin:round;\" d=\"m 86.37722,120.68846 c -12.6427,0 -24.082879,-5.1486 -32.338201,-13.46348 m 0,0 C 45.861103,98.988071 40.808598,87.643991 40.808598,75.119835 m 0,0 c 0,-12.613769 5.125068,-24.030514 13.406446,-32.281478 m 0,0 C 62.456581,34.627088 73.824134,29.551212 86.37722,29.551212 m 32.17121,13.296147 c 8.27607,8.250265 13.39741,19.663294 13.39741,32.272476 h 8.01874 M 86.37722,29.551212 c 12.557672,0 23.92894,5.079585 32.17121,13.296147\"/>\n <path style=\"fill:#000000;stroke:#000000;stroke-width:0.5;stroke-linecap:round;\" d=\"m 61.99992,123.03082 1.902812,-3.69991\"/>\n <path style=\"fill:#000000;stroke:#000000;stroke-width:0.5;stroke-linecap:round;\" d=\"m 33.400811,83.505973 4.128896,-0.512099\"/>\n <path style=\"fill:#000000;stroke:#000000;stroke-width:0.5;stroke-linecap:round;\" d=\"m 48.521648,37.247822 2.922928,2.960832\"/>\n <path style=\"fill:#000000;stroke:#000000;stroke-width:0.5;stroke-linecap:round;\" d=\"m 94.746962,22.11448 -0.604104,4.116442\"/>\n <path style=\"fill:#000000;stroke:#000000;stroke-width:0.5;stroke-linecap:round;\" d=\"m 134.16965,50.765376 -3.68138,1.938413\"/>\n <path style=\"fill:none;stroke:#000000;stroke-width:0.5;stroke-linecap:round;\" d=\"m 49.486682,102.11951 -6.3304,4.62486\"/>\n <path style=\"fill:none;stroke:#000000;stroke-width:0.5;stroke-linecap:round;\" d=\"M 43.021419,61.093114 35.334207,58.598141\"/>\n <path style=\"fill:none;stroke:#000000;stroke-width:0.5;stroke-linecap:round;\" d=\"m 72.286775,31.760326 -2.494974,-7.61978\"/>\n <path style=\"fill:none;stroke:#000000;stroke-width:0.5;stroke-linecap:round;\" d=\"m 113.35268,38.23377 4.58535,-6.473444\"/>\n <path style=\"fill:#000000;stroke:#000000;stroke-width:0.2;\" d=\"m 86.664966,116.24391 v -1.31387\"/>\n</g>\n\n<!-- QUIET: black, shifted right/down, very slightly anti-clockwise -->\n<text style=\"font-weight:bold;font-size:8.46667px;line-height:1;font-family:'Century Gothic',sans-serif;text-anchor:middle;fill:#000000;\" transform=\"translate(-0.9630905,-0.9779667) rotate(-0.4 109 173)\">\n <textPath href=\"#pathQuietBase\" startOffset=\"50%\" text-anchor=\"middle\"><tspan style=\"font-weight:bold;font-size:5.1px;font-family:'Century Gothic',sans-serif;\">Quiet</tspan></textPath>\n</text>\n\n<!-- WILD: shifted slightly right/down, very slightly clockwise -->\n<text style=\"font-weight:bold;font-size:5.1px;line-height:1;font-family:'Century Gothic',sans-serif;text-anchor:middle;fill:#ffffff;\" transform=\"translate(-1.0779667,-0.41864448) rotate(0.4 165 112)\">\n <textPath href=\"#pathWild\" startOffset=\"50%\" text-anchor=\"middle\">Wild</textPath>\n</text>\n\n<!-- PARTY POTENTIAL: adjusted to prevent the final letter being clipped -->\n<path style=\"fill:none;stroke:none;\" d=\"m 103.82258,92.942156 c 12.96281,-5.332721 19.8943,-8.957327 38.59156,-3.120071\" id=\"partyPath\"/>\n<text style=\"font-weight:bold;font-size:4.4px;font-family:'Century Gothic';fill:#000000;\" transform=\"rotate(4,124,90)\">\n <textPath href=\"#partyPath\" startOffset=\"59%\" text-anchor=\"middle\">Party Potential</textPath>\n</text>\n\n<!-- MINI DIAL BACKGROUND TEMPLATE -->\n<!-- CLEANLINESS -->\n<g transform=\"matrix(0.71445729,0,0,0.71445729,22.15,-3.5)\">\n <svg class=\"vm-mini-dial-bg\" x=\"107.488884\" y=\"136.511704\" width=\"33.820832\" height=\"33.820832\" viewBox=\"142.08125 169.59791 23.905132 23.905132\" preserveAspectRatio=\"none\">\n<circle cx=\"154.03381\" cy=\"181.55048\" r=\"11.952566\" fill=\"#a1a1a1\"/>\n<circle cx=\"154.03381\" cy=\"181.55048\" r=\"1.0901042\" fill=\"#ffffff\" stroke=\"#000000\" stroke-width=\"0.093198\"/>\n<circle cx=\"154.03381\" cy=\"181.55048\" r=\"0.58233804\" fill=\"#ffffff\" stroke=\"#000000\" stroke-width=\"0.093198\"/>\n<g transform=\"matrix(0.7068168,0,0,0.7068168,92.769044,110.40525)\">\n<path d=\"m 86.677017,116.24006 c -8.606938,0 -15.584241,-6.9773 -15.584242,-15.58424 2e-6,-8.606938 6.977304,-15.584239 15.584242,-15.584239 8.606938,-10e-7 15.584243,6.977301 15.584243,15.584239 0,3.42155 -1.10265,6.58556 -2.971975,9.15608\" fill=\"none\" stroke=\"#ffffff\" stroke-width=\"0.3\" stroke-linecap=\"round\"/>\n<g fill=\"#ffffff\" font-family=\"Century Gothic,sans-serif\" font-size=\"2.11667\" font-weight=\"bold\" text-anchor=\"middle\">\n<text x=\"86.672638\" y=\"114.58619\">0</text><text x=\"79.608871\" y=\"112.64206\">1</text><text x=\"74.926537\" y=\"107.46309\">2</text><text x=\"73.271927\" y=\"100.43938\">3</text><text x=\"75.683601\" y=\"93.582016\">4</text><text x=\"80.728996\" y=\"89.738815\">5</text><text x=\"86.65049\" y=\"88.185745\">6</text><text x=\"93.54937\" y=\"90.283485\">7</text><text x=\"98.619057\" y=\"95.377243\">8</text><text x=\"100.05201\" y=\"102.54202\">9</text><text x=\"96.850693\" y=\"109.16269\">10</text>\n</g>\n<g fill=\"#000000\" stroke=\"#ffffff\" stroke-width=\"0.3\" stroke-linecap=\"round\">\n<path d=\"m 78.545917,113.93622 0.67378,-1.12859\"/><path d=\"m 72.76825,107.73744 1.212805,-0.6064\"/><path d=\"m 71.134334,99.416253 1.330717,0.13476\"/><path d=\"m 74.082123,91.499337 1.061204,0.774848\"/><path d=\"m 79.682382,86.746093 0.592448,1.166359\"/><path d=\"M 86.698655,85.064739 V 86.37861\"/><path d=\"m 94.817704,87.389278 -0.656934,1.07805\"/><path d=\"M 100.57852,93.588056 99.399409,94.16077\"/><path d=\"m 102.21244,101.87555 -1.29702,-0.11791\"/><path d=\"m 99.260568,109.843 -1.023429,-0.80854\"/><path d=\"M 86.687254,116.25001 V 114.916\"/>\n</g>\n</g>\n</svg>\n <text class=\"vm-mini-label\" style=\"font-weight:normal;font-size:4.6px;font-family:'Century Gothic';text-anchor:middle;fill:#000000;\" x=\"124.31605\" y=\"161.5\">Cleanliness</text>\n <g class=\"vm-sub-dial-needle\" data-vm-needle=\"cleanliness\" data-vm-base-angle=\"-47.214037\">\n  <path style=\"fill:#000000;stroke:#000000;stroke-width:0.508865;stroke-linecap:round;\" d=\"m 123.94226,153.8792 10.98547,-11.86906\"/>\n  <circle style=\"fill:#ffffff;stroke:#000000;stroke-width:0.131856;\" cx=\"123.89387\" cy=\"153.76831\" r=\"1.5422727\"/>\n  <circle style=\"fill:#ffffff;stroke:#000000;stroke-width:0.131856;\" cx=\"123.89387\" cy=\"153.76831\" r=\"0.82388818\"/>\n </g>\n</g>\n\n<!-- ACTIVITIES -->\n<g transform=\"matrix(0.71445729,0,0,0.71445729,51.33,-0.5)\">\n <svg class=\"vm-mini-dial-bg\" x=\"107.488884\" y=\"136.511704\" width=\"33.820832\" height=\"33.820832\" viewBox=\"142.08125 169.59791 23.905132 23.905132\" preserveAspectRatio=\"none\">\n<circle cx=\"154.03381\" cy=\"181.55048\" r=\"11.952566\" fill=\"#a1a1a1\"/>\n<circle cx=\"154.03381\" cy=\"181.55048\" r=\"1.0901042\" fill=\"#ffffff\" stroke=\"#000000\" stroke-width=\"0.093198\"/>\n<circle cx=\"154.03381\" cy=\"181.55048\" r=\"0.58233804\" fill=\"#ffffff\" stroke=\"#000000\" stroke-width=\"0.093198\"/>\n<g transform=\"matrix(0.7068168,0,0,0.7068168,92.769044,110.40525)\">\n<path d=\"m 86.677017,116.24006 c -8.606938,0 -15.584241,-6.9773 -15.584242,-15.58424 2e-6,-8.606938 6.977304,-15.584239 15.584242,-15.584239 8.606938,-10e-7 15.584243,6.977301 15.584243,15.584239 0,3.42155 -1.10265,6.58556 -2.971975,9.15608\" fill=\"none\" stroke=\"#ffffff\" stroke-width=\"0.3\" stroke-linecap=\"round\"/>\n<g fill=\"#ffffff\" font-family=\"Century Gothic,sans-serif\" font-size=\"2.11667\" font-weight=\"bold\" text-anchor=\"middle\">\n<text x=\"86.672638\" y=\"114.58619\">0</text><text x=\"79.608871\" y=\"112.64206\">1</text><text x=\"74.926537\" y=\"107.46309\">2</text><text x=\"73.271927\" y=\"100.43938\">3</text><text x=\"75.683601\" y=\"93.582016\">4</text><text x=\"80.728996\" y=\"89.738815\">5</text><text x=\"86.65049\" y=\"88.185745\">6</text><text x=\"93.54937\" y=\"90.283485\">7</text><text x=\"98.619057\" y=\"95.377243\">8</text><text x=\"100.05201\" y=\"102.54202\">9</text><text x=\"96.850693\" y=\"109.16269\">10</text>\n</g>\n<g fill=\"#000000\" stroke=\"#ffffff\" stroke-width=\"0.3\" stroke-linecap=\"round\">\n<path d=\"m 78.545917,113.93622 0.67378,-1.12859\"/><path d=\"m 72.76825,107.73744 1.212805,-0.6064\"/><path d=\"m 71.134334,99.416253 1.330717,0.13476\"/><path d=\"m 74.082123,91.499337 1.061204,0.774848\"/><path d=\"m 79.682382,86.746093 0.592448,1.166359\"/><path d=\"M 86.698655,85.064739 V 86.37861\"/><path d=\"m 94.817704,87.389278 -0.656934,1.07805\"/><path d=\"M 100.57852,93.588056 99.399409,94.16077\"/><path d=\"m 102.21244,101.87555 -1.29702,-0.11791\"/><path d=\"m 99.260568,109.843 -1.023429,-0.80854\"/><path d=\"M 86.687254,116.25001 V 114.916\"/>\n</g>\n</g>\n</svg>\n <text class=\"vm-mini-label\" style=\"font-weight:normal;font-size:5.6px;font-family:'Century Gothic';text-anchor:middle;fill:#000000;\" x=\"124.31605\" y=\"161.5\">Activities</text>\n <g class=\"vm-sub-dial-needle\" data-vm-needle=\"activities\" data-vm-base-angle=\"-57.061653\">\n  <path style=\"fill:#000000;stroke:#000000;stroke-width:0.508865;stroke-linecap:round;\" d=\"m 123.94226,153.8792 8.98547,-13.86906\"/>\n  <circle style=\"fill:#ffffff;stroke:#000000;stroke-width:0.131856;\" cx=\"123.89387\" cy=\"153.76831\" r=\"1.5422727\"/>\n  <circle style=\"fill:#ffffff;stroke:#000000;stroke-width:0.131856;\" cx=\"123.89387\" cy=\"153.76831\" r=\"0.82388818\"/>\n </g>\n</g>\n\n<!-- VALUE -->\n<g transform=\"matrix(0.71445729,0,0,0.71445729,9.4771098,22.438679)\">\n <svg class=\"vm-mini-dial-bg\" x=\"107.488884\" y=\"136.511704\" width=\"33.820832\" height=\"33.820832\" viewBox=\"142.08125 169.59791 23.905132 23.905132\" preserveAspectRatio=\"none\">\n<circle cx=\"154.03381\" cy=\"181.55048\" r=\"11.952566\" fill=\"#a1a1a1\"/>\n<circle cx=\"154.03381\" cy=\"181.55048\" r=\"1.0901042\" fill=\"#ffffff\" stroke=\"#000000\" stroke-width=\"0.093198\"/>\n<circle cx=\"154.03381\" cy=\"181.55048\" r=\"0.58233804\" fill=\"#ffffff\" stroke=\"#000000\" stroke-width=\"0.093198\"/>\n<g transform=\"matrix(0.7068168,0,0,0.7068168,92.769044,110.40525)\">\n<path d=\"m 86.677017,116.24006 c -8.606938,0 -15.584241,-6.9773 -15.584242,-15.58424 2e-6,-8.606938 6.977304,-15.584239 15.584242,-15.584239 8.606938,-10e-7 15.584243,6.977301 15.584243,15.584239 0,3.42155 -1.10265,6.58556 -2.971975,9.15608\" fill=\"none\" stroke=\"#ffffff\" stroke-width=\"0.3\" stroke-linecap=\"round\"/>\n<g fill=\"#ffffff\" font-family=\"Century Gothic,sans-serif\" font-size=\"2.11667\" font-weight=\"bold\" text-anchor=\"middle\">\n<text x=\"86.672638\" y=\"114.58619\">0</text><text x=\"79.608871\" y=\"112.64206\">1</text><text x=\"74.926537\" y=\"107.46309\">2</text><text x=\"73.271927\" y=\"100.43938\">3</text><text x=\"75.683601\" y=\"93.582016\">4</text><text x=\"80.728996\" y=\"89.738815\">5</text><text x=\"86.65049\" y=\"88.185745\">6</text><text x=\"93.54937\" y=\"90.283485\">7</text><text x=\"98.619057\" y=\"95.377243\">8</text><text x=\"100.05201\" y=\"102.54202\">9</text><text x=\"96.850693\" y=\"109.16269\">10</text>\n</g>\n<g fill=\"#000000\" stroke=\"#ffffff\" stroke-width=\"0.3\" stroke-linecap=\"round\">\n<path d=\"m 78.545917,113.93622 0.67378,-1.12859\"/><path d=\"m 72.76825,107.73744 1.212805,-0.6064\"/><path d=\"m 71.134334,99.416253 1.330717,0.13476\"/><path d=\"m 74.082123,91.499337 1.061204,0.774848\"/><path d=\"m 79.682382,86.746093 0.592448,1.166359\"/><path d=\"M 86.698655,85.064739 V 86.37861\"/><path d=\"m 94.817704,87.389278 -0.656934,1.07805\"/><path d=\"M 100.57852,93.588056 99.399409,94.16077\"/><path d=\"m 102.21244,101.87555 -1.29702,-0.11791\"/><path d=\"m 99.260568,109.843 -1.023429,-0.80854\"/><path d=\"M 86.687254,116.25001 V 114.916\"/>\n</g>\n</g>\n</svg>\n <text class=\"vm-mini-label\" style=\"font-weight:normal;font-size:5.5px;font-family:'Century Gothic';text-anchor:middle;fill:#000000;\" x=\"124.31605\" y=\"161.5\">Value</text>\n <g class=\"vm-sub-dial-needle\" data-vm-needle=\"value\" data-vm-base-angle=\"-37.235121\">\n  <path style=\"fill:#000000;stroke:#000000;stroke-width:0.508865;stroke-linecap:round;\" d=\"m 123.94226,153.8792 12.98547,-9.86906\"/>\n  <circle style=\"fill:#ffffff;stroke:#000000;stroke-width:0.131856;\" cx=\"123.89387\" cy=\"153.76831\" r=\"1.5422727\"/>\n  <circle style=\"fill:#ffffff;stroke:#000000;stroke-width:0.131856;\" cx=\"123.89387\" cy=\"153.76831\" r=\"0.82388818\"/>\n </g>\n</g>\n\n<!-- FRIENDLINESS: reduced slightly, controlled directly in the JS -->\n<g class=\"vm-g8\">\n <svg class=\"vm-mini-dial-bg\" x=\"107.488884\" y=\"136.511704\" width=\"33.820832\" height=\"33.820832\" viewBox=\"142.08125 169.59791 23.905132 23.905132\" preserveAspectRatio=\"none\">\n<circle cx=\"154.03381\" cy=\"181.55048\" r=\"11.952566\" fill=\"#a1a1a1\"/>\n<circle cx=\"154.03381\" cy=\"181.55048\" r=\"1.0901042\" fill=\"#ffffff\" stroke=\"#000000\" stroke-width=\"0.093198\"/>\n<circle cx=\"154.03381\" cy=\"181.55048\" r=\"0.58233804\" fill=\"#ffffff\" stroke=\"#000000\" stroke-width=\"0.093198\"/>\n<g transform=\"matrix(0.7068168,0,0,0.7068168,92.769044,110.40525)\">\n<path d=\"m 86.677017,116.24006 c -8.606938,0 -15.584241,-6.9773 -15.584242,-15.58424 2e-6,-8.606938 6.977304,-15.584239 15.584242,-15.584239 8.606938,-10e-7 15.584243,6.977301 15.584243,15.584239 0,3.42155 -1.10265,6.58556 -2.971975,9.15608\" fill=\"none\" stroke=\"#ffffff\" stroke-width=\"0.3\" stroke-linecap=\"round\"/>\n<g fill=\"#ffffff\" font-family=\"Century Gothic,sans-serif\" font-size=\"2.11667\" font-weight=\"bold\" text-anchor=\"middle\">\n<text x=\"86.672638\" y=\"114.58619\">0</text><text x=\"79.608871\" y=\"112.64206\">1</text><text x=\"74.926537\" y=\"107.46309\">2</text><text x=\"73.271927\" y=\"100.43938\">3</text><text x=\"75.683601\" y=\"93.582016\">4</text><text x=\"80.728996\" y=\"89.738815\">5</text><text x=\"86.65049\" y=\"88.185745\">6</text><text x=\"93.54937\" y=\"90.283485\">7</text><text x=\"98.619057\" y=\"95.377243\">8</text><text x=\"100.05201\" y=\"102.54202\">9</text><text x=\"96.850693\" y=\"109.16269\">10</text>\n</g>\n<g fill=\"#000000\" stroke=\"#ffffff\" stroke-width=\"0.3\" stroke-linecap=\"round\">\n<path d=\"m 78.545917,113.93622 0.67378,-1.12859\"/><path d=\"m 72.76825,107.73744 1.212805,-0.6064\"/><path d=\"m 71.134334,99.416253 1.330717,0.13476\"/><path d=\"m 74.082123,91.499337 1.061204,0.774848\"/><path d=\"m 79.682382,86.746093 0.592448,1.166359\"/><path d=\"M 86.698655,85.064739 V 86.37861\"/><path d=\"m 94.817704,87.389278 -0.656934,1.07805\"/><path d=\"M 100.57852,93.588056 99.399409,94.16077\"/><path d=\"m 102.21244,101.87555 -1.29702,-0.11791\"/><path d=\"m 99.260568,109.843 -1.023429,-0.80854\"/><path d=\"M 86.687254,116.25001 V 114.916\"/>\n</g>\n</g>\n</svg>\n <text class=\"vm-mini-label\" style=\"font-weight:normal;font-size:4.2px !important;line-height:1;font-family:'Century Gothic';text-anchor:middle;fill:#000000;\" x=\"124.31605\" y=\"161.5\">Friendliness</text>\n <g class=\"vm-sub-dial-needle-big\" data-vm-needle=\"friendliness\" data-vm-base-angle=\"-37.235121\">\n  <path style=\"fill:#000000;stroke:#000000;stroke-width:0.508865;stroke-linecap:round;\" d=\"m 123.94226,153.8792 12.98547,-9.86906\"/>\n  <circle style=\"fill:#ffffff;stroke:#000000;stroke-width:0.131856;\" cx=\"123.89387\" cy=\"153.76831\" r=\"1.5422727\"/>\n  <circle style=\"fill:#ffffff;stroke:#000000;stroke-width:0.131856;\" cx=\"123.89387\" cy=\"153.76831\" r=\"0.82388818\"/>\n </g>\n</g>\n\n<!-- LOCATION REEL -->\n<g transform=\"translate(0,3.5)\">\n <foreignObject x=\"137.8\" y=\"121.25021\" width=\"27.2\" height=\"12.798634\">\n  <div xmlns=\"http://www.w3.org/1999/xhtml\" class=\"vm-score-window-wrapper\">\n   <div class=\"vm-location-reel\">\n    <div class=\"vm-digit-window\"><div class=\"vm-digit-reel vm-tens-reel\"></div></div>\n    <div class=\"vm-digit-window\"><div class=\"vm-digit-reel vm-units-reel\"></div></div>\n    <span class=\"vm-location-static\">.</span>\n    <div class=\"vm-digit-window\"><div class=\"vm-digit-reel vm-tenths-reel\"></div></div>\n   </div>\n  </div>\n </foreignObject>\n <text style=\"font-weight:bold;font-size:4.6px;font-family:'Century Gothic';text-anchor:middle;fill:#000000;\" x=\"150.94593\" y=\"138\">Location</text>\n</g>\n\n<!-- MAIN NEEDLE -->\n<g class=\"vm-main-needle-group\" data-vm-needle=\"partyness\">\n <rect style=\"fill:#bebebe;stroke:#000000;stroke-width:0.512163;stroke-linecap:round;\" width=\"3.2357354\" height=\"57.638039\" x=\"175.6566\" y=\"-34.751022\" ry=\"1.7103276\" transform=\"rotate(40.332538)\"/>\n <circle style=\"fill:#ffffff;stroke:#000000;stroke-width:0.5;\" cx=\"123.77471\" cy=\"127.88613\" r=\"5.8483286\"/>\n <circle style=\"fill:#ffffff;stroke:#000000;stroke-width:0.5;\" cx=\"123.77471\" cy=\"127.88613\" r=\"3.1242003\"/>\n</g>\n\n</svg>";

  const VM_NEEDLE_SETTINGS = {
    cleanliness: { settle: 3200, idleDuration: 4500, delay: 3300, wiggle: 0.7 },
    activities: { settle: 3700, idleDuration: 5100, delay: 3800, wiggle: 0.7 },
    value: { settle: 3400, idleDuration: 4800, delay: 3500, wiggle: 0.7 },
    friendliness: { settle: 3900, idleDuration: 5300, delay: 4000, wiggle: 0.7 }
  };

  function scoreFrom(card, key, fallbackKey) {
    let raw = card.getAttribute('data-' + key);
    if (raw === null && fallbackKey) raw = card.getAttribute('data-' + fallbackKey);
    if (raw === null || raw.trim() === '') return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(0, Math.min(10, n)) : 0;
  }

  function addDigit(reel, digit) {
    const span = document.createElement('span');
    span.textContent = String(digit);
    reel.appendChild(span);
  }

  function uniqueSvgIds(svg, index) {
    const map = new Map();

    svg.querySelectorAll('[id]').forEach(el => {
      const oldId = el.id;
      const newId = 'vm-meter-' + index + '-' + oldId;
      map.set(oldId, newId);
      el.id = newId;
    });

    svg.querySelectorAll('*').forEach(el => {
      ['href', 'xlink:href'].forEach(attr => {
        const value = el.getAttribute(attr);
        if (value && value.charAt(0) === '#' && map.has(value.slice(1))) {
          el.setAttribute(attr, '#' + map.get(value.slice(1)));
        }
      });

      ['style', 'fill', 'stroke', 'clip-path', 'filter', 'mask'].forEach(attr => {
        const value = el.getAttribute(attr);
        if (!value) return;

        let updated = value;
        map.forEach((newId, oldId) => {
          updated = updated.replaceAll('url(#' + oldId + ')', 'url(#' + newId + ')');
        });

        if (updated !== value) el.setAttribute(attr, updated);
      });
    });
  }

  // Animate using SVG's own coordinate system and native rotate transform.
  function animateSvgNeedle(needle, startAngle, endAngle, duration, wiggle, idleDelay, idleDuration, cx, cy) {
    let animationFrame = null;
    let idleTimer = null;
    let stopped = false;

    function setAngle(angle) {
      needle.setAttribute('transform', 'rotate(' + angle + ' ' + cx + ' ' + cy + ')');
    }

    function ease(t) {
      return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function move(from, to, time, callback) {
      const startTime = performance.now();

      function frame(now) {
        if (stopped) return;

        const progress = Math.min(1, (now - startTime) / time);
        const eased = ease(progress);

        setAngle(from + (to - from) * eased);

        if (progress < 1) {
          animationFrame = requestAnimationFrame(frame);
        } else {
          animationFrame = null;
          setAngle(to);
          if (callback) callback();
        }
      }

      animationFrame = requestAnimationFrame(frame);
    }

    setAngle(startAngle);

    move(startAngle, endAngle, duration, function () {
      if (!wiggle || stopped) return;

      function idle() {
        if (stopped) return;

        move(endAngle, endAngle + wiggle, idleDuration / 4, function () {
          move(endAngle + wiggle, endAngle - wiggle, idleDuration / 2, function () {
            move(endAngle - wiggle, endAngle, idleDuration / 4, function () {
              idleTimer = window.setTimeout(idle, idleDelay);
            });
          });
        });
      }

      idleTimer = window.setTimeout(idle, idleDelay);
    });

    return function stop() {
      stopped = true;
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      if (idleTimer !== null) window.clearTimeout(idleTimer);
    };
  }

  function buildMeter(card, index) {
    if (card.dataset.vmBuilt === 'v9') return;

    card.dataset.vmBuilt = 'v9';

    const locationScore = scoreFrom(card, 'location', 'score');
    const partyScore = scoreFrom(card, 'partyness', 'score');

    const miniScores = {
      cleanliness: scoreFrom(card, 'cleanliness'),
      activities: scoreFrom(card, 'activities'),
      value: scoreFrom(card, 'value'),
      friendliness: scoreFrom(card, 'friendliness')
    };

    const name = card.dataset.name || 'Hostel';

    card.setAttribute('role', 'img');
    card.setAttribute(
      'aria-label',
      'Vibe meter for ' + name +
      '. Location ' + locationScore.toFixed(1) +
      ' out of 10. Party potential ' + partyScore.toFixed(1) +
      ' out of 10.'
    );

    card.innerHTML = VM_SVG_TEMPLATE;

    const svg = card.querySelector('svg');

    // VIBE-meter logo — tighter line spacing and raised trademark.
    svg.insertAdjacentHTML('beforeend', `
      <g class="vm-logo">
        <text class="vm-logo-top" x="147" y="154">VIBE-</text>
        <text class="vm-logo-bottom" x="147" y="159.2">meter<tspan class="vm-logo-tm" baseline-shift="super" dy="-0.6">TM</tspan></text>
      </g>
    `);

    uniqueSvgIds(svg, index);

    card.vmStartAnimations = function () {
      if (card.dataset.vmAnimationsStarted === 'true') return;
      card.dataset.vmAnimationsStarted = 'true';

      const miniScaleAngles = [
        90.02, 120.53, 149.92, 180.93, 212.76,
        241.42, 269.88, 303.53, 336.15, 368.03, 399.90
      ];

      Object.keys(miniScores).forEach(key => {
        const needle = card.querySelector('[data-vm-needle="' + key + '"]');
        if (!needle) return;

        const settings = VM_NEEDLE_SETTINGS[key];
        const baseAngle = Number(needle.getAttribute('data-vm-base-angle'));

        const score = miniScores[key];
        const wholeScore = Math.floor(score);
        const fraction = score - wholeScore;
        const nextMark = Math.min(10, wholeScore + 1);

        const targetPointerAngle =
          miniScaleAngles[wholeScore] +
          (miniScaleAngles[nextMark] - miniScaleAngles[wholeScore]) * fraction;

        const rotation = targetPointerAngle - baseAngle;

        animateSvgNeedle(
          needle, 0, rotation,
          settings.settle, settings.wiggle,
          settings.delay, settings.idleDuration,
          123.89387, 153.76831
        );
      });

      const mainNeedle = card.querySelector('[data-vm-needle="partyness"]');

      if (mainNeedle) {
        const startAngle = 141.280309;
        const targetAngle = startAngle + partyScore * 27;

        animateSvgNeedle(
          mainNeedle, startAngle, targetAngle,
          5500, 0, 0, 0,
          123.77471, 127.88613
        );
      }
    };

    // Build the three location odometer reels.
    const reels = {
      tens: card.querySelector('.vm-tens-reel'),
      units: card.querySelector('.vm-units-reel'),
      tenths: card.querySelector('.vm-tenths-reel')
    };

    const rowHeight = 12.798634;
    const startValue = 70;
    const targetValue = Math.round(locationScore * 10);
    const direction = targetValue >= startValue ? 1 : -1;
    const steps = Math.abs(targetValue - startValue);

    for (let i = 0; i <= steps; i++) {
      const value = startValue + i * direction;

      addDigit(reels.tens, Math.floor(value / 100));
      addDigit(reels.units, Math.floor(value / 10) % 10);
      addDigit(reels.tenths, value % 10);
    }

    function setPosition(step) {
      const y = -(step * rowHeight);

      Object.values(reels).forEach(reel => {
        reel.style.transform = 'translateY(' + y + 'px)';
      });
    }

    setPosition(0);

    card.vmStartOdometer = function () {
      if (card.dataset.vmStarted === 'true') return;
      card.dataset.vmStarted = 'true';

      if (!steps) return;

      let step = 0;
      const interval = 4000 / steps;

      function advance() {
        step++;
        setPosition(step);

        if (step < steps) {
          window.setTimeout(advance, interval);
        }
      }

      window.setTimeout(advance, interval);
    };
  }

  function initialise() {
    const cards = document.querySelectorAll('.vm-vibe-meter-card');

    cards.forEach((card, index) => buildMeter(card, index));

    if (!('IntersectionObserver' in window)) {
      cards.forEach(card => {
        card.classList.add('vm-in-view');
        if (card.vmStartAnimations) card.vmStartAnimations();
        if (card.vmStartOdometer) card.vmStartOdometer();
      });
      return;
    }

    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight;

    // The central 30% of the screen, calculated in pixels.
    const margin = Math.round(viewportHeight * 0.35);

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add('vm-in-view');

        if (entry.target.vmStartAnimations) {
          entry.target.vmStartAnimations();
        }

        if (entry.target.vmStartOdometer) {
          entry.target.vmStartOdometer();
        }

        obs.unobserve(entry.target);
      });
    }, {
      root: null,
      rootMargin: '-' + margin + 'px 0px -' + margin + 'px 0px',
      threshold: 0
    });

    cards.forEach(card => observer.observe(card));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialise);
  } else {
    initialise();
  }
})();

