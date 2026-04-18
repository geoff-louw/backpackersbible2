let lastScrollTop = 0;
const header = document.getElementById("mainHeader");
const bttButton = document.getElementById("backToTop"); // Add the button variable here

// 1. Mobile Menu Logic
function toggleMobileMenu() {
    var x = document.getElementById("mobile-menu");
    x.classList.toggle("open");
}

// 2. Accordion Logic
function toggleAccordion(element) {
    element.classList.toggle("active");
    var panel = element.nextElementSibling;
    if (panel.style.display === "block") {
        panel.style.display = "none";
    } else {
        panel.style.display = "block";
    }
}



// 4. Back to Top Click Action
if (bttButton) {
    bttButton.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

// 5. Generic Scrollers
function scrollGallery(id, direction) {
    const container = document.getElementById(id);
    const card = container.querySelector('.jump-card');
    if (card) {
        const scrollAmount = card.offsetWidth + 20; 
        if (direction === 'left') {
            container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        } else {
            container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    }
}

function scrollAny(elementId, direction) {
    const container = document.getElementById(elementId);
    const scrollAmount = 330; 
    if (direction === 'left') {
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
}

function scrollHostels(button, direction) {
    const container = button.parentElement.querySelector('.hostel-jump-container');
    const scrollAmount = 250; 
    container.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
}

// 6. Smooth Scroll for Anchor Links (like #safety)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId === '#') return; // Ignore empty hashes
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// 7. Lightbox Controls
function openLightbox(imageSrc) {
    const lightbox = document.getElementById('gallery-lightbox');
    const fullImg = document.getElementById('full-img');
    if (fullImg && lightbox) {
        fullImg.src = imageSrc;
        lightbox.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeLightbox() {
    const lightbox = document.getElementById('gallery-lightbox');
    if (lightbox) {
        lightbox.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

window.onclick = function(event) {
    const lightbox = document.getElementById('gallery-lightbox');
    if (event.target == lightbox) {
        closeLightbox();
    }
}

// 8. Update Hero Image
function updateHero(desktopSrc, mobileSrc, altText) {
    const mainImg = document.getElementById('main-hero-img');
    const mobileSource = document.getElementById('main-mobile-src');
    if (mainImg) {
        mainImg.src = desktopSrc;
        mainImg.alt = altText;
    }
    if (mobileSource) {
        mobileSource.srcset = mobileSrc;
    }
}

// 9. Center Active Hostel Pill
function centerActiveHostel(hostelId) {
    const activePill = document.querySelector(`.hostel-jump-section a[href="#${hostelId}"]`);
    if (activePill) {
        activePill.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center' 
        });
        document.querySelectorAll('.hostel-pill').forEach(p => p.classList.remove('active'));
        activePill.classList.add('active');
    }
}


document.addEventListener("DOMContentLoaded", function() {
    const banner = document.getElementById("cookie-banner");
    const acceptBtn = document.getElementById("accept-cookies");
    const declineBtn = document.getElementById("decline-cookies");

    // 1. Function to load your marketing/tracking scripts
    function loadTrackingScripts() {
        console.log("Loading Analytics and Affiliate tracking...");
        // This is where you will eventually paste your Google Analytics or 
        // Travelpayouts widget scripts.
    }

    // 2. Check if user has already made a choice in the past
    const consent = localStorage.getItem("cookieConsent");

    if (!consent) {
        banner.style.display = "block"; // Show banner to new users
    } else if (consent === "accepted") {
        loadTrackingScripts(); // User already accepted, load scripts immediately
    }

    // 3. Handle the "Accept All" click
    acceptBtn.addEventListener("click", () => {
        localStorage.setItem("cookieConsent", "accepted");
        banner.style.display = "none";
        loadTrackingScripts(); // Start tracking now
    });

    // 4. Handle the "Important Only" (Decline) click
    declineBtn.addEventListener("click", () => {
        localStorage.setItem("cookieConsent", "declined");
        banner.style.display = "none";
        // Do NOT call loadTrackingScripts() here. 
        // Only essential site functions will work.
    });
});


// This assembles the email for EVERY instance of the class after the page loads
const user = "info";
const domain = "backpackersbible.com";
const emailAddr = `${user}@${domain}`;
const contactBoxes = document.querySelectorAll(".contact-link-multi");

contactBoxes.forEach(box => {
    box.innerHTML = `<a href="mailto:${emailAddr}" class="blue-link">${emailAddr}</a>`;
});


function checkMapVisibility() {
    const map = document.getElementById('region-map');
    const fallback = document.getElementById('map-fallback');

    if (map && fallback) {
        // "onLine" must have a capital L
        if (navigator.onLine) {
            map.style.display = 'block';
            fallback.style.display = 'none';
        } else {
            map.style.display = 'none';
            fallback.style.display = 'block';
        }
    }
}

// Listen for connection changes
window.addEventListener('offline', checkMapVisibility);
window.addEventListener('online', checkMapVisibility);

// Run once when the page loads
checkMapVisibility();


function centreJumpMenu() {
  const path = window.location.pathname;
  const filename = path.split('/').pop();
  const container = document.getElementById('top-jump');
  if (!container) return;
  const links = container.querySelectorAll('a.jump-card');
  links.forEach(function(link) {
    if (link.href.includes(filename)) {
      link.scrollIntoView({inline: 'center', block: 'nearest', behavior: 'instant'});
    }
  });
}

document.addEventListener('DOMContentLoaded', centreJumpMenu);



// Read More / Read Less toggle for <details> elements
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('details').forEach(function(details) {
        var summary = details.querySelector('summary');
        if (summary) {
            details.addEventListener('toggle', function() {
                summary.textContent = details.open ? 'Read Less' : 'Read More';
            });
        }
    });
});








// MASTER SCROLL LOGIC: Controls Header, Back-to-Top, and Bottom Menus
window.addEventListener("scroll", function() {
    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Define the elements
    const header = document.getElementById("mainHeader");
    const bttButton = document.getElementById("backToTop");
    const bottomMenu1 = document.getElementById("quick-jump-menu");
    const bottomMenu2 = document.getElementById("top-jump");

    // 1. Hide mobile menu if user starts scrolling
    const mobileMenu = document.getElementById("mobile-menu");
    if (mobileMenu) mobileMenu.classList.remove("open");

    // 2. Handle Sliding (Hide on scroll down, show on scroll up)
    if (scrollTop > lastScrollTop && scrollTop > 150) {
        // SCROLLING DOWN
        if (header) header.style.transform = "translateY(-100%)";
        if (bottomMenu1) bottomMenu1.classList.add("hide-bottom-menu");
        if (bottomMenu2) bottomMenu2.classList.add("hide-bottom-menu");
    } else {
        // SCROLLING UP
        if (header) header.style.transform = "translateY(0)";
        if (bottomMenu1) bottomMenu1.classList.remove("hide-bottom-menu");
        if (bottomMenu2) bottomMenu2.classList.remove("hide-bottom-menu");
    }

    // 3. Handle Back to Top Button Visibility
    if (bttButton) {
        if (scrollTop > 300) {
            bttButton.classList.add("show");
        } else {
            bttButton.classList.remove("show");
        }
    }

    lastScrollTop = scrollTop;
});







// MASTER OFFLINE MAP LOGIC
window.addEventListener('load', function() {
    function updateOnlineStatus() {
        // Find ALL maps and ALL fallbacks on the page
        const liveMaps = document.querySelectorAll('.region-map');
        const fallbackImages = document.querySelectorAll('.map-fallback');

        if (navigator.onLine) {
            // ONLINE: Show all iframes, hide all fallbacks
            liveMaps.forEach(map => map.style.display = 'block');
            fallbackImages.forEach(fallback => fallback.style.display = 'none');
        } else {
            // OFFLINE: Hide all iframes, show all fallbacks
            liveMaps.forEach(map => map.style.display = 'none');
            fallbackImages.forEach(fallback => fallback.style.display = 'block');
        }
    }

    // Listen for connection changes
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Run once when the page loads
    updateOnlineStatus();
});






// --- FIXED SMART JUMP MENU (NO JUMPING) ---
document.addEventListener("DOMContentLoaded", function() {
    const container = document.getElementById('top-jump');
    if (!container) return;

    const links = Array.from(container.querySelectorAll('a.jump-card'));
    
    // Manual centering function that ONLY touches horizontal scroll
    function centerActiveCard(link) {
        if (!link) return;
        
        links.forEach(l => l.classList.remove('jump-card--active'));
        link.classList.add('jump-card--active');
        
        // Calculate the center position manually to avoid vertical page jumping
        const linkOffset = link.offsetLeft;
        const linkWidth = link.offsetWidth;
        const containerWidth = container.offsetWidth;
        const scrollPos = linkOffset - (containerWidth / 2) + (linkWidth / 2);

        container.scrollTo({
            left: scrollPos,
            behavior: 'smooth'
        });
    }

    function checkUrlAndCenter() {
        const currentHash = window.location.hash;
        const filename = window.location.pathname.split('/').pop() || 'index.htm';
        
        let activeLink;
        if (currentHash) {
            activeLink = links.find(l => l.href.includes(currentHash));
        } else {
            activeLink = links.find(l => l.href.includes(filename) && !l.href.includes('#')) 
                      || links.find(l => l.href.includes(filename));
        }
        
        if (activeLink) centerActiveCard(activeLink);
    }

    checkUrlAndCenter();
    // We remove the hashchange listener to prevent "fighting" with manual scrolling
    // window.addEventListener('hashchange', checkUrlAndCenter); 

    const targets = links.map(link => {
        const hashIndex = link.href.indexOf('#');
        if (hashIndex !== -1) {
            const hashId = link.href.substring(hashIndex + 1);
            return document.getElementById(hashId);
        }
        return null;
    }).filter(el => el !== null);

    if (targets.length > 0) {
        const observerOptions = {
            root: null,
            rootMargin: '-25% 0px -70% 0px', // Adjusted to trigger closer to the top
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const activeId = entry.target.id;
                    const activeLink = links.find(l => l.href.includes('#' + activeId));
                    
                    if (activeLink && !activeLink.classList.contains('jump-card--active')) {
                        centerActiveCard(activeLink);
                        // NOTE: We removed history.replaceState here. 
                        // Updating the URL while scrolling is what causes the "Snap Back" in many browsers.
                    }
                }
            });
        }, observerOptions);

        targets.forEach(target => observer.observe(target));
    }
});





























