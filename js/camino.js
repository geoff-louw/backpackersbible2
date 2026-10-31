/* ============================================================
   BACKPACKERS BIBLE — camino.js
   Camino de Santiago hostel pages only
   (camino-de-santiago, camino-frances, camino-portugues).

   Day flag:
   While the visitor reads through the accommodation, a red tab
   shows which night-stop they are scrolling through ("Start",
   "Day 1", "Day 2" …). It appears when the first heading reaches
   the flag's height and goes again once the last hostel card has
   scrolled past.

   Desktop (>= 1101px): tab on the left edge, 40% down the screen.
   Mobile / tablet:     tab at the top left, below the fixed
                        header. When script-2.js hides the header
                        on scroll-down (#site-header.is-hidden),
                        the tab slides up to the top edge.

   Reads data-label from each ".camino-stop h4", and creates
   the flag itself — no extra markup needed in the page.
   Styles: style-2.css, ".camino-day-flag".
   ============================================================ */

(function () {
    'use strict';

    function onReady(fn) {
        if (document.readyState !== 'loading') {
            fn();
        } else {
            document.addEventListener('DOMContentLoaded', fn);
        }
    }

    onReady(function () {
        var stops = Array.prototype.slice.call(
            document.querySelectorAll('.camino-stop h4[data-label]')
        );
        if (!stops.length) return;

        var cards = document.querySelectorAll('.region-header-section');
        var lastEl = cards.length ? cards[cards.length - 1] : stops[stops.length - 1];

        var flag = document.createElement('div');
        flag.className = 'camino-day-flag';
        flag.setAttribute('aria-hidden', 'true');
        document.body.appendChild(flag);

        var desktop = window.matchMedia('(min-width: 1101px)');
        var header  = document.getElementById('site-header');
        var current = null;
        var ticking = false;

        /* Mobile: follow the header sliding away / back */
        function syncHeader() {
            flag.classList.toggle(
                'is-header-hidden',
                !!header && header.classList.contains('is-hidden')
            );
        }
        if (header && window.MutationObserver) {
            new MutationObserver(syncHeader).observe(header, {
                attributes: true,
                attributeFilter: ['class']
            });
        }
        syncHeader();

        function update() {
            ticking = false;

            /* The height at which the visitor is "reading":
               desktop — the flag's own height (CSS top: 40%);
               mobile  — just below the flag, under the header. */
            var line = desktop.matches
                ? Math.max(window.innerHeight * 0.4, 200)
                : 200;

            var active = null;
            for (var i = 0; i < stops.length; i++) {
                if (stops[i].getBoundingClientRect().top <= line) {
                    active = stops[i];
                } else {
                    break;
                }
            }

            var pastEnd = lastEl.getBoundingClientRect().bottom < line;

            if (!active || pastEnd) {
                flag.classList.remove('is-visible');
                return;
            }

            if (active !== current) {
                flag.textContent = active.getAttribute('data-label');
                current = active;
            }
            flag.classList.add('is-visible');
        }

        function requestUpdate() {
            if (!ticking) {
                ticking = true;
                window.requestAnimationFrame(update);
            }
        }

        window.addEventListener('scroll', requestUpdate, { passive: true });
        window.addEventListener('resize', requestUpdate);
        update();
    });
}());
