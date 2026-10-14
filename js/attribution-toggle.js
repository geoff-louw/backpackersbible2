/* ============================================================
   attribution-toggle.js
   Click the (i) button on a parallax image to fade its
   attribution in or out. Closes on outside click or Escape.
   Uses event delegation, so no per-page setup is needed beyond
   including this file (needs the .attribution-toggle markup and
   the matching CSS in style-2.css).
   ============================================================ */
(function () {
    'use strict';

    function closeAll(except) {
        var open = document.querySelectorAll('.attribution-toggle.is-open');
        for (var i = 0; i < open.length; i++) {
            if (open[i] === except) continue;
            open[i].classList.remove('is-open');
            var b = open[i].querySelector('.attribution-toggle__btn');
            if (b) b.setAttribute('aria-expanded', 'false');
        }
    }

    document.addEventListener('click', function (e) {
        var btn = e.target.closest('.attribution-toggle__btn');

        if (!btn) {
            // Clicks inside an open panel (e.g. on its links) leave it open
            if (!e.target.closest('.attribution-toggle')) closeAll(null);
            return;
        }

        var box = btn.closest('.attribution-toggle');
        var willOpen = !box.classList.contains('is-open');
        closeAll(box);
        box.classList.toggle('is-open', willOpen);
        btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeAll(null);
    });
})();
