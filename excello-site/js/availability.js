/* Aathavan unit availability.
   - Consumes structured data from /api/units (edited in admin → Aathavan Units).
   - Price is COMPUTED: price = area × pricePerSqFt (never stored).
   - pricePerSqFt falls back to the site-wide standard rate.
   - Enquiry uses one configurable WhatsApp number (site.whatsapp).
   Works under any sub-path. */
(function () {
  var B = (function () {
    try {
      var s = (document.currentScript && document.currentScript.src) || "";
      if (s) return new URL(s).pathname.replace(/\/js\/availability\.js.*$/, "");
    } catch (e) {}
    var b = document.querySelector("base"); return b ? (b.getAttribute("href") || "/").replace(/\/+$/, "") : "";
  })();

  var results = document.getElementById("availResults");
  var countEl = document.getElementById("availCount");
  var fFloor = document.getElementById("fFloor");
  var fStatus = document.getElementById("fStatus");
  var fSort = document.getElementById("fSort");
  var fReset = document.getElementById("fReset");
  var chips = Array.prototype.slice.call(document.querySelectorAll(".avail-chips .chip"));
  var teamWa = document.getElementById("teamWa");
  if (!results) return;

  var UNITS = [];
  var SITE = window.__SITE || {};
  var state = { conf: "", floor: "", status: "available", sort: "floor" };

  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }
  function num(v) { var n = parseFloat(String(v == null ? "" : v).replace(/[^0-9.\-]/g, "")); return isNaN(n) ? 0 : n; }
  function cur() { return SITE.calcCurrency || "LKR"; }
  function standardPpsf() { return num(SITE.aathavanPricePerSqFt) || 40000; }
  function ppsfOf(u) { return num(u.pricePerSqFt) || standardPpsf(); }
  function priceOf(u) { return num(u.area) * ppsfOf(u); }
  function grouped(n) { try { return Math.round(n).toLocaleString("en-US"); } catch (e) { return String(Math.round(n)); } }
  function fmtM(n) { return cur() + " " + (n / 1e6).toFixed(2) + "M"; }
  function fmtFull(n) { return cur() + " " + grouped(n); }
  function fmtPpsf(p) { return cur() + " " + grouped(p) + " / sq.ft"; }
  function refreshST() { try { if (window.ScrollTrigger && ScrollTrigger.refresh) ScrollTrigger.refresh(); } catch (e) {} }

  function waDigits() { return (SITE.whatsapp || "").replace(/[^\d]/g, ""); }
  function waLink(text) {
    var d = waDigits();
    if (!d) return (B || "") + "/contact";
    return "https://wa.me/" + d + "?text=" + encodeURIComponent(text);
  }
  function unitEnquiry(u) { return "Hi, I am interested in Aathavan unit " + (u.title || "") + "."; }

  function statusLabel(s) { s = (s || "available").toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1); }

  function fillFloors() {
    var seen = {}, floors = [];
    UNITS.forEach(function (u) { var f = String(u.floor || ""); if (f && !seen[f]) { seen[f] = 1; floors.push(f); } });
    floors.sort(function (a, b) { return num(a) - num(b); });
    var keep = fFloor.value;
    fFloor.innerHTML = '<option value="">All floors</option>' +
      floors.map(function (f) { return '<option value="' + esc(f) + '">Floor ' + esc(f) + "</option>"; }).join("");
    if (keep) fFloor.value = keep;
  }

  function filtered() {
    var list = UNITS.filter(function (u) {
      if (state.conf && u.configuration !== state.conf) return false;
      if (state.floor && String(u.floor) !== String(state.floor)) return false;
      if (state.status && (u.status || "available").toLowerCase() !== state.status) return false;
      return true;
    });
    var s = state.sort;
    list.sort(function (a, b) {
      if (s === "floor") return num(a.floor) - num(b.floor) || num(a.area) - num(b.area);
      if (s === "area") return num(a.area) - num(b.area);
      if (s === "area-desc") return num(b.area) - num(a.area);
      if (s === "price") return priceOf(a) - priceOf(b);
      if (s === "price-desc") return priceOf(b) - priceOf(a);
      if (s === "configuration") return String(a.configuration).localeCompare(String(b.configuration)) || num(a.floor) - num(b.floor);
      return 0;
    });
    return list;
  }

  function rowHtml(u) {
    var price = priceOf(u), ppsf = ppsfOf(u), st = (u.status || "available").toLowerCase();
    var sold = st === "sold", reserved = st === "reserved";
    var cta = (sold || reserved)
      ? '<span class="utable__state is-' + st + '">' + statusLabel(st) + "</span>"
      : '<a class="btn btn--sm utable__enq" href="' + esc(waLink(unitEnquiry(u))) + '" target="_blank" rel="noopener" aria-label="Enquire about ' + esc(u.title) + '">Enquire</a>';
    return '' +
      '<tr class="utable__row is-' + st + '">' +
        '<td data-label="Residence"><span class="utable__no">' + esc(u.title) + "</span>" +
          (st !== "available" ? ' <span class="utable__badge is-' + st + '">' + statusLabel(st) + "</span>" : "") + "</td>" +
        '<td data-label="Type">' + esc(u.type || "—") + "</td>" +
        '<td data-label="Floor">' + esc(u.floor || "—") + "</td>" +
        '<td data-label="Configuration">' + esc(u.configuration || "—") + "</td>" +
        '<td data-label="Area">' + grouped(num(u.area)) + " sq.ft</td>" +
        '<td data-label="Standard price"><span title="' + esc(fmtFull(price)) + '">' + fmtM(price) + "</span></td>" +
        '<td data-label="Price / sq.ft">' + fmtPpsf(ppsf) + "</td>" +
        '<td data-label="Enquire" class="utable__cta">' + cta + "</td>" +
      "</tr>";
  }

  function render() {
    var list = filtered();
    if (!list.length) {
      results.innerHTML =
        '<div class="avail-empty">' +
          '<p class="body">No residences match your selected criteria.</p>' +
          '<button class="btn btn--ghost btn--sm" type="button" id="emptyReset">Reset filters</button>' +
        "</div>";
      var er = document.getElementById("emptyReset"); if (er) er.onclick = reset;
      refreshST();
      return;
    }
    results.innerHTML =
      '<table class="utable"><caption class="sr-only">Available Aathavan residences</caption>' +
        '<thead><tr>' +
          '<th scope="col">Residence</th><th scope="col">Type</th><th scope="col">Floor</th>' +
          '<th scope="col">Configuration</th><th scope="col">Area</th><th scope="col">Standard price</th>' +
          '<th scope="col">Price / sq.ft</th><th scope="col"><span class="sr-only">Enquire</span></th>' +
        "</tr></thead>" +
        "<tbody>" + list.map(rowHtml).join("") + "</tbody>" +
      "</table>";
    refreshST();
  }

  function reset() {
    state.conf = ""; state.floor = ""; state.status = "available"; state.sort = "floor";
    chips.forEach(function (c) { var on = c.dataset.conf === ""; c.classList.toggle("is-active", on); c.setAttribute("aria-pressed", on ? "true" : "false"); });
    if (fFloor) fFloor.value = ""; if (fStatus) fStatus.value = "available"; if (fSort) fSort.value = "floor";
    render();
  }

  function bind() {
    chips.forEach(function (c) {
      c.addEventListener("click", function () {
        state.conf = c.dataset.conf;
        chips.forEach(function (x) { var on = x === c; x.classList.toggle("is-active", on); x.setAttribute("aria-pressed", on ? "true" : "false"); });
        render();
      });
    });
    if (fFloor) fFloor.addEventListener("change", function () { state.floor = fFloor.value; render(); });
    if (fStatus) fStatus.addEventListener("change", function () { state.status = fStatus.value; render(); });
    if (fSort) fSort.addEventListener("change", function () { state.sort = fSort.value; render(); });
    if (fReset) fReset.addEventListener("click", reset);
  }

  function applyText(s) {
    if (!s) return;
    SITE = Object.assign({}, SITE, s);
    var map = {
      location: "availabilityLocation", intro: "availabilityIntro", note: "availabilityNote",
      disclaimer: "availabilityDisclaimer", pay1: "availabilityPay1", pay2: "availabilityPay2",
      pay3: "availabilityPay3", ctaTitle: "availabilityCtaTitle", ctaText: "availabilityCtaText",
      project: "availabilityProject"
    };
    Object.keys(map).forEach(function (attr) {
      var v = s[map[attr]];
      if (v) document.querySelectorAll('[data-avail="' + attr + '"]').forEach(function (el) { el.textContent = v; });
    });
    if (s.availabilityHeading) document.querySelectorAll('[data-avail="heading"]').forEach(function (el) { el.textContent = s.availabilityHeading; });
    if (s.availabilityCtaLead) document.querySelectorAll('[data-avail="ctaLead"]').forEach(function (el) { el.textContent = s.availabilityCtaLead; });
    document.querySelectorAll('[data-avail="ppsf"]').forEach(function (el) { el.textContent = fmtPpsf(standardPpsf()); });
    if (teamWa) teamWa.setAttribute("href", waLink("Hello Excello, I'd like help choosing an Aathavan residence. Please share unit orientation, payment options and floor plans."));
    render();
  }
  if (window.__sitePromise) window.__sitePromise.then(applyText); else applyText(SITE);

  fetch(B + "/api/units")
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (list) {
      UNITS = list || [];
      var available = UNITS.filter(function (u) { return (u.status || "available").toLowerCase() === "available"; }).length;
      if (countEl) countEl.textContent = available;
      if (!UNITS.length) {
        results.innerHTML = '<p class="body body--muted avail-empty">No residences published yet. Add them in the admin panel (Aathavan Units).</p>';
        return;
      }
      fillFloors();
      bind();
      render();
    })
    .catch(function () {
      results.innerHTML = '<div class="avail-empty"><p class="body">Availability is temporarily unavailable. Please <a href="' + (B || "") + '/contact">contact us</a>.</p></div>';
    });
})();