function toggleMobileMenu() {
    const menu = document.getElementById("mobile-menu");
    const desktopSearch = document.querySelector(".search-wrapper"); // Selects your desktop search
    
    if (menu) {
        menu.classList.toggle("open");
        
        if (menu.classList.contains("open")) {
            document.body.style.overflow = "hidden";
            if(desktopSearch) desktopSearch.style.visibility = "hidden";
        } else {
            document.body.style.overflow = "auto";
            if(desktopSearch) desktopSearch.style.visibility = "visible";
        }
    }
}



function toggleMobileMenu() {
    const menu = document.getElementById("mobile-menu");
    if (menu) {
        menu.classList.toggle("open");
        
        // Optional: Prevents the background page from scrolling when menu is open
        if (menu.classList.contains("open")) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }
    }
}


























document.addEventListener("DOMContentLoaded", function() {
  
  // 1. Select the popup container
  const mamaGuide = document.getElementById('mama-africa-guide');

  // 2. Select the *target* section that triggers the popup (e.g., #kruger-itinerary)
  // Make sure you have <section id="kruger-itinerary"> in your HTML where you want her to appear.
  const targetSection = document.getElementById('mama-afrika'); 

  // 3. Define the Observer Logic
  const observer = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach(entry => {
        // If the section is now in view
        if (entry.isIntersecting) {
          mamaGuide.classList.add('active'); // She fades in
          // Option: Stop observing after it fires once
          // observer.unobserve(entry.target);
        } else {
          // Optional: Make her disappear if they scroll back up
          // mamaGuide.classList.remove('active');
        }
      });
    },
    {
      root: null, // Use the browser viewport
      threshold: 0.5 // Trigger when 50% of the target section is visible
    }
  );

  // 4. Start watching the target!
  if (targetSection) {
    observer.observe(targetSection);
  } else {
    console.error("Mama Africa trigger section not found.");
  }
});





const links = document.querySelectorAll('.preview-link');
const previewBox = document.createElement('div');
previewBox.id = 'preview-box';
document.body.appendChild(previewBox);

links.forEach(link => {
    link.addEventListener('mouseenter', (e) => {
        const blurb = link.getAttribute('data-blurb');
        const name = link.getAttribute('data-name');
        const url = link.getAttribute('href');

        previewBox.innerHTML = `
            <h4>${name}</h4>
            <p>${blurb}</p>
            <a href="${url}" class="btn">Read More →</a>
        `;
        previewBox.style.display = 'block';
    });

    link.addEventListener('mousemove', (e) => {
        // Offset the box so it doesn't cover the mouse cursor
        previewBox.style.left = (e.pageX + 15) + 'px';
        previewBox.style.top = (e.pageY + 15) + 'px';
    });

    link.addEventListener('mouseleave', () => {
        previewBox.style.display = 'none';
    });
});