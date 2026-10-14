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
   11. Jump menu — active card centring and hover photos
   12. Map visibility (online/offline)
   13. Cookie consent banner
   14. Read More / Read Less toggle
   15. Mama Africa popup
   16. Preview box (hover blurbs)
   17. Contact email obfuscation
   18.  Map facade (lazy load on mobile)
   19. Things to do map
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