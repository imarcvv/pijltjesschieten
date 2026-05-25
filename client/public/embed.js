/**
 * Pijltjesschieten.nl — Embed Script v1.0
 * Usage: <script src="https://pijltjesschieten.nl/embed.js"></script>
 *
 * Injects a fixed overlay with flying paper darts over the host website.
 * Darts are fetched from the Pijltjesschieten API and fly across the screen.
 * Clicking a dart opens a sponsor message in a small popup.
 *
 * Optional config (set before loading the script):
 *   window.PijltjesConfig = {
 *     interval: 8000,       // ms between darts (default: 8000)
 *     maxDarts: 5,          // max simultaneous darts (default: 5)
 *     autoStart: true,      // start automatically (default: true)
 *   };
 */
(function () {
  "use strict";

  // ── Config ────────────────────────────────────────────────────────────────
  const BASE_URL = "https://pijltjesschieten.nl";
  const cfg = (typeof window !== "undefined" && window.PijltjesConfig) || {};
  const INTERVAL    = cfg.interval   ?? 8000;
  const MAX_DARTS   = cfg.maxDarts   ?? 5;
  const AUTO_START  = cfg.autoStart  !== false;

  const DART_IMAGES = [
    BASE_URL + "/manus-storage/pijltjegeel_961740f5.png",
    BASE_URL + "/manus-storage/pijltjeblauw_c47034bc.png",
    BASE_URL + "/manus-storage/pijltjewit_868c31a1.png",
  ];

  // ── State ─────────────────────────────────────────────────────────────────
  let sponsors = [];
  let overlay  = null;
  let popup    = null;
  let timer    = null;
  let activeDarts = 0;

  // ── Fetch sponsors ────────────────────────────────────────────────────────
  function fetchSponsors() {
    fetch(BASE_URL + "/api/embed/sponsors", { mode: "cors" })
      .then(r => r.json())
      .then(data => { sponsors = Array.isArray(data) ? data : []; })
      .catch(() => { sponsors = []; });
  }

  // ── Create overlay ────────────────────────────────────────────────────────
  function createOverlay() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.id = "pijltjes-overlay";
    Object.assign(overlay.style, {
      position:      "fixed",
      top:           "0",
      left:          "0",
      width:         "100vw",
      height:        "100vh",
      pointerEvents: "none",
      zIndex:        "2147483647", // max z-index
      overflow:      "hidden",
    });
    document.body.appendChild(overlay);
  }

  // ── Create popup ──────────────────────────────────────────────────────────
  function createPopup() {
    if (popup) return;
    popup = document.createElement("div");
    popup.id = "pijltjes-popup";
    Object.assign(popup.style, {
      position:     "fixed",
      top:          "50%",
      left:         "50%",
      transform:    "translate(-50%, -50%) scale(0.9)",
      zIndex:       "2147483647",
      background:   "#fff",
      borderRadius: "12px",
      boxShadow:    "0 8px 40px rgba(0,0,0,0.35)",
      padding:      "24px 28px",
      maxWidth:     "340px",
      width:        "90vw",
      fontFamily:   "Verdana, Arial, sans-serif",
      fontSize:     "14px",
      display:      "none",
      opacity:      "0",
      transition:   "opacity 0.2s ease, transform 0.2s ease",
      pointerEvents:"auto",
      textAlign:    "center",
    });

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕";
    Object.assign(closeBtn.style, {
      position:   "absolute",
      top:        "10px",
      right:      "14px",
      background: "none",
      border:     "none",
      fontSize:   "18px",
      cursor:     "pointer",
      color:      "#888",
      lineHeight: "1",
    });
    closeBtn.onclick = closePopup;
    popup.appendChild(closeBtn);

    document.body.appendChild(popup);
  }

  function showPopup(sponsor) {
    if (!popup) createPopup();

    // Clear previous content (keep close button)
    while (popup.children.length > 1) popup.removeChild(popup.lastChild);

    if (sponsor && sponsor.logoUrl) {
      const logo = document.createElement("img");
      logo.src = BASE_URL + sponsor.logoUrl;
      logo.alt = sponsor.name;
      Object.assign(logo.style, {
        maxWidth: "120px", maxHeight: "60px",
        objectFit: "contain", marginBottom: "12px", display: "block", margin: "0 auto 12px",
      });
      popup.appendChild(logo);
    }

    const title = document.createElement("div");
    title.textContent = sponsor ? sponsor.name : "Pijltjesschieten.nl";
    Object.assign(title.style, {
      fontWeight: "bold", fontSize: "16px", marginBottom: "8px",
      color: sponsor ? sponsor.color : "#e63946",
    });
    popup.appendChild(title);

    const msg = document.createElement("div");
    msg.textContent = sponsor ? sponsor.message : "Schiet pijltjes over elke website!";
    Object.assign(msg.style, { color: "#333", marginBottom: "16px", lineHeight: "1.5" });
    popup.appendChild(msg);

    if (sponsor && sponsor.clickUrl) {
      const btn = document.createElement("a");
      btn.href = sponsor.clickUrl;
      btn.target = "_blank";
      btn.rel = "noopener noreferrer";
      btn.textContent = "Meer info →";
      Object.assign(btn.style, {
        display:      "inline-block",
        background:   sponsor.color || "#e63946",
        color:        "#fff",
        padding:      "9px 20px",
        borderRadius: "6px",
        textDecoration:"none",
        fontWeight:   "bold",
        fontSize:     "13px",
      });
      popup.appendChild(btn);
    }

    const brand = document.createElement("div");
    brand.innerHTML = '<a href="https://pijltjesschieten.nl" target="_blank" rel="noopener noreferrer" style="color:#aaa;font-size:11px;text-decoration:none;">pijltjesschieten.nl</a>';
    Object.assign(brand.style, { marginTop: "14px" });
    popup.appendChild(brand);

    popup.style.display = "block";
    requestAnimationFrame(() => {
      popup.style.opacity = "1";
      popup.style.transform = "translate(-50%, -50%) scale(1)";
    });
  }

  function closePopup() {
    if (!popup) return;
    popup.style.opacity = "0";
    popup.style.transform = "translate(-50%, -50%) scale(0.9)";
    setTimeout(() => { if (popup) popup.style.display = "none"; }, 200);
  }

  // ── Fire a single dart ────────────────────────────────────────────────────
  function fireDart() {
    if (!overlay) return;
    if (activeDarts >= MAX_DARTS) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Pick random direction
    const directions = [
      { sx: -0.05, sy: () => 0.15 + Math.random() * 0.7, dx: 1,  dy: 0,    angle: 0,   rtl: false },
      { sx: 1.05,  sy: () => 0.15 + Math.random() * 0.7, dx: -1, dy: 0,    angle: 180, rtl: true  },
      { sx: -0.05, sy: () => Math.random() * 0.35,        dx: 1,  dy: 0.25, angle: 14,  rtl: false },
      { sx: 1.05,  sy: () => Math.random() * 0.35,        dx: -1, dy: 0.25, angle: 166, rtl: true  },
    ];
    const dir = directions[Math.floor(Math.random() * directions.length)];

    const startX = dir.sx * vw;
    const startY = dir.sy() * vh;
    const dartImg = DART_IMAGES[Math.floor(Math.random() * DART_IMAGES.length)];
    const sponsor = sponsors.length > 0 ? sponsors[Math.floor(Math.random() * sponsors.length)] : null;

    const DART_W = 220;
    const DART_H = 38;
    const LOGO_SIZE = Math.round(DART_H * 0.9);
    const GAP = Math.round(DART_H * 0.2);
    const DURATION = 3000; // ms

    // Wrapper div (rotated for direction)
    const wrapper = document.createElement("div");
    Object.assign(wrapper.style, {
      position:        "absolute",
      left:            startX + "px",
      top:             startY + "px",
      transform:       "translate(-50%, -50%) rotate(" + dir.angle + "deg)",
      display:         "flex",
      flexDirection:   "row",
      alignItems:      "center",
      pointerEvents:   "auto",
      cursor:          "pointer",
      userSelect:      "none",
      transition:      "opacity 0.3s",
    });

    // Sponsor logo (counter-rotated so it stays readable)
    if (sponsor && sponsor.logoUrl) {
      const logoWrap = document.createElement("div");
      Object.assign(logoWrap.style, {
        width:        LOGO_SIZE + "px",
        height:       LOGO_SIZE + "px",
        flexShrink:   "0",
        marginRight:  GAP + "px",
        borderRadius: "4px",
        overflow:     "hidden",
        border:       "1.5px solid rgba(200,200,200,0.9)",
        boxShadow:    "0 1px 4px rgba(0,0,0,0.35)",
        background:   "#fff",
        transform:    dir.rtl ? "rotate(-180deg)" : "none",
      });
      const logoImg = document.createElement("img");
      logoImg.src = BASE_URL + sponsor.logoUrl;
      logoImg.alt = sponsor.name;
      Object.assign(logoImg.style, {
        width: "100%", height: "100%", objectFit: "contain", padding: "2px",
        display: "block",
      });
      logoWrap.appendChild(logoImg);
      wrapper.appendChild(logoWrap);
    }

    // Dart image
    const img = document.createElement("img");
    img.src = dartImg;
    img.alt = "pijltje";
    Object.assign(img.style, {
      width:       DART_W + "px",
      height:      DART_H + "px",
      display:     "block",
      userSelect:  "none",
      pointerEvents: "none",
      flexShrink:  "0",
    });
    wrapper.appendChild(img);

    // Click handler
    wrapper.addEventListener("click", function () {
      showPopup(sponsor);
    });

    overlay.appendChild(wrapper);
    activeDarts++;

    // Animate: fly across screen
    const travelDist = Math.sqrt(vw * vw + vh * vh) * 1.1;
    const rad = (dir.angle * Math.PI) / 180;
    const endX = startX + Math.cos(rad) * travelDist * dir.dx;
    const endY = startY + Math.sin(rad) * travelDist * Math.abs(dir.dy) + dir.dy * travelDist;

    let start = null;
    function animate(ts) {
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / DURATION, 1);

      const ease = progress < 0.5
        ? 2 * progress * progress
        : -1 + (4 - 2 * progress) * progress;

      const cx = startX + (endX - startX) * progress;
      const cy = startY + (endY - startY) * progress;

      wrapper.style.left = cx + "px";
      wrapper.style.top  = cy + "px";

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Rest for 8s then fade out
        setTimeout(function () {
          wrapper.style.opacity = "0";
          setTimeout(function () {
            if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
            activeDarts = Math.max(0, activeDarts - 1);
          }, 300);
        }, 8000);
      }
    }
    requestAnimationFrame(animate);
  }

  // ── Start / Stop ──────────────────────────────────────────────────────────
  function start() {
    if (timer) return;
    createOverlay();
    fetchSponsors();
    // Fire first dart after short delay
    setTimeout(fireDart, 1500);
    timer = setInterval(fireDart, INTERVAL);
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  // ── Public API ────────────────────────────────────────────────────────────
  window.Pijltjes = { start, stop, fireDart };

  // ── Auto-start ────────────────────────────────────────────────────────────
  if (AUTO_START) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", start);
    } else {
      start();
    }
  }
})();
