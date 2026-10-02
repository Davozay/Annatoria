/* ============================================================
   ANNATORIA — interactions layer
   Plain JS. No dependencies. Safe alongside Webflow's ix2 bundle.
   ============================================================ */
/* ============================================================
   PUBLIC THEME — pre-paint
   Applies the user's saved choice to <html> before first paint,
   so there's no flash of the wrong colour.
   Skips the admin page (admin manages its own theme).
   ============================================================ */
(function () {
  // Bail out on admin — admin's theme is managed by the prefs panel
  if (document.body && document.body.querySelector("[data-admin-dashboard]"))
    return;
  if (document.querySelector("[data-admin-dashboard]")) return;
  if (document.querySelector("[data-admin-login]")) return;

  var saved = null;
  try {
    saved = localStorage.getItem("anna_public_theme");
  } catch (e) {}
  var root = document.documentElement;
  if (saved === "light") {
    root.classList.remove("anna-public-dark");
    root.classList.add("anna-public-light");
  } else if (saved === "dark") {
    root.classList.remove("anna-public-light");
    root.classList.add("anna-public-dark");
  }
  // If saved is null → neither class → OS media query takes over
})();
/* ----------------------------------------------------------
     15. Public theme toggle
     ---------------------------------------------------------- */
function initPublicTheme() {
  var btn = document.querySelector("[data-theme-toggle]");
  if (!btn) return;

  var root = document.documentElement;
  var STORAGE_KEY = "anna_public_theme";

  function currentTheme() {
    // Resolution order: explicit class > OS preference > dark fallback
    if (root.classList.contains("anna-public-light")) return "light";
    if (root.classList.contains("anna-public-dark")) return "dark";
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }

  function apply(theme) {
    root.classList.toggle("anna-public-light", theme === "light");
    root.classList.toggle("anna-public-dark", theme === "dark");
    btn.setAttribute(
      "aria-label",
      theme === "light" ? "Switch to dark theme" : "Switch to light theme",
    );
    btn.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
  }

  btn.addEventListener("click", function () {
    var next = currentTheme() === "light" ? "dark" : "light";
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (e) {}
    apply(next);
  });

  // If the user hasn't explicitly chosen, react to OS changes live
  var media = window.matchMedia("(prefers-color-scheme: light)");
  var onMediaChange = function () {
    var saved = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch (e) {}
    if (saved) return; // user chose — don't override
    apply(media.matches ? "light" : "dark");
  };
  if (media.addEventListener) media.addEventListener("change", onMediaChange);
  else if (media.addListener) media.addListener(onMediaChange); // Safari < 14

  // Sync aria attributes on load
  apply(currentTheme());
}

