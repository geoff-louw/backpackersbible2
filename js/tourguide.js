/* ============================================================
   tourguide.js — Backpackers Bible scroll-triggered character
   
   The character (#ma) appears when the user scrolls to a trigger
   element, showing a contextual tip and link.

   Page-specific tips are configured via window.BB_TIPS, a small
   inline script on each page. Format:

   <script>
   window.BB_TIPS = [
     {
       trigger: 'tip1',            // id of the element that triggers this tip
       side:    'left',            // 'left' or 'right'
       img:     '/assets/_god_3.png',
       text:    'Tip text here.',
       href:    '/some-page/'
     },
     { trigger: 'tip2', side: 'right', img: '/assets/_god_5.png',
       text: 'Another tip.', href: '/another-page/' }
   ];
   </script>
   <script src="/js/tourguide.js" defer></script>

   Tips are evaluated in array order — the first matching trigger wins.
   ============================================================ */

(function () {

    var m, img, txt, lnk, tout, tin;

    function init() {
        m    = document.getElementById('ma');
        img  = document.getElementById('ma-img');
        txt  = document.getElementById('ma-text');
        lnk  = document.getElementById('ma-link');
        tout = document.getElementById('t-out');
        tin  = document.getElementById('t-in');
        if (!m || !window.BB_TIPS || !window.BB_TIPS.length) return;
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll(); /* run once on load */
    }

    function isOn(id) {
        var el = document.getElementById(id);
        if (!el) return false;
        var rect = el.getBoundingClientRect();
        var started    = rect.top < window.innerHeight * 0.6;
        var stillVisible = rect.top > -1500;
        return started && stillVisible && rect.top !== 0;
    }

    function onScroll() {
        var isMobile = window.innerWidth <= 600;
        var tips = window.BB_TIPS;
        var matched = false;

        for (var i = 0; i < tips.length; i++) {
            if (isOn(tips[i].trigger)) {
                updateMa(tips[i], isMobile);
                matched = true;
                break;
            }
        }

        if (!matched) {
            m.style.opacity = '0';
            m.style.pointerEvents = 'none';
        }
    }

    function updateMa(tip, isMobile) {
        var side = (isMobile && tip.mobileSide) ? tip.mobileSide : tip.side;

        m.style.opacity = '1';
        m.style.pointerEvents = 'auto';
        img.src = tip.img;
        txt.innerHTML = tip.text;
        lnk.href = tip.href;

        if (side === 'left') {
            m.style.flexDirection = 'row';
            m.style.left   = isMobile ? '0' : '50px';
            m.style.right  = 'auto';
            m.style.top    = isMobile ? 'unset' : '50%';
            m.style.bottom = isMobile ? '0' : 'unset';
            tout.style.cssText = 'position:absolute; left:-12px; right:auto; bottom:15px; border-top:10px solid transparent; border-bottom:10px solid transparent; border-right:12px solid #FFD700; border-left:none;';
            tin.style.cssText  = 'position:absolute; left:-9px;  right:auto; bottom:15px; border-top:10px solid transparent; border-bottom:10px solid transparent; border-right:12px solid #000; border-left:none;';
        } else {
            m.style.flexDirection = 'row-reverse';
            m.style.left   = 'auto';
            m.style.right  = isMobile ? '0' : '50px';
            m.style.top    = isMobile ? 'unset' : '50%';
            m.style.bottom = isMobile ? '0' : 'unset';
            tout.style.cssText = 'position:absolute; left:auto; right:-12px; bottom:15px; border-top:10px solid transparent; border-bottom:10px solid transparent; border-left:12px solid #FFD700; border-right:none;';
            tin.style.cssText  = 'position:absolute; left:auto; right:-9px;  bottom:15px; border-top:10px solid transparent; border-bottom:10px solid transparent; border-left:12px solid #000; border-right:none;';
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

}());
