/*!
 * Pijltjesschieten.nl — Embed Script v1.2
 * Usage: <script src="https://pijltjesschieten.nl/embed.js"></script>
 *
 * Injects a fixed overlay with flying paper darts over the host website.
 * Darts are triggered in real-time whenever someone shoots on pijltjesschieten.nl.
 * Clicking a dart opens a sponsor message or inspirational quote popup.
 *
 * Optional config (set before loading the script):
 *   window.PijltjesConfig = {
 *     maxDarts: 5,      // max simultaneous darts on screen (default: 5)
 *     autoStart: true,  // connect to live stream automatically (default: true)
 *   };
 */
(function () {
  "use strict";

  // ── Config ────────────────────────────────────────────────────────────────
  const BASE_URL = "https://pijltjesschieten.nl";
  const cfg = (typeof window !== "undefined" && window.PijltjesConfig) || {};
  const MAX_DARTS  = cfg.maxDarts  ?? 5;
  const AUTO_START = cfg.autoStart !== false;

  const DART_IMAGES = [
    BASE_URL + "/manus-storage/pijltjegeel_961740f5.png",
    BASE_URL + "/manus-storage/pijltjeblauw_c47034bc.png",
    BASE_URL + "/manus-storage/pijltjewit_868c31a1.png",
  ];

  // ── State ─────────────────────────────────────────────────────────────────
  let overlay     = null;
  let popup       = null;
  let evtSource   = null;
  let activeDarts = 0;
  // Queue: darts waiting to be shown when a slot opens up
  let dartQueue   = [];

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
      zIndex:        "2147483647",
      overflow:      "hidden",
    });
    document.body.appendChild(overlay);
  }

  // ── Popup ─────────────────────────────────────────────────────────────────
  function createPopup() {
    if (popup) return;
    popup = document.createElement("div");
    popup.id = "pijltjes-popup";
    Object.assign(popup.style, {
      position:      "fixed",
      top:           "50%",
      left:          "50%",
      transform:     "translate(-50%, -50%) scale(0.9)",
      zIndex:        "2147483647",
      background:    "#fff",
      borderRadius:  "12px",
      boxShadow:     "0 8px 40px rgba(0,0,0,0.35)",
      padding:       "24px 28px",
      maxWidth:      "340px",
      width:         "90vw",
      fontFamily:    "Verdana, Arial, sans-serif",
      fontSize:      "14px",
      display:       "none",
      opacity:       "0",
      transition:    "opacity 0.2s ease, transform 0.2s ease",
      pointerEvents: "auto",
      textAlign:     "center",
    });
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕";
    Object.assign(closeBtn.style, {
      position: "absolute", top: "10px", right: "14px",
      background: "none", border: "none", fontSize: "18px",
      cursor: "pointer", color: "#888", lineHeight: "1",
    });
    closeBtn.onclick = closePopup;
    popup.appendChild(closeBtn);
    document.body.appendChild(popup);
  }

  function showPopup(sponsor, shooterName, quote) {
    if (!popup) createPopup();
    while (popup.children.length > 1) popup.removeChild(popup.lastChild);

    if (quote && quote.text) {
      // ── Quote dart popup ────────────────────────────────────────────────
      popup.style.background = "#EEF2FF";
      popup.style.borderTop = "4px solid #4a7ab5";

      const icon = document.createElement("div");
      icon.textContent = "\uD83D\uDCAC";
      Object.assign(icon.style, { fontSize: "28px", marginBottom: "6px" });
      popup.appendChild(icon);

      const label = document.createElement("div");
      label.textContent = "Inspiratie";
      Object.assign(label.style, {
        fontWeight: "bold", fontSize: "13px", color: "#4a7ab5",
        textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px",
      });
      popup.appendChild(label);

      const openQuote = document.createElement("div");
      openQuote.textContent = "\u201C";
      Object.assign(openQuote.style, {
        fontFamily: "Georgia, serif", fontSize: "52px", color: "#4a7ab5",
        lineHeight: "0.6", marginBottom: "4px", opacity: "0.4",
      });
      popup.appendChild(openQuote);

      const quoteEl = document.createElement("p");
      quoteEl.textContent = quote.text;
      Object.assign(quoteEl.style, {
        fontStyle: "italic", fontSize: "14px", lineHeight: "1.6",
        color: "#1a2a4a", margin: "0 0 10px 0",
      });
      popup.appendChild(quoteEl);

      const authorEl = document.createElement("div");
      authorEl.textContent = "\u2014 " + (quote.author || "");
      Object.assign(authorEl.style, {
        fontWeight: "bold", fontSize: "13px", color: "#4a7ab5",
        textAlign: "right", marginBottom: "10px",
      });
      popup.appendChild(authorEl);

    } else {
      // ── Sponsor dart popup ─────────────────────────────────────────────
      popup.style.background = "#fff";
      popup.style.borderTop = "";

      if (sponsor && sponsor.logoUrl) {
        const logo = document.createElement("img");
        logo.src = sponsor.logoUrl.startsWith("/") ? BASE_URL + sponsor.logoUrl : sponsor.logoUrl;
        logo.alt = sponsor.name || "";
        Object.assign(logo.style, {
          maxWidth: "120px", maxHeight: "60px", objectFit: "contain",
          display: "block", margin: "0 auto 12px",
        });
        popup.appendChild(logo);
      }

      const title = document.createElement("div");
      title.textContent = sponsor ? (sponsor.name || "Sponsor") : "Pijltjesschieten.nl";
      Object.assign(title.style, {
        fontWeight: "bold", fontSize: "16px", marginBottom: "8px",
        color: sponsor ? (sponsor.color || "#e63946") : "#e63946",
      });
      popup.appendChild(title);

      const msg = document.createElement("div");
      msg.textContent = sponsor ? (sponsor.message || "") : "Schiet pijltjes over elke website!";
      Object.assign(msg.style, { color: "#333", marginBottom: "16px", lineHeight: "1.5" });
      popup.appendChild(msg);

      const url = sponsor ? sponsor.clickUrl : null;
      if (url) {
        const btn = document.createElement("a");
        btn.href = url;
        btn.target = "_blank";
        btn.rel = "noopener noreferrer";
        btn.textContent = "Meer info \u2192";
        Object.assign(btn.style, {
          display: "inline-block",
          background: sponsor.color || "#e63946",
          color: "#fff", padding: "9px 20px", borderRadius: "6px",
          textDecoration: "none", fontWeight: "bold", fontSize: "13px",
        });
        popup.appendChild(btn);
      }
    }

    if (shooterName) {
      const shooter = document.createElement("div");
      shooter.textContent = "\uD83C\uDFF9 Dit pijltje is geschoten door: " + shooterName;
      Object.assign(shooter.style, {
        color: "#888", fontSize: "12px", marginTop: "12px", fontStyle: "italic",
      });
      popup.appendChild(shooter);
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

  // ── Queue helpers ─────────────────────────────────────────────────────────
  // Called every time a dart slot is freed — drain the queue if possible
  function drainQueue() {
    while (dartQueue.length > 0 && activeDarts < MAX_DARTS) {
      const next = dartQueue.shift();
      _launchDart(next.sponsor, next.shooterName, next.quote, next.dartVariant);
    }
  }

  // ── Fire a dart (public entry point — queues if busy) ─────────────────────
  function fireDart(sponsor, shooterName, quote, dartVariant) {
    if (!overlay) return;
    if (activeDarts < MAX_DARTS) {
      _launchDart(sponsor, shooterName, quote, dartVariant);
    } else {
      // Queue the dart so it is shown as soon as a slot opens
      dartQueue.push({ sponsor: sponsor, shooterName: shooterName, quote: quote, dartVariant: dartVariant });
    }
  }

  // ── Internal: actually animate a dart across the screen ───────────────────
  function _launchDart(sponsor, shooterName, quote, dartVariant) {
    if (!overlay) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // 8 directions: L→R, R→L, top-L→bottom-R, top-R→bottom-L,
    // plus mid-height diagonals for variety.
    // Each entry: startX/Y (fractions of vw/vh), endX/Y (fractions), rotationDeg
    // Rotation = angle the dart image should face (0 = pointing right)
    var r = Math.random;
    var dirs = [
      // Left → Right (horizontal, random vertical position)
      { x0: -0.05, y0: 0.1 + r() * 0.8,  x1: 1.1,  y1: null,         rot: 0   },
      // Right → Left (horizontal, random vertical position)
      { x0: 1.05,  y0: 0.1 + r() * 0.8,  x1: -0.1, y1: null,         rot: 180 },
      // Top-left → Bottom-right (diagonal ~30°)
      { x0: -0.05, y0: -0.05,             x1: 1.1,  y1: 1.1,          rot: 42  },
      // Top-right → Bottom-left (diagonal ~150°)
      { x0: 1.05,  y0: -0.05,             x1: -0.1, y1: 1.1,          rot: 138 },
      // Top-left → Bottom-right (shallower ~18°)
      { x0: -0.05, y0: 0.1 + r() * 0.3,  x1: 1.1,  y1: 0.6 + r() * 0.4, rot: 18 },
      // Top-right → Bottom-left (shallower ~162°)
      { x0: 1.05,  y0: 0.1 + r() * 0.3,  x1: -0.1, y1: 0.6 + r() * 0.4, rot: 162 },
      // Bottom-left → Top-right (upward diagonal ~-20°)
      { x0: -0.05, y0: 0.6 + r() * 0.3,  x1: 1.1,  y1: 0.1 + r() * 0.3, rot: -20 },
      // Bottom-right → Top-left (upward diagonal ~200°)
      { x0: 1.05,  y0: 0.6 + r() * 0.3,  x1: -0.1, y1: 0.1 + r() * 0.3, rot: 200 },
    ];
    var dir = dirs[Math.floor(Math.random() * dirs.length)];

    var startX = dir.x0 * vw;
    var startY = dir.y0 * vh;
    var endX   = dir.x1 * vw;
    var endY   = (dir.y1 !== null) ? dir.y1 * vh : startY; // horizontal = same Y

    // Use the variant sent by the server (same colour as on the main site), or random fallback
    var imgIdx = (dartVariant === 0 || dartVariant === 1 || dartVariant === 2)
      ? dartVariant
      : Math.floor(Math.random() * DART_IMAGES.length);
    const dartImg  = DART_IMAGES[imgIdx];
    const DART_W   = 220;
    const DART_H   = 38;
    const DURATION = 5500;

    const wrapper = document.createElement("div");
    Object.assign(wrapper.style, {
      position:      "absolute",
      left:          startX + "px",
      top:           startY + "px",
      transform:     "translate(-50%, -50%) rotate(" + dir.rot + "deg)",
      display:       "flex",
      flexDirection: "row",
      alignItems:    "center",
      pointerEvents: "auto",
      cursor:        "pointer",
      userSelect:    "none",
      transition:    "opacity 0.3s",
    });

    const img = document.createElement("img");
    img.src = dartImg;
    img.alt = "pijltje";
    Object.assign(img.style, {
      width: DART_W + "px", height: DART_H + "px",
      display: "block", userSelect: "none",
      pointerEvents: "none", flexShrink: "0",
    });
    wrapper.appendChild(img);

    wrapper.addEventListener("click", function() { showPopup(sponsor, shooterName, quote); });
    overlay.appendChild(wrapper);
    activeDarts++;

    var startTs = null;
    function animate(ts) {
      if (!startTs) startTs = ts;
      var p = Math.min((ts - startTs) / DURATION, 1);
      wrapper.style.left = (startX + (endX - startX) * p) + "px";
      wrapper.style.top  = (startY + (endY - startY) * p) + "px";
      if (p < 1) {
        requestAnimationFrame(animate);
      } else {
        // Dart has left the screen — remove and free the slot
        wrapper.style.opacity = "0";
        setTimeout(function() {
          if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
          activeDarts = Math.max(0, activeDarts - 1);
          drainQueue(); // show next queued dart if any
        }, 300);
      }
    }
    requestAnimationFrame(animate);
  }

  // ── SSE stream connection ─────────────────────────────────────────────────
  function connectStream() {
    if (evtSource) return;
    evtSource = new EventSource(BASE_URL + "/api/embed/stream");

    evtSource.onmessage = function (e) {
      try {
        var payload = JSON.parse(e.data);
        if (payload.type === "connected") {
          // Connection acknowledged — no filtering needed
          return;
        }
        if (payload.type === "site_inactive") {
          // Site is turned off — stop reconnecting to save bandwidth
          evtSource.close();
          evtSource = null;
          // Retry after 10 minutes in case the site is turned back on
          setTimeout(connectStream, 10 * 60 * 1000);
          return;
        }
        if (payload.type === "dart") {
          // Build sponsor object from broadcast payload
          var sponsor = payload.sponsorName ? {
            name:     payload.sponsorName,
            logoUrl:  payload.sponsorLogoUrl  || null,
            color:    payload.sponsorColor    || "#e63946",
            message:  payload.sponsorMessage  || "",
            clickUrl: payload.sponsorClickUrl || null,
          } : null;
          // Build quote object if this is a quote dart
          var quote = (payload.quoteText) ? {
            text:   payload.quoteText,
            author: payload.quoteAuthor || "",
          } : null;
          // Pass dartVariant so embed uses the same colour as the main site
          var dartVariant = (payload.dartVariant === 0 || payload.dartVariant === 1 || payload.dartVariant === 2)
            ? payload.dartVariant : null;
          fireDart(sponsor, payload.shooterName || null, quote, dartVariant);
        }
      } catch (_) { /* ignore parse errors */ }
    };

    evtSource.onerror = function () {
      evtSource.close();
      evtSource = null;
      setTimeout(connectStream, 5000);
    };
  }

  // ── Start ─────────────────────────────────────────────────────────────────
  function start() {
    createOverlay();
    connectStream();
  }

  function stop() {
    if (evtSource) { evtSource.close(); evtSource = null; }
  }

  // ── Public API ────────────────────────────────────────────────────────────
  window.Pijltjes = { start: start, stop: stop, fireDart: fireDart };

  // ── Auto-start ────────────────────────────────────────────────────────────
  if (AUTO_START) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", start);
    } else {
      start();
    }
  }
})();