(function () {
  "use strict";

  var reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  /* ----------------------------------------------------------
     1. Reveal-on-scroll
     ---------------------------------------------------------- */
  function initReveals() {
    var els = document.querySelectorAll("[data-reveal], [data-stagger]");
    if (!els.length) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      els.forEach(function (el) {
        el.classList.add("is-revealed");
      });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          var delay = parseInt(el.getAttribute("data-delay") || "0", 10);
          setTimeout(function () {
            el.classList.add("is-revealed");
          }, delay);
          io.unobserve(el);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );

    els.forEach(function (el) {
      io.observe(el);
    });

    // Auto-stagger children inside [data-stagger]
    document.querySelectorAll("[data-stagger]").forEach(function (parent) {
      var children = parent.querySelectorAll("[data-reveal-child]");
      children.forEach(function (child, i) {
        child.style.transitionDelay = i * 80 + "ms";
      });
    });
  }

  /* ----------------------------------------------------------
     2. Nav scroll state
     ---------------------------------------------------------- */

  function initNav() {
    var nav = document.querySelector(".ann-side");
    var menuBtn = document.querySelector(".ann-menu-btn");
    if (!nav) return;

    // --- Desktop scroll state: transparent at top, solid once you scroll ---
    var onScroll = function () {
      if (window.scrollY > 24) nav.classList.add("is-scrolled");
      else nav.classList.remove("is-scrolled");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // --- Mobile menu toggle ---
    if (menuBtn) {
      var setOpen = function (open) {
        nav.classList.toggle("is-open", open);
        menuBtn.classList.toggle("is-open", open);
        menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
        menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
        // Lock body scroll while open
        document.body.style.overflow = open ? "hidden" : "";
      };

      menuBtn.addEventListener("click", function () {
        setOpen(!nav.classList.contains("is-open"));
      });

      // Close on link click
      nav
        .querySelectorAll(".ann-side__link, .ann-side__cta")
        .forEach(function (link) {
          link.addEventListener("click", function () {
            setOpen(false);
          });
        });

      // Close on Escape
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && nav.classList.contains("is-open"))
          setOpen(false);
      });

      // Close on resize up to desktop
      window.addEventListener("resize", function () {
        if (window.innerWidth >= 768 && nav.classList.contains("is-open"))
          setOpen(false);
      });
    }

    // --- Highlight the section currently in view (desktop + mobile) ---
    var links = nav.querySelectorAll('.ann-side__link[href^="#"]');
    if (!links.length || !("IntersectionObserver" in window)) return;

    var sections = [];
    links.forEach(function (link) {
      var id = link.getAttribute("href").slice(1);
      var el = document.getElementById(id);
      if (el) sections.push({ link: link, el: el });
    });

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          sections.forEach(function (s) {
            if (s.el === entry.target)
              s.link.setAttribute("aria-current", "page");
            else s.link.removeAttribute("aria-current");
          });
        });
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 },
    );

    sections.forEach(function (s) {
      io.observe(s.el);
    });
  }

  function initBrandLogo() {
    var brand = document.querySelector(".ann-brand-fixed");
    if (!brand) return;
    var onScroll = function () {
      if (window.scrollY > 40) brand.classList.add("is-scrolled");
      else brand.classList.remove("is-scrolled");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ----------------------------------------------------------
     3. Counters (for real numbers only)
     ---------------------------------------------------------- */
  function initCounters() {
    var els = document.querySelectorAll("[data-count]");
    if (!els.length) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      els.forEach(function (el) {
        el.textContent = el.getAttribute("data-count");
      });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          var raw = el.getAttribute("data-count");
          var target = parseFloat(raw.replace(/,/g, ""));
          if (isNaN(target)) {
            el.textContent = raw;
            io.unobserve(el);
            return;
          }
          var suffix = raw.replace(/[\d.,]/g, "");
          var start = performance.now();
          var dur = 1200;
          function tick(now) {
            var t = Math.min((now - start) / dur, 1);
            var eased = 1 - Math.pow(1 - t, 3);
            var v = Math.round(target * eased);
            el.textContent = v.toLocaleString() + suffix;
            if (t < 1) requestAnimationFrame(tick);
            else el.textContent = raw;
          }
          requestAnimationFrame(tick);
          io.unobserve(el);
        });
      },
      { threshold: 0.4 },
    );

    els.forEach(function (el) {
      io.observe(el);
    });
  }

  /* ----------------------------------------------------------
     4. Lightbox
     ---------------------------------------------------------- */
  function initLightbox() {
    var triggers = document.querySelectorAll("[data-lightbox]");
    if (!triggers.length) return;

    var box = document.createElement("div");
    box.className = "ann-lightbox";
    box.innerHTML =
      '<button class="ann-lightbox__close" aria-label="Close">✕</button><img alt="">';
    document.body.appendChild(box);

    var img = box.querySelector("img");
    var close = box.querySelector(".ann-lightbox__close");

    function open(src, alt) {
      img.src = src;
      img.alt = alt || "";
      box.classList.add("is-open");
      document.body.style.overflow = "hidden";
    }
    function closeBox() {
      box.classList.remove("is-open");
      document.body.style.overflow = "";
      setTimeout(function () {
        img.src = "";
      }, 250);
    }

    triggers.forEach(function (t) {
      t.addEventListener("click", function (e) {
        e.preventDefault();
        var inner = t.querySelector("img");
        var src = t.getAttribute("data-lightbox") || (inner && inner.src) || "";
        var alt =
          t.getAttribute("data-lightbox-alt") || (inner && inner.alt) || "";
        if (src) open(src, alt);
      });
    });
    close.addEventListener("click", closeBox);
    box.addEventListener("click", function (e) {
      if (e.target === box) closeBox();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeBox();
    });
  }

  /* ----------------------------------------------------------
     5. Multi-step forms (contact)
     ---------------------------------------------------------- */

  function initMultiStepForms() {
    document.querySelectorAll("[data-multistep]").forEach(function (form) {
      var steps = form.querySelectorAll(".ann-form__step");
      var nextBtns = form.querySelectorAll("[data-next]");
      var prevBtns = form.querySelectorAll("[data-prev]");
      var indicators = document.querySelectorAll("[data-step-indicator]");
      var current = 0;

      function syncIndicators() {
        indicators.forEach(function (el) {
          var n = parseInt(el.getAttribute("data-step-indicator"), 10) - 1;
          el.classList.toggle("is-active", n === current);
          el.classList.toggle("is-done", n < current);
        });
      }

      function show(i, scroll) {
        steps.forEach(function (s, idx) {
          s.classList.toggle("is-active", idx === i);
        });
        current = i;
        syncIndicators();
        if (scroll !== false) {
          form.scrollIntoView({
            behavior: reduceMotion ? "auto" : "smooth",
            block: "start",
          });
        }
      }

      nextBtns.forEach(function (b) {
        b.addEventListener("click", function (e) {
          e.preventDefault();
          var active = steps[current];
          if (active) {
            var valid = true;
            var firstBad = null;
            active
              .querySelectorAll("input, select, textarea")
              .forEach(function (f) {
                if (f.hasAttribute("required") && !f.checkValidity()) {
                  valid = false;
                  if (!firstBad) firstBad = f;
                  f.setAttribute("aria-invalid", "true");
                } else {
                  f.removeAttribute("aria-invalid");
                }
              });
            if (!valid && firstBad) {
              firstBad.reportValidity();
              return;
            }
          }
          if (current < steps.length - 1) show(current + 1);
        });
      });

      prevBtns.forEach(function (b) {
        b.addEventListener("click", function (e) {
          e.preventDefault();
          if (current > 0) show(current - 1);
        });
      });

      show(0, false);
    });
  }

  /* ----------------------------------------------------------
     6. Contact form → Supabase (stub)
     ---------------------------------------------------------- */
  // TODO: replace with real values once Supabase project is ready
  var SUPABASE_URL = "YOUR_SUPABASE_URL";
  var SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

  function initContactForm() {
    var form = document.querySelector("[data-contact-form]");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var status = form.querySelector("[data-form-status]");
      var setStatus = function (msg, kind) {
        if (!status) return;
        status.textContent = msg;
        status.classList.remove("is-error", "is-success");
        if (kind) status.classList.add("is-" + kind);
      };

      setStatus("Sending…", null);

      var fd = new FormData(form);
      var payload = {};
      fd.forEach(function (v, k) {
        // Prefer the specific value if "_other" exists and is filled
        payload[k] = v;
      });

      // If "Other" was chosen, prefer the _other text for the canonical field
      if (payload.booking_type_other && payload.booking_type_other.trim()) {
        payload.booking_type = payload.booking_type_other.trim();
      }
      if (payload.event_type_other && payload.event_type_other.trim()) {
        payload.event_type = payload.event_type_other.trim();
      }
      delete payload.booking_type_other;
      delete payload.event_type_other;

      // Convert numeric fields to numbers for Supabase
      ["budget_usd", "expected_attendance"].forEach(function (k) {
        if (payload[k] != null && payload[k] !== "")
          payload[k] = Number(payload[k]);
      });

      // Add a default status for admin
      payload.status = "new";

      // --- Stub mode ---
      if (SUPABASE_URL.indexOf("YOUR_") === 0) {
        console.log(
          "[Annatoria] Booking payload (Supabase not yet wired):",
          payload,
        );
        setTimeout(function () {
          setStatus(
            "Thank you — your booking request has been received. Team Annatoria will be in touch shortly.",
            "success",
          );
          form.reset();
          var indicators = document.querySelectorAll("[data-step-indicator]");
          indicators.forEach(function (el, i) {
            el.classList.toggle("is-active", i === 0);
            el.classList.remove("is-done");
          });
          var steps = form.querySelectorAll(".ann-form__step");
          steps.forEach(function (s, i) {
            s.classList.toggle("is-active", i === 0);
          });
        }, 600);
        return;
      }

      // --- Live Supabase ---
      fetch(SUPABASE_URL + "/rest/v1/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: "Bearer " + SUPABASE_ANON_KEY,
          Prefer: "return=minimal",
        },
        body: JSON.stringify(payload),
      })
        .then(function (r) {
          if (!r.ok) throw new Error("Request failed");
          setStatus(
            "Thank you — your booking request has been received. Team Annatoria will be in touch shortly.",
            "success",
          );
          form.reset();
        })
        .catch(function () {
          setStatus(
            "Something went wrong. Please email annatoria@gmail.com directly.",
            "error",
          );
        });
    });
  }

  /* ----------------------------------------------------------
     7. Admin dashboard (stub, Supabase-ready)
     ---------------------------------------------------------- */

  function initAdmin() {
    var root = document.querySelector("[data-admin]");
    if (!root) return;

    var login = document.querySelector("[data-admin-login]");
    var dashboard = document.querySelector("[data-admin-dashboard]");
    if (!login || !dashboard) return;

    /* ----------------------------------------------------------
       State
       ---------------------------------------------------------- */
    var state = {
      bookings: [],
      filter: "all",
      query: "",
      activeId: null,
      isStub: SUPABASE_URL.indexOf("YOUR_") === 0,
    };

    /* ----------------------------------------------------------
       Mock data — only shown when Supabase isn't wired yet,
       so you can preview the whole UI. Delete this block once
       your real Supabase project is connected.
       ---------------------------------------------------------- */
    function mockBookings() {
      var now = Date.now();
      var day = 24 * 60 * 60 * 1000;
      return [
        {
          id: "mock-1",
          created_at: new Date(now - 0.2 * day).toISOString(),
          email: "promoter@live-nation.co.uk",
          booking_type: "Performance",
          full_name: "Amara Okafor",
          phone: "+44 7700 900123",
          contact_method: "Email",
          organization: "Live Nation UK",
          website: "https://livenation.co.uk",
          budget_usd: 45000,
          event_name: "O2 Indigo — Winter Sessions",
          event_type: "Conference/Concert",
          event_address: "Peninsula Square, London SE10 0DX, United Kingdom",
          can_commit: "Yes",
          event_date: "2026-12-14",
          start_time: "20:00",
          end_time: "22:30",
          arrival_time: "17:30",
          event_requirements:
            "Full backline, 2× SM58 wireless, soundcheck at 18:00.",
          performance_type: "Annatoria (perform) with Live Performance",
          expected_attendance: 2800,
          other_expectations:
            "Meet & greet with 30 VIP ticket holders after the show.",
          leave_time: "23:30",
          additional_info: "Headline slot. Pre-show press wall from 19:00.",
          status: "new",
          admin_notes: "",
        },
        {
          id: "mock-2",
          created_at: new Date(now - 1.5 * day).toISOString(),
          email: "events@hillsong.com",
          booking_type: "Panel Talk/Speaking Engagement",
          full_name: "David Adeyemi",
          phone: "+234 803 555 0000",
          contact_method: "Phone",
          organization: "Hillsong Africa",
          website: "@hillsongafrica",
          budget_usd: 20000,
          event_name: "Worship Leaders Conference",
          event_type: "Church/Charity",
          event_address: "Lagos, Nigeria",
          can_commit: "Yes",
          event_date: "2026-11-03",
          start_time: "10:00",
          end_time: "13:00",
          arrival_time: "09:00",
          event_requirements:
            "Roundtable panel format, handheld mic, comfort monitor.",
          performance_type: "Annatoria (perform) with Live Interview",
          expected_attendance: 1200,
          other_expectations: "Fire-side chat followed by 3-song acoustic set.",
          leave_time: "14:00",
          additional_info: "Streamed to 12 satellite campuses.",
          status: "read",
          admin_notes: "Strong fit — confirm travel logistics with MD.",
        },
        {
          id: "mock-3",
          created_at: new Date(now - 4 * day).toISOString(),
          email: "booking@bbc.co.uk",
          booking_type: "Performance",
          full_name: "Priya Shah",
          phone: "+44 20 7946 0958",
          contact_method: "Email",
          organization: "BBC Radio 1",
          website: "https://bbc.co.uk/radio1",
          budget_usd: 8000,
          event_name: "Live Lounge Session",
          event_type: "TV/Radio",
          event_address: "Broadcasting House, Portland Place, London W1A 1AA",
          can_commit: "No",
          event_date: "2026-10-20",
          start_time: "13:00",
          end_time: "14:00",
          arrival_time: "11:00",
          event_requirements:
            "Acoustic setup, in-ear monitors, house band available.",
          performance_type: "Annatoria (perform) with Filmed Interview",
          expected_attendance: 40,
          other_expectations: "On-air interview between two songs.",
          leave_time: "15:00",
          additional_info: "",
          status: "declined",
          admin_notes: "Budget below threshold — polite decline sent.",
        },
      ];
    }

    /* ----------------------------------------------------------
       Data layer
       ---------------------------------------------------------- */
    function loadBookings() {
      if (state.isStub) {
        state.bookings = mockBookings();
        render();
        return;
      }

      fetch(SUPABASE_URL + "/rest/v1/bookings?select=*&order=created_at.desc", {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: "Bearer " + SUPABASE_ANON_KEY,
        },
      })
        .then(function (r) {
          return r.json();
        })
        .then(function (rows) {
          state.bookings = Array.isArray(rows) ? rows : [];
          render();
        })
        .catch(function () {
          document.querySelector("[data-admin-rows]").innerHTML =
            '<tr><td colspan="5" class="ann-admin__empty">Could not load bookings. Check Supabase credentials.</td></tr>';
        });
    }

    function updateBooking(id, patch) {
      // Optimistic local update
      var idx = state.bookings.findIndex(function (b) {
        return b.id === id;
      });
      if (idx < 0) return;
      state.bookings[idx] = Object.assign({}, state.bookings[idx], patch);
      render();

      if (state.isStub) return;

      fetch(
        SUPABASE_URL + "/rest/v1/bookings?id=eq." + encodeURIComponent(id),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
            Authorization: "Bearer " + SUPABASE_ANON_KEY,
            Prefer: "return=minimal",
          },
          body: JSON.stringify(patch),
        },
      ).catch(function () {
        console.warn("[Annatoria] Update failed — local state kept.");
      });
    }

    function deleteBooking(id) {
      state.bookings = state.bookings.filter(function (b) {
        return b.id !== id;
      });
      render();
      closeDrawer();

      if (state.isStub) return;

      fetch(
        SUPABASE_URL + "/rest/v1/bookings?id=eq." + encodeURIComponent(id),
        {
          method: "DELETE",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: "Bearer " + SUPABASE_ANON_KEY,
          },
        },
      ).catch(function () {
        console.warn("[Annatoria] Delete failed — local state kept.");
      });
    }

    /* ----------------------------------------------------------
       Rendering
       ---------------------------------------------------------- */
    var rowsEl = root.querySelector("[data-admin-rows]");
    var summaryEl = root.querySelector("[data-admin-summary]");
    var searchEl = root.querySelector("[data-admin-search]");

    function fmtDate(iso) {
      if (!iso) return "—";
      var d = new Date(iso);
      return (
        d.toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        }) +
        " · " +
        d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
      );
    }

    function escape(s) {
      if (s == null) return "";
      return String(s).replace(/[&<>"']/g, function (c) {
        return {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[c];
      });
    }

    function filtered() {
      var q = state.query.trim().toLowerCase();
      return state.bookings.filter(function (b) {
        if (state.filter !== "all" && (b.status || "new") !== state.filter)
          return false;
        if (!q) return true;
        var hay = [
          b.full_name,
          b.email,
          b.event_name,
          b.organization,
          b.event_address,
          b.phone,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.indexOf(q) !== -1;
      });
    }

    function renderCounts() {
      var counts = {
        all: state.bookings.length,
        new: 0,
        read: 0,
        accepted: 0,
        declined: 0,
      };
      state.bookings.forEach(function (b) {
        var s = b.status || "new";
        if (counts[s] != null) counts[s]++;
      });
      Object.keys(counts).forEach(function (k) {
        var el = root.querySelector("[data-count-" + k + "]");
        if (el) el.textContent = counts[k];
      });
    }

    function render() {
      renderCounts();

      var list = filtered();
      var total = state.bookings.length;

      summaryEl.textContent =
        total === 0
          ? "No bookings yet."
          : total +
            " booking" +
            (total === 1 ? "" : "s") +
            " · " +
            list.length +
            " shown";

      if (!list.length) {
        rowsEl.innerHTML =
          '<tr><td colspan="5" class="ann-admin__empty">' +
          (total === 0
            ? "No bookings yet. Submissions from the booking form will appear here."
            : "No bookings match your filters.") +
          "</td></tr>";
        return;
      }

      rowsEl.innerHTML = list
        .map(function (b) {
          var status = b.status || "new";
          return (
            '<tr data-id="' +
            escape(b.id) +
            '">' +
            '<td data-label="Received" class="ann-admin__date">' +
            escape(fmtDate(b.created_at)) +
            "</td>" +
            '<td data-label="Name">' +
            '<div class="ann-admin__name">' +
            escape(b.full_name || "—") +
            "</div>" +
            '<div class="ann-admin__email">' +
            escape(b.email || "") +
            "</div>" +
            "</td>" +
            '<td data-label="Event">' +
            "<div>" +
            escape(b.event_name || "—") +
            "</div>" +
            '<div class="ann-admin__email">' +
            escape(b.event_type || "") +
            "</div>" +
            "</td>" +
            '<td data-label="Status">' +
            '<span class="ann-admin__status" data-status="' +
            escape(status) +
            '">' +
            escape(status.charAt(0).toUpperCase() + status.slice(1)) +
            "</span>" +
            "</td>" +
            '<td data-label="Actions" style="text-align: right;">' +
            '<span class="ann-admin__row-actions">' +
            '<button class="ann-admin__icon-btn" data-open aria-label="Open">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/>' +
            '<circle cx="12" cy="12" r="3"/>' +
            "</svg>" +
            "</button>" +
            '<button class="ann-admin__icon-btn is-danger" data-delete aria-label="Delete">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke-linecap="round"/>' +
            "</svg>" +
            "</button>" +
            "</span>" +
            "</td>" +
            "</tr>"
          );
        })
        .join("");

      // Row handlers
      rowsEl.querySelectorAll("tr[data-id]").forEach(function (tr) {
        var id = tr.getAttribute("data-id");
        tr.addEventListener("click", function (e) {
          if (e.target.closest("[data-delete]")) {
            e.stopPropagation();
            askDelete(id);
            return;
          }
          openDrawer(id);
        });
      });
    }

    /* ----------------------------------------------------------
       Drawer
       ---------------------------------------------------------- */
    var drawer = root.querySelector("[data-drawer]");
    var drawerBody = root.querySelector("[data-drawer-body]");
    var drawerTitle = root.querySelector("[data-drawer-title]");
    var drawerSub = root.querySelector("[data-drawer-subtitle]");
    var backdrop = root.querySelector(".ann-drawer-backdrop");

    function row(label, value, isLink) {
      if (value == null || value === "") value = "—";
      var v =
        isLink && value !== "—"
          ? '<a href="' +
            escape(value) +
            '" target="_blank" rel="noopener">' +
            escape(value) +
            "</a>"
          : escape(value);
      return (
        '<div class="ann-drawer__row"><dt>' +
        escape(label) +
        "</dt><dd>" +
        v +
        "</dd></div>"
      );
    }

    function group(title, rows) {
      return (
        '<div class="ann-drawer__group">' +
        '<div class="ann-drawer__group-title">' +
        escape(title) +
        "</div>" +
        '<div class="ann-drawer__rows">' +
        rows +
        "</div>" +
        "</div>"
      );
    }

    function openDrawer(id) {
      var b = state.bookings.find(function (x) {
        return x.id === id;
      });
      if (!b) return;
      state.activeId = id;

      drawerTitle.textContent = b.full_name || "Booking";
      drawerSub.textContent =
        (b.organization ? b.organization + " · " : "") + fmtDate(b.created_at);

      var status = b.status || "new";

      // ---- Accordion item builder ----
      // Returns the markup for a single collapsible section.
      function acc(title, bodyHtml, opts) {
        opts = opts || {};
        var open = opts.open ? " is-open" : "";
        var bodyStyle = opts.open ? ' style="max-height: 2000px;"' : "";
        return (
          "" +
          '<div class="ann-acc__item' +
          open +
          '">' +
          '<button type="button" class="ann-acc__header" aria-expanded="' +
          (opts.open ? "true" : "false") +
          '">' +
          '<span class="ann-acc__title">' +
          escape(title) +
          "</span>" +
          '<svg class="ann-acc__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="m6 9 6 6 6-6"/>' +
          "</svg>" +
          "</button>" +
          '<div class="ann-acc__body"' +
          bodyStyle +
          ">" +
          '<div class="ann-acc__body-inner">' +
          bodyHtml +
          "</div>" +
          "</div>" +
          "</div>"
        );
      }

      // ---- Section bodies ----
      var statusBody =
        '<div class="ann-acc__status">' +
        '<div class="ann-drawer__status-row">' +
        ["new", "read", "accepted", "declined"]
          .map(function (s) {
            return (
              '<button type="button" class="ann-drawer__status-btn' +
              (s === status ? " is-active" : "") +
              '" ' +
              'data-set-status="' +
              s +
              '">' +
              s.charAt(0).toUpperCase() +
              s.slice(1) +
              "</button>"
            );
          })
          .join("") +
        "</div>" +
        "</div>";

      var contactBody = [
        row("Full name", b.full_name),
        row("Email", b.email, true),
        row("Phone", b.phone),
        row("Preferred contact", b.contact_method),
        row("Organization", b.organization),
        row("Website / social", b.website, true),
      ].join("");

      var bookingBody = [
        row("Booking for", b.booking_type),
        row(
          "Budget (USD)",
          b.budget_usd != null
            ? "$" + Number(b.budget_usd).toLocaleString()
            : null,
        ),
        row("Performance type", b.performance_type),
      ].join("");

      var eventBody = [
        row("Event name", b.event_name),
        row("Type", b.event_type),
        row("Location", b.event_address),
        row(
          "Expected attendance",
          b.expected_attendance != null
            ? Number(b.expected_attendance).toLocaleString()
            : null,
        ),
        row("Can commit to travel terms", b.can_commit),
      ].join("");

      var scheduleBody = [
        row("Event date", b.event_date),
        row("Start time", b.start_time),
        row("End time", b.end_time),
        row("Arrival time", b.arrival_time),
        row("Suitable leave time", b.leave_time),
      ].join("");

      var requirementsBody = [
        row("Event requirements", b.event_requirements),
        row("Other expectations", b.other_expectations),
        row("Additional info", b.additional_info),
      ].join("");

      var notesBody =
        '<div class="ann-acc__notes">' +
        '<textarea class="ann-drawer__notes" data-notes>' +
        escape(b.admin_notes || "") +
        "</textarea>" +
        '<div class="ann-drawer__notes-actions">' +
        '<button type="button" class="ann-btn" data-save-notes>Save notes</button>' +
        "</div>" +
        "</div>";

      // ---- Compose ----
      // Status is open by default (most useful). Everything else collapsed.
      var html =
        '<div class="ann-acc">' +
        acc("Status", statusBody, { open: true }) +
        acc("Contact", contactBody) +
        acc("Booking request", bookingBody) +
        acc("Event", eventBody) +
        acc("Schedule", scheduleBody) +
        acc("Requirements & notes", requirementsBody) +
        acc("Internal notes", notesBody) +
        "</div>";

      drawerBody.innerHTML = html;

      // ---- Wire accordion toggle ----
      drawerBody.querySelectorAll(".ann-acc__header").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var item = btn.closest(".ann-acc__item");
          var body = item.querySelector(".ann-acc__body");
          var isOpen = item.classList.toggle("is-open");
          btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
          // Measure scrollHeight for a smooth animated expand/collapse
          if (isOpen) {
            body.style.maxHeight = body.scrollHeight + "px";
          } else {
            // Set explicit current height so the transition has a starting value
            body.style.maxHeight = body.scrollHeight + "px";
            requestAnimationFrame(function () {
              body.style.maxHeight = "0px";
            });
          }
        });
      });

      // ---- Status buttons ----
      drawerBody.querySelectorAll("[data-set-status]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var s = btn.getAttribute("data-set-status");
          updateBooking(id, { status: s });
          openDrawer(id); // re-render, keeps Status open
        });
      });

      // ---- Save notes ----
      var notesEl = drawerBody.querySelector("[data-notes]");
      var saveBtn = drawerBody.querySelector("[data-save-notes]");
      if (saveBtn && notesEl) {
        saveBtn.addEventListener("click", function () {
          updateBooking(id, { admin_notes: notesEl.value });
          saveBtn.textContent = "Saved ✓";
          setTimeout(function () {
            saveBtn.textContent = "Save notes";
          }, 1200);
        });
      }

      lockPageScroll();
      drawer.classList.add("is-open");
      drawer.setAttribute("aria-hidden", "false");
      backdrop.classList.add("is-open");
      drawerBody.scrollTop = 0;
    }

    function closeDrawer() {
      if (document.activeElement && drawer.contains(document.activeElement)) {
        document.activeElement.blur();
      }

      drawer.classList.remove("is-open");
      drawer.setAttribute("aria-hidden", "true");
      backdrop.classList.remove("is-open");
      unlockPageScroll();
      state.activeId = null;
    }

    // ---- NEW: scroll-lock helpers ----
    var scrollLockY = 0;
    var scrollLocked = false;
    function lockPageScroll() {
      if (scrollLocked) return;
      scrollLocked = true;
      scrollLockY = window.scrollY || window.pageYOffset || 0;
      document.documentElement.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = -scrollLockY + "px";
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
    }
    function unlockPageScroll() {
      if (!scrollLocked) return;
      scrollLocked = false;
      document.documentElement.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      window.scrollTo(0, scrollLockY);
    }

    // ---- NEW: block wheel/touch events outside the drawer body ----
    // This prevents overscroll from bubbling to the page on the drawer edges.
    document.addEventListener(
      "wheel",
      function (e) {
        if (!drawer.classList.contains("is-open")) return;
        if (!drawerBody.contains(e.target)) {
          e.preventDefault();
        }
      },
      { passive: false },
    );

    document.addEventListener(
      "touchmove",
      function (e) {
        if (!drawer.classList.contains("is-open")) return;
        if (!drawerBody.contains(e.target)) {
          e.preventDefault();
        }
      },
      { passive: false },
    );

    root.querySelectorAll("[data-drawer-close]").forEach(function (el) {
      el.addEventListener("click", closeDrawer);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && drawer.classList.contains("is-open"))
        closeDrawer();
    });

    /* ----------------------------------------------------------
       Delete confirm
       ---------------------------------------------------------- */
    var confirmModal = root.querySelector("[data-confirm]");
    var pendingDeleteId = null;

    function askDelete(id) {
      pendingDeleteId = id;
      confirmModal.classList.add("is-open");
    }
    confirmModal
      .querySelector("[data-confirm-cancel]")
      .addEventListener("click", function () {
        pendingDeleteId = null;
        confirmModal.classList.remove("is-open");
      });
    confirmModal
      .querySelector("[data-confirm-ok]")
      .addEventListener("click", function () {
        if (pendingDeleteId) deleteBooking(pendingDeleteId);
        pendingDeleteId = null;
        confirmModal.classList.remove("is-open");
      });

    root
      .querySelector("[data-drawer-delete]")
      .addEventListener("click", function () {
        if (state.activeId) askDelete(state.activeId);
      });

    /* ----------------------------------------------------------
       Filters + search
       ---------------------------------------------------------- */
    root
      .querySelectorAll("[data-admin-filters] [data-filter]")
      .forEach(function (btn) {
        btn.addEventListener("click", function () {
          root
            .querySelectorAll("[data-admin-filters] [data-filter]")
            .forEach(function (b) {
              b.classList.toggle("is-active", b === btn);
            });
          state.filter = btn.getAttribute("data-filter");
          render();
        });
      });

    if (searchEl) {
      searchEl.addEventListener("input", function () {
        state.query = searchEl.value;
        render();
      });
    }

    /* ----------------------------------------------------------
       Login gate
       ---------------------------------------------------------- */
    login.querySelector("form").addEventListener("submit", function (e) {
      e.preventDefault();
      var err = login.querySelector("[data-login-error]");
      err.textContent = "";

      var email = login.querySelector('input[type="email"]').value.trim();
      var pass = login.querySelector('input[type="password"]').value;

      if (!email || !pass) {
        err.textContent = "Please enter both email and password.";
        return;
      }

      // TODO: replace with Supabase Auth once your project is ready:
      //   supabase.auth.signInWithPassword({ email, password })
      // For now, any credentials unlock the stub dashboard.

      login.classList.add("ann-hidden");
      dashboard.classList.remove("ann-hidden");
      loadBookings();
    });

    root
      .querySelector("[data-admin-logout]")
      .addEventListener("click", function () {
        // TODO: supabase.auth.signOut()
        dashboard.classList.add("ann-hidden");
        login.classList.remove("ann-hidden");
        login.querySelector("form").reset();
      });

    root
      .querySelector("[data-admin-refresh]")
      .addEventListener("click", function () {
        loadBookings();
      });
  }

  /* ----------------------------------------------------------
     11. Admin customization preferences
     ---------------------------------------------------------- */
  function initAdminPrefs() {
    var prefsPanel = document.querySelector("[data-prefs]");
    var prefsOpen = document.querySelector("[data-prefs-open]");
    var prefsBack = document.querySelector("[data-prefs-backdrop]");
    if (!prefsPanel) return;

    var STORAGE_KEY = "anna_admin_prefs";
    var defaults = {
      accent: "#e8b04b",
      theme: "dark",
      density: "comfortable",
      corners: "rounded",
      name: "Team Annatoria",
      // avatar: "👑",
      sound: false,
      // park: false,
    };

    var prefs = Object.assign({}, defaults);
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      prefs = Object.assign(prefs, saved);
    } catch (e) {
      /* noop */
    }

    function syncThemeSwitch(theme) {
      if (!themeSwitch) return;
      // "light" = checked (sun). "dark" and "dim" = unchecked (moon).
      themeSwitch.checked = theme === "light";
      if (themeLabel) {
        themeLabel.textContent =
          theme === "light" ? "Light" : theme === "dim" ? "Dim" : "Dark";
      }
    }

    function apply(p) {
      var root = document.documentElement;
      root.style.setProperty("--anna-accent", p.accent);

      // Theme
      document.body.classList.remove("anna-theme-dim", "anna-theme-light");
      if (p.theme === "dim") document.body.classList.add("anna-theme-dim");
      if (p.theme === "light") document.body.classList.add("anna-theme-light");

      // Density
      document.body.classList.remove(
        "anna-density-compact",
        "anna-density-comfortable",
        "anna-density-spacious",
      );
      document.body.classList.add("anna-density-" + p.density);

      // Corners
      document.body.classList.remove(
        "anna-corners-sharp",
        "anna-corners-rounded",
        "anna-corners-soft",
      );
      document.body.classList.add("anna-corners-" + p.corners);

      // Name + avatar
      var titleEl = document.querySelector("[data-prefs-title]");
      var avatarEl = document.querySelector("[data-prefs-avatar]");
      if (titleEl) titleEl.textContent = p.name;
      if (avatarEl) avatarEl.textContent = p.avatar;

      // Reflect in panel UI
      document
        .querySelectorAll("[data-prefs-swatches] .ann-swatch")
        .forEach(function (s) {
          s.classList.toggle(
            "is-active",
            s.getAttribute("data-accent") === p.accent,
          );
        });
      syncThemeSwitch(p.theme);
      document
        .querySelectorAll("[data-prefs-density] .ann-pref-option")
        .forEach(function (s) {
          s.classList.toggle(
            "is-active",
            s.getAttribute("data-density") === p.density,
          );
        });
      document
        .querySelectorAll("[data-prefs-corners] .ann-pref-option")
        .forEach(function (s) {
          s.classList.toggle(
            "is-active",
            s.getAttribute("data-corners") === p.corners,
          );
        });
      var nameInput = document.querySelector("[data-prefs-name-input]");
      var avatarInput = document.querySelector("[data-prefs-avatar-input]");
      var soundInput = document.querySelector("[data-prefs-sound]");
      if (nameInput) nameInput.value = p.name;
      if (avatarInput) avatarInput.value = p.avatar;
      if (soundInput) soundInput.checked = !!p.sound;
    }

    function save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
      } catch (e) {}
    }

    function set(key, value) {
      prefs[key] = value;
      apply(prefs);
      save();
      blip();
    }

    // --- Sound ---
    var audioCtx = null;
    function blip() {
      if (!prefs.sound) return;
      try {
        audioCtx =
          audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        var o = audioCtx.createOscillator();
        var g = audioCtx.createGain();
        o.frequency.value = 880;
        o.type = "sine";
        g.gain.value = 0.04;
        o.connect(g);
        g.connect(audioCtx.destination);
        o.start();
        setTimeout(function () {
          o.stop();
        }, 60);
      } catch (e) {}
    }

    // --- Open/close panel ---
    function openPanel() {
      prefsPanel.classList.add("is-open");
      prefsPanel.setAttribute("aria-hidden", "false");
      if (prefsBack) prefsBack.classList.add("is-open");
    }
    function closePanel() {
      if (
        document.activeElement &&
        prefsPanel.contains(document.activeElement)
      ) {
        document.activeElement.blur();
      }
      prefsPanel.classList.remove("is-open");
      prefsPanel.setAttribute("aria-hidden", "true");
      if (prefsBack) prefsBack.classList.remove("is-open");
    }
    if (prefsOpen) prefsOpen.addEventListener("click", openPanel);
    document.querySelectorAll("[data-prefs-close]").forEach(function (el) {
      el.addEventListener("click", closePanel);
    });
    if (prefsBack) prefsBack.addEventListener("click", closePanel);

    // Keyboard shortcut
    document.addEventListener("keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        prefsPanel.classList.contains("is-open") ? closePanel() : openPanel();
      }
      if (e.key === "Escape" && prefsPanel.classList.contains("is-open"))
        closePanel();
    });

    // --- Wiring ---
    document
      .querySelectorAll("[data-prefs-swatches] .ann-swatch")
      .forEach(function (s) {
        s.addEventListener("click", function () {
          set("accent", s.getAttribute("data-accent"));
        });
      });
    // --- Theme toggle (binary) ---
    var themeSwitch = document.querySelector("[data-theme-switch]");
    var themeLabel = document.querySelector("[data-theme-switch-label]");

    if (themeSwitch) {
      themeSwitch.addEventListener("change", function () {
        set("theme", themeSwitch.checked ? "light" : "dark");
      });
    }

    // Dim button (optional preset)
    document
      .querySelectorAll("[data-prefs-dim] .ann-pref-option")
      .forEach(function (s) {
        s.addEventListener("click", function () {
          var next = prefs.theme === "dim" ? "dark" : "dim";
          set("theme", next);
        });
      });
    document
      .querySelectorAll("[data-prefs-density] .ann-pref-option")
      .forEach(function (s) {
        s.addEventListener("click", function () {
          set("density", s.getAttribute("data-density"));
        });
      });
    document
      .querySelectorAll("[data-prefs-corners] .ann-pref-option")
      .forEach(function (s) {
        s.addEventListener("click", function () {
          set("corners", s.getAttribute("data-corners"));
        });
      });
    var nameInput = document.querySelector("[data-prefs-name-input]");
    var avatarInput = document.querySelector("[data-prefs-avatar-input]");
    var soundInput = document.querySelector("[data-prefs-sound]");
    if (nameInput)
      nameInput.addEventListener("input", function () {
        set("name", nameInput.value || "Team Annatoria");
      });
    // if (avatarInput)
    //   avatarInput.addEventListener("input", function () {
    //     set("avatar", avatarInput.value || "👑");
    //   });
    if (soundInput)
      soundInput.addEventListener("change", function () {
        set("sound", soundInput.checked);
      });

    document
      .querySelector("[data-prefs-reset]")
      .addEventListener("click", function () {
        prefs = Object.assign({}, defaults);
        apply(prefs);
        save();
        blip();
      });

    apply(prefs);
  }

  /* ----------------------------------------------------------
     12. Admin analytics
     ---------------------------------------------------------- */
  function initAnalytics() {
    var content = document.querySelector("[data-analytics-content]");
    if (!content) return;

    var rangeBtns = document.querySelectorAll("[data-analytics-range] button");
    var range = "7d";

    function fmt(n) {
      if (n == null) return "—";
      if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
      if (n >= 1e3) return (n / 1e3).toFixed(n >= 10000 ? 0 : 1) + "K";
      return Number(n).toLocaleString();
    }

    function esc(s) {
      return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
        return {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[c];
      });
    }

    // ---- SVG bar chart ----
    function barChart(labels, values, highlightLast) {
      var w = 480,
        h = 140,
        pad = { t: 12, r: 8, b: 28, l: 8 };
      var iw = w - pad.l - pad.r,
        ih = h - pad.t - pad.b;
      var max = Math.max.apply(null, values);
      var min = Math.min.apply(null, values);
      var span = max - min || 1;
      var n = values.length;
      var gap = 8;
      var bw = (iw - gap * (n - 1)) / n;

      var bars = values
        .map(function (v, i) {
          var norm = (v - min) / span;
          var bh = 8 + norm * (ih - 8);
          var x = pad.l + i * (bw + gap);
          var y = pad.t + ih - bh;
          var cls =
            "ann-chart__bar" + (highlightLast && i === n - 1 ? " is-last" : "");
          return (
            '<rect class="' +
            cls +
            '" x="' +
            x.toFixed(1) +
            '" y="' +
            y.toFixed(1) +
            '" width="' +
            bw.toFixed(1) +
            '" height="' +
            bh.toFixed(1) +
            '" rx="3">' +
            "<title>" +
            esc(labels[i]) +
            ": " +
            esc(fmt(v)) +
            "</title></rect>"
          );
        })
        .join("");

      var axis =
        '<line class="ann-chart__axis" x1="' +
        pad.l +
        '" y1="' +
        (pad.t + ih) +
        '" x2="' +
        (pad.l + iw) +
        '" y2="' +
        (pad.t + ih) +
        '"/>';

      var labelEls = labels
        .map(function (lab, i) {
          var x = pad.l + i * (bw + gap) + bw / 2;
          return (
            '<text class="ann-chart__label" x="' +
            x.toFixed(1) +
            '" y="' +
            (h - 6) +
            '" text-anchor="middle">' +
            esc(lab) +
            "</text>"
          );
        })
        .join("");

      return (
        '<svg class="ann-chart" viewBox="0 0 ' +
        w +
        " " +
        h +
        '" preserveAspectRatio="none">' +
        axis +
        bars +
        labelEls +
        "</svg>"
      );
    }

    // ---- SVG line chart ----
    function lineChart(labels, values) {
      var w = 480,
        h = 140,
        pad = { t: 12, r: 12, b: 28, l: 12 };
      var iw = w - pad.l - pad.r,
        ih = h - pad.t - pad.b;
      var max = Math.max.apply(null, values);
      var min = Math.min.apply(null, values);
      var span = max - min || 1;
      var n = values.length;
      var step = iw / (n - 1 || 1);

      var pts = values.map(function (v, i) {
        var x = pad.l + i * step;
        var y = pad.t + ih - ((v - min) / span) * ih;
        return [x, y];
      });

      var d = pts
        .map(function (p, i) {
          return (
            (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1)
          );
        })
        .join(" ");

      var dots = pts
        .map(function (p, i) {
          return (
            '<circle class="ann-chart__dot" cx="' +
            p[0].toFixed(1) +
            '" cy="' +
            p[1].toFixed(1) +
            '" r="3">' +
            "<title>" +
            esc(labels[i]) +
            ": " +
            esc(fmt(values[i])) +
            "</title></circle>"
          );
        })
        .join("");

      var axis =
        '<line class="ann-chart__axis" x1="' +
        pad.l +
        '" y1="' +
        (pad.t + ih) +
        '" x2="' +
        (pad.l + iw) +
        '" y2="' +
        (pad.t + ih) +
        '"/>';

      var labelEls = labels
        .map(function (lab, i) {
          var x = pad.l + i * step;
          return (
            '<text class="ann-chart__label" x="' +
            x.toFixed(1) +
            '" y="' +
            (h - 6) +
            '" text-anchor="middle">' +
            esc(lab) +
            "</text>"
          );
        })
        .join("");

      return (
        '<svg class="ann-chart" viewBox="0 0 ' +
        w +
        " " +
        h +
        '" preserveAspectRatio="none">' +
        axis +
        '<path class="ann-chart__line" d="' +
        d +
        '"/>' +
        dots +
        labelEls +
        "</svg>"
      );
    }

    // ---- Platform card ----
    function platformCard(key, p) {
      var trend = p.trend === "down" ? "down" : "up";
      var deltaPct = p.followers_delta_pct;
      var deltaClass = deltaPct < 0 ? " is-negative" : "";
      var arrow = trend === "up" ? "↑" : "↓";

      var icons = {
        instagram:
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" stroke="none"/></svg>',
        tiktok:
          '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.6 6.4a5.2 5.2 0 0 1-3.3-1.2 5.3 5.3 0 0 1-1.7-3h-2.9v11.6a2.7 2.7 0 1 1-2.7-2.7c.3 0 .5 0 .8.1V8.3a5.6 5.6 0 1 0 4.9 5.6V9.7a8 8 0 0 0 4.9 1.6V8.4c-.4 0-.7-.1-1-.1z"/></svg>',
      };

      var name = key.charAt(0).toUpperCase() + key.slice(1);

      return (
        '<article class="ann-plat">' +
        '<div class="ann-plat__head">' +
        '<div class="ann-plat__brand">' +
        icons[key] +
        "<div>" +
        '<div class="ann-plat__name">' +
        esc(name) +
        "</div>" +
        '<div class="ann-plat__handle">' +
        esc(p.handle) +
        "</div>" +
        "</div>" +
        "</div>" +
        '<span class="ann-plat__trend ' +
        trend +
        '">' +
        arrow +
        " " +
        Math.abs(deltaPct) +
        "%</span>" +
        "</div>" +
        "<div>" +
        '<div class="ann-plat__big">' +
        esc(fmt(p.followers)) +
        "</div>" +
        '<div class="ann-plat__delta' +
        deltaClass +
        '">' +
        (deltaPct >= 0 ? "↑" : "↓") +
        " " +
        (p.followers_delta >= 0 ? "+" : "") +
        esc(fmt(Math.abs(p.followers_delta))) +
        " this period" +
        "</div>" +
        "</div>" +
        '<div class="ann-plat__metrics">' +
        '<div class="ann-plat__metric">' +
        '<span class="ann-plat__metric-label">Engagement</span>' +
        '<span class="ann-plat__metric-value">' +
        p.engagement_rate.toFixed(1) +
        "%</span>" +
        '<span class="ann-plat__metric-delta' +
        (p.engagement_rate_delta < 0 ? " is-negative" : "") +
        '">' +
        (p.engagement_rate_delta >= 0 ? "+" : "") +
        p.engagement_rate_delta.toFixed(1) +
        "</span>" +
        "</div>" +
        '<div class="ann-plat__metric">' +
        '<span class="ann-plat__metric-label">Likes</span>' +
        '<span class="ann-plat__metric-value">' +
        esc(fmt(p.likes)) +
        "</span>" +
        '<span class="ann-plat__metric-delta' +
        (p.likes_delta_pct < 0 ? " is-negative" : "") +
        '">' +
        (p.likes_delta_pct >= 0 ? "+" : "") +
        p.likes_delta_pct +
        "%" +
        "</span>" +
        "</div>" +
        '<div class="ann-plat__metric">' +
        '<span class="ann-plat__metric-label">Comments</span>' +
        '<span class="ann-plat__metric-value">' +
        esc(fmt(p.comments)) +
        "</span>" +
        '<span class="ann-plat__metric-delta' +
        (p.comments_delta_pct < 0 ? " is-negative" : "") +
        '">' +
        (p.comments_delta_pct >= 0 ? "+" : "") +
        p.comments_delta_pct +
        "%" +
        "</span>" +
        "</div>" +
        "</div>" +
        '<div class="ann-plat__insight">' +
        esc(p.insight) +
        "</div>" +
        "<div>" +
        '<div class="ann-plat__metric-label" style="margin-bottom:8px;">Follower growth</div>' +
        barChart(p.series.labels, p.series.followers, true) +
        "</div>" +
        "<div>" +
        '<div class="ann-plat__metric-label" style="margin-bottom:8px;">Engagement trend</div>' +
        lineChart(p.series.labels, p.series.engagement) +
        "</div>" +
        "<div>" +
        '<div class="ann-plat__metric-label" style="margin-bottom:8px;">Top posts</div>' +
        '<div class="ann-posts__grid">' +
        p.top_posts
          .map(function (post) {
            return (
              '<div class="ann-post">' +
              '<img src="' +
              esc(post.thumb) +
              '" alt="" loading="lazy" />' +
              '<div class="ann-post__overlay">' +
              '<span class="ann-post__stat">' +
              '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-8-5.3-8-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5.7-8 11-8 11z"/></svg>' +
              esc(fmt(post.likes)) +
              "</span>" +
              '<span class="ann-post__engagement">' +
              post.engagement.toFixed(1) +
              "%</span>" +
              "</div>" +
              "</div>"
            );
          })
          .join("") +
        "</div>" +
        "</div>" +
        "</article>"
      );
    }

    // ---- Overview + platform grid ----
    function render(data) {
      var overview = data.overview;

      var html = "";

      html +=
        '<div class="ann-overview">' +
        '<div class="ann-overview__label">Total audience · ' +
        esc(data.range) +
        "</div>" +
        '<div class="ann-overview__value">' +
        esc(fmt(overview.total_followers)) +
        "</div>" +
        '<div class="ann-plat__delta">↑ ' +
        (overview.total_followers_delta >= 0 ? "+" : "") +
        esc(fmt(Math.abs(overview.total_followers_delta))) +
        " this period</div>" +
        '<p class="ann-overview__insight">' +
        esc(overview.combined_insight) +
        "</p>" +
        "</div>";

      html +=
        '<div class="ann-plat-grid">' +
        platformCard("instagram", data.platforms.instagram) +
        platformCard("tiktok", data.platforms.tiktok) +
        "</div>";

      content.innerHTML = html;
    }

    // ---- Load ----
    function loadData(selectedRange) {
      // Try to fetch external JSON first (this is what your AI model will write to)
      fetch("analytics.json?v=" + Date.now(), { cache: "no-store" })
        .then(function (r) {
          return r.ok ? r.json() : Promise.reject();
        })
        .then(function (data) {
          data.range = selectedRange || data.range || "7d";
          render(data);
        })
        .catch(function () {
          content.innerHTML =
            '<div class="ann-admin__empty">Could not load analytics.json — make sure the file exists next to admin.html.</div>';
        });
    }

    // ---- Range buttons ----
    rangeBtns.forEach(function (b) {
      b.addEventListener("click", function () {
        rangeBtns.forEach(function (x) {
          x.classList.toggle("is-active", x === b);
        });
        range = b.getAttribute("data-range");
        loadData(range);
      });
    });

    loadData(range);
  }

  /* ----------------------------------------------------------
     13. Admin tabs (Bookings / Analytics)
     ---------------------------------------------------------- */
  function initAdminTabs() {
    var tabs = document.querySelectorAll("[data-tab]");
    if (!tabs.length) return;
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var target = tab.getAttribute("data-tab");
        tabs.forEach(function (t) {
          t.classList.toggle("is-active", t === tab);
        });
        document.querySelectorAll("[data-tab-panel]").forEach(function (p) {
          p.classList.toggle(
            "is-active",
            p.getAttribute("data-tab-panel") === target,
          );
        });
      });
    });
  }

  /* ----------------------------------------------------------
     Boot
     ---------------------------------------------------------- */

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
    // Webflow IX2 owns the hero heading animation.
    // Reveal our new hero extras once IX2 has had time to settle.
    setTimeout(function () {
      document
        .querySelectorAll(".hero__track__heading [data-stagger]")
        .forEach(function (el) {
          el.classList.add("is-revealed");
        });
    }, 1400);
  }

  /* Hero background parallax — very subtle, respects reduced motion */

  /* Hero background parallax — very subtle, respects reduced motion */
  function initHeroParallax() {
    var layers = document.querySelectorAll("[data-parallax]");
    if (!layers.length || reduceMotion) return;
    var ticking = false;
    function update() {
      var y = window.scrollY;
      layers.forEach(function (el) {
        var speed = parseFloat(el.getAttribute("data-parallax")) || 0.12;
        el.style.transform = "translate3d(0," + y * speed + "px,0)";
      });
      ticking = false;
    }
    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true },
    );
  }

  /* ----------------------------------------------------------
     8. Editorial fold — photos converge as you scroll
     ---------------------------------------------------------- */
  function initEditorialFold() {
    var section = document.querySelector(".ann-editorial");
    if (!section || reduceMotion) return;

    var photos = section.querySelectorAll(".ann-editorial__photo");
    if (!photos.length) return;

    // Final resting positions (as % of the collage box) — the
    // "unfolded" state you already designed.
    var rest = [
      { x: 0, y: 0, r: -2, s: 1 }, // photo-a
      { x: 0, y: 0, r: 1.5, s: 1 }, // photo-b
      { x: 0, y: 0, r: -1, s: 1 }, // photo-c
    ];

    // Starting positions when the section first appears —
    // photos pushed apart, ready to fold inward.
    var start = [
      { x: -40, y: -30, r: -8, s: 1.06 },
      { x: 60, y: -20, r: 7, s: 1.08 },
      { x: -20, y: 50, r: -5, s: 1.05 },
    ];

    // Where they end up when fully folded — all cluster
    // near the centre, slightly overlapped.
    var fold = [
      { x: 10, y: 10, r: 0, s: 0.94 },
      { x: -10, y: 10, r: 0, s: 0.94 },
      { x: 0, y: -8, r: 0, s: 0.94 },
    ];

    function lerp(a, b, t) {
      return a + (b - a) * t;
    }
    var isMobile = window.matchMedia("(max-width: 767px)").matches;
    var START_X = isMobile ? -60 : -28;

    function update() {
      var rect = section.getBoundingClientRect();
      var vh = window.innerHeight;

      // progress 0 → 1 as the section passes through the viewport
      // 0 = section just entering from bottom
      // 1 = section scrolled past top
      var total = rect.height + vh;
      var scrolled = vh - rect.top;
      var p = Math.max(0, Math.min(1, scrolled / total));

      // Two-stage: 0–0.4 unfold→rest, 0.4–0.85 rest→fold
      photos.forEach(function (photo, i) {
        var a = start[i],
          b = rest[i],
          c = fold[i];
        var from, to, t;

        if (p < 0.4) {
          from = a;
          to = b;
          t = p / 0.4;
        } else if (p < 0.85) {
          from = b;
          to = c;
          t = (p - 0.4) / 0.45;
        } else {
          from = c;
          to = c;
          t = 0;
        }

        var ease = t * t * (3 - 2 * t); // smoothstep
        var x = lerp(from.x, to.x, ease);
        var y = lerp(from.y, to.y, ease);
        var r = lerp(from.r, to.r, ease);
        var s = lerp(from.s, to.s, ease);

        photo.style.transform =
          "translate3d(" +
          x +
          "px," +
          y +
          "px,0) rotate(" +
          r +
          "deg) scale(" +
          s +
          ")";
      });
    }

    var ticking = false;
    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(function () {
          update();
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* ----------------------------------------------------------
   9. Hero headline — horizontal scroll shift
   ---------------------------------------------------------- */
  function initHeroHeadlineShift() {
    var shift = document.querySelector(".ann-hero__title-scroll");
    if (!shift || reduceMotion) return;

    var isMobile = window.matchMedia("(max-width: 767px)").matches;
    // var START_X = isMobile ? -45 : -30; // vw
    var START_X = 0; // vw
    var END_X = isMobile ? -35 : 22;
    var SPAN = 0.85;

    function lerp(a, b, t) {
      return a + (b - a) * t;
    }

    function update() {
      var y = window.scrollY;
      var vh = window.innerHeight;
      var p = Math.max(0, Math.min(1, y / (vh * SPAN)));
      var eased = 1 - Math.pow(1 - p, 3);
      var x = lerp(START_X, END_X, eased);
      shift.style.transform = "translate3d(" + x + "vw,0,0)";
    }

    var ticking = false;
    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(function () {
          update();
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* ----------------------------------------------------------
     10. Scroll cue — flip between "Scroll" and "Top"
     ---------------------------------------------------------- */
  function initScrollCue() {
    var cue = document.querySelector("[data-scroll-cue]");
    if (!cue) return;

    var label = cue.querySelector(".ann-scroll-cue__label");
    var vh = window.innerHeight;

    function update() {
      var y = window.scrollY;
      // threshold: one viewport height, refreshed on resize
      var past = y > vh * 0.9;
      cue.classList.toggle("is-up", past);
      if (label) label.textContent = past ? "Top" : "Scroll";
      cue.setAttribute(
        "aria-label",
        past ? "Scroll to top" : "Scroll to bottom",
      );
    }

    cue.addEventListener("click", function () {
      var target = cue.classList.contains("is-up")
        ? 0
        : document.body.scrollHeight;
      window.scrollTo({
        top: target,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    });

    var ticking = false;
    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(function () {
          update();
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function () {
      vh = window.innerHeight;
      update();
    });
    update();
  }

  function boot() {
    initReveals();
    initNav();
    initCounters();
    initLightbox();
    initMultiStepForms();
    initContactForm();
    initAdmin();
    initHeroParallax();
    initEditorialFold();
    initHeroHeadlineShift();
    initScrollCue();
    initBrandLogo();
    initAdminPrefs();
    initAnalytics();
    initAdminTabs();
    initPublicTheme();
  }
})();
