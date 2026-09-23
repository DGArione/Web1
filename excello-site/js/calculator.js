/* Excello construction cost planner — guided 7-step calculator.
   ---------------------------------------------------------------------------
   Matches the reference planner. All commercial values are configurable in the
   admin (Calc tabs + Site details); nothing is hard-coded in the UI.

   CONFIG (APIs)
     /api/projecttypes  {title, subtitle, mode}          project direction cards
     /api/finishes      {title, rate, desc, pending}     finish level -> base LKR/sq.ft
     /api/rooms         {title, areaSmall/Medium/Large}  room size allowances (sq.ft)
     /api/materials     {title, options, toggle, adjustPct}  material influences
     site.calcCoverage / calcRangePct / calcProfFeesPct / calcContingencyPct / calcLandUnit

   FORMULA (single source of truth — computeEstimate())
     constructionArea = Σ room[size] × qty  (across floors)
     ratePerSqft      = finish.rate × (1 + Σ material.adjustPct/100)
     base             = constructionArea × ratePerSqft
     total            = base + base×profFees% + base×contingency%
     range            = total × (1 ± calcRangePct%)
     capacity check   = landArea(perches×272.25) × coverage% × floors   (advisory)
   Material adjustments default to 0 (transparent) until the client confirms them.
   --------------------------------------------------------------------------- */
(function () {
  var B = (function () {
    try { var s = (document.currentScript && document.currentScript.src) || "";
      if (s) return new URL(s).pathname.replace(/\/js\/calculator\.js.*$/, ""); } catch (e) {}
    var b = document.querySelector("base"); return b ? (b.getAttribute("href") || "/").replace(/\/+$/, "") : "";
  })();

  var form = document.getElementById("pForm");
  if (!form) return;
  var $ = function (id) { return document.getElementById(id); };
  var SQFT_PER_PERCH = 272.25;
  var FLOOR_NAMES = ["Ground", "1st floor", "2nd floor", "3rd floor", "4th floor"];
  var SIZES = ["small", "medium", "large"];
  var STORE_KEY = "excello-calc-v1";

  var SITE = window.__SITE || {};
  var TYPES = [], FINISHES = [], ROOMS = [], MATERIALS = [];
  var state = {
    step: 1, reached: 1,
    typeId: "", finishId: "",
    land: 10, floors: 1, roof: "Flat / box roof",
    activeFloor: 0, rooms: {}, // rooms[floorIndex] = [{roomId,size,qty}]
    materials: {}, // materials[influenceId] = optionString | boolean
    details: { name: "", phone: "", email: "", location: "", consent: false }
  };

  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }
  function num(v) { var n = parseFloat(String(v == null ? "" : v).replace(/[^0-9.\-]/g, "")); return isNaN(n) ? 0 : n; }
  function cur() { return SITE.calcCurrency || "LKR"; }
  function grouped(n) { try { return Math.round(n).toLocaleString("en-US"); } catch (e) { return String(Math.round(n)); } }
  function money(n) { return cur() + " " + grouped(n); }
  function moneyM(n) { return n >= 1e6 ? cur() + " " + (n / 1e6).toFixed(2) + "M" : money(n); }
  function byId(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return null; }
  function refreshST() { try { if (window.ScrollTrigger && ScrollTrigger.refresh) ScrollTrigger.refresh(); } catch (e) {} }
  function toast(msg) { var t = $("pToast"); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(function () { t.hidden = true; }, 2600); }

  /* ---- Local save / restore ---- */
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); toast("Saved locally on this device."); } catch (e) { toast("Could not save locally."); }
  }
  function restore() {
    try {
      var raw = localStorage.getItem(STORE_KEY); if (!raw) return;
      var s = JSON.parse(raw); if (s && typeof s === "object") {
        ["typeId","finishId","land","floors","roof","activeFloor","rooms","materials","details"].forEach(function (k) {
          if (s[k] != null) state[k] = s[k];
        });
      }
    } catch (e) {}
  }

  /* ---- Floors ---- */
  function floorName(i) { return FLOOR_NAMES[i] || (i + "th floor"); }
  function ensureFloors() {
    for (var i = 0; i < state.floors; i++) if (!state.rooms[i]) state.rooms[i] = [];
    Object.keys(state.rooms).forEach(function (k) { if (+k >= state.floors) delete state.rooms[k]; });
    if (state.activeFloor >= state.floors) state.activeFloor = 0;
  }

  /* ---- STEP 1: project direction ---- */
  function typeLink(t) {
    var d = (SITE.whatsapp || "").replace(/[^\d]/g, "");
    if (t.mode === "whatsapp" && d) return "https://wa.me/" + d + "?text=" + encodeURIComponent("Hello Excello, I'd like a feasibility review for a " + t.title + " project.");
    return (B || "") + "/contact";
  }
  function renderTypes() {
    var cards = TYPES.map(function (t, i) {
      var calc = (t.mode || "calculator") === "calculator";
      var corner = t.mode === "whatsapp" ? "WhatsApp ↗" : (t.mode === "call" ? "Call me ↗" : "");
      var cls = "pcard" + (calc ? "" : " pcard--link") + (calc && t.id === state.typeId ? " is-active" : "") + (t.mode === "call" ? " pcard--green" : "");
      var inner =
        '<span class="pcard__num">' + (i < 9 ? "0" : "") + (i + 1) + "</span>" +
        (corner ? '<span class="pcard__corner">' + esc(corner) + "</span>" : '<span class="pcard__corner">↗</span>') +
        '<span class="pcard__title">' + esc(t.title) + "</span>" +
        '<span class="pcard__sub">' + esc(t.subtitle || "") + "</span>";
      if (calc) return '<button type="button" class="' + cls + '" data-type="' + esc(t.id) + '" role="radio" aria-checked="' + (t.id === state.typeId) + '">' + inner + "</button>";
      return '<a class="' + cls + '" href="' + esc(typeLink(t)) + '"' + (t.mode === "whatsapp" ? ' target="_blank" rel="noopener"' : "") + ">" + inner + "</a>";
    }).join("");
    $("typeCards").innerHTML = cards;
    $("typeCards").querySelectorAll("[data-type]").forEach(function (b) {
      b.addEventListener("click", function () {
        state.typeId = b.dataset.type;
        $("typeCards").querySelectorAll(".pcard").forEach(function (x) { var on = x === b; x.classList.toggle("is-active", on); if (x.hasAttribute("role")) x.setAttribute("aria-checked", on); });
      });
    });
  }

  /* ---- STEP 2: finishes ---- */
  function renderFinishes() {
    $("finishRows").innerHTML = FINISHES.map(function (f, i) {
      var pend = !!f.pending;
      var on = f.id === state.finishId;
      return '<button type="button" class="pfin' + (on ? " is-active" : "") + (pend ? " is-pending" : "") + '" data-finish="' + esc(f.id) + '"' + (pend ? " disabled" : "") + ' role="radio" aria-checked="' + on + '">' +
        '<span class="pfin__num">' + (i < 9 ? "0" : "") + (i + 1) + "</span>" +
        '<span class="pfin__body"><span class="pfin__title">' + esc(f.title) + '</span><span class="pfin__desc">' + esc(f.desc || "") + "</span></span>" +
        '<span class="pfin__rate">' + (pend ? "Pending review" : money(num(f.rate)) + " / sq.ft") + "</span>" +
        '<span class="pfin__tick" aria-hidden="true">' + (on ? "✓" : "") + "</span>" +
      "</button>";
    }).join("");
    $("finishRows").querySelectorAll("[data-finish]").forEach(function (b) {
      b.addEventListener("click", function () {
        state.finishId = b.dataset.finish;
        $("finishRows").querySelectorAll(".pfin").forEach(function (x) { var on = x === b; x.classList.toggle("is-active", on); x.setAttribute("aria-checked", on); x.querySelector(".pfin__tick").textContent = on ? "✓" : ""; });
      });
    });
  }

  /* ---- STEP 3: site ---- */
  function landArea() { return num(state.land) * SQFT_PER_PERCH; }
  function capacity() { return landArea() * (num(SITE.calcCoverage) || 65) / 100 * state.floors; }
  function renderSite() {
    var lr = $("landRange"); lr.value = state.land; $("landNum").textContent = state.land;
    $("landUnit").textContent = SITE.calcLandUnit || "perches";
    $("landMax").textContent = lr.max + " " + (SITE.calcLandUnit || "perches");
    $("floorBtns").innerHTML = [1,2,3,4,5].map(function (n) {
      return '<button type="button" class="pfloor-btn' + (n === state.floors ? " is-active" : "") + '" data-floor="' + n + '" aria-pressed="' + (n === state.floors) + '">' + n + "</button>";
    }).join("");
    $("floorBtns").querySelectorAll("[data-floor]").forEach(function (b) {
      b.addEventListener("click", function () { state.floors = +b.dataset.floor; ensureFloors(); renderSite(); updateSiteStrip(); });
    });
    $("roofBtns").querySelectorAll("[data-roof]").forEach(function (b) {
      b.classList.toggle("is-active", b.dataset.roof === state.roof); b.setAttribute("aria-pressed", b.dataset.roof === state.roof);
      b.onclick = function () { state.roof = b.dataset.roof; renderSite(); };
    });
    updateSiteStrip();
  }
  function updateSiteStrip() {
    $("landArea").textContent = grouped(landArea()) + " sq.ft";
    $("capacity").textContent = grouped(capacity()) + " sq.ft";
    if ($("coverageNote")) $("coverageNote").textContent = "A simple " + (num(SITE.calcCoverage) || 65) + "% coverage assumption is used only as an early capacity check.";
  }

  /* ---- STEP 4: rooms ---- */
  function roomArea(entry) {
    var r = byId(ROOMS, entry.roomId); if (!r) return 0;
    var key = entry.size === "small" ? "areaSmall" : entry.size === "large" ? "areaLarge" : "areaMedium";
    return num(r[key]) * (entry.qty || 0);
  }
  function constructionArea() {
    var a = 0; Object.keys(state.rooms).forEach(function (fi) { (state.rooms[fi] || []).forEach(function (e) { a += roomArea(e); }); });
    return a;
  }
  function renderFloorTabs() {
    var tabs = "";
    for (var i = 0; i < state.floors; i++) tabs += '<button type="button" class="pfloor-tab' + (i === state.activeFloor ? " is-active" : "") + '" data-fi="' + i + '" role="tab" aria-selected="' + (i === state.activeFloor) + '">' + esc(floorName(i)) + "</button>";
    $("floorTabs").innerHTML = tabs;
    $("floorTabs").querySelectorAll("[data-fi]").forEach(function (b) { b.addEventListener("click", function () { state.activeFloor = +b.dataset.fi; renderRooms(); }); });
    $("addRoomFloor").textContent = floorName(state.activeFloor);
  }
  function roomOptionEls(sel) { return ROOMS.map(function (r) { return '<option value="' + esc(r.id) + '"' + (r.id === sel ? " selected" : "") + ">" + esc(r.title) + "</option>"; }).join(""); }
  function renderRooms() {
    ensureFloors(); renderFloorTabs();
    var list = state.rooms[state.activeFloor] || [];
    $("roomList").innerHTML = list.map(function (e, idx) {
      return '<div class="proom" data-idx="' + idx + '">' +
        '<select class="proom__type" aria-label="Room type">' + roomOptionEls(e.roomId) + "</select>" +
        '<div class="proom__sizes" role="group" aria-label="Size allowance">' +
          SIZES.map(function (s) { return '<button type="button" class="proom__size' + (e.size === s ? " is-active" : "") + '" data-size="' + s + '" aria-pressed="' + (e.size === s) + '">' + s.charAt(0).toUpperCase() + s.slice(1) + "</button>"; }).join("") +
        "</div>" +
        '<div class="proom__stepper"><button type="button" class="proom__btn" data-d="-1" aria-label="Decrease">−</button><input type="number" class="proom__qty" min="1" value="' + (e.qty || 1) + '" aria-label="Quantity"><button type="button" class="proom__btn" data-d="1" aria-label="Increase">+</button></div>' +
        '<button type="button" class="proom__rm" aria-label="Remove room">×</button>' +
      "</div>";
    }).join("");
    var box = $("roomList");
    box.querySelectorAll(".proom").forEach(function (row) {
      var idx = +row.dataset.idx, e = list[idx];
      row.querySelector(".proom__type").addEventListener("change", function () { e.roomId = this.value; updateRoomArea(); });
      row.querySelectorAll(".proom__size").forEach(function (b) { b.addEventListener("click", function () { e.size = b.dataset.size; renderRooms(); updateRoomArea(); }); });
      var qty = row.querySelector(".proom__qty");
      row.querySelectorAll(".proom__btn").forEach(function (b) { b.addEventListener("click", function () { e.qty = Math.max(1, (e.qty || 1) + (+b.dataset.d)); qty.value = e.qty; updateRoomArea(); }); });
      qty.addEventListener("input", function () { e.qty = Math.max(1, Math.floor(num(qty.value)) || 1); updateRoomArea(); });
      row.querySelector(".proom__rm").addEventListener("click", function () { list.splice(idx, 1); renderRooms(); updateRoomArea(); });
    });
    updateRoomArea();
  }
  function updateRoomArea() { $("roomArea").textContent = grouped(constructionArea()) + " sq.ft"; }

  /* ---- STEP 5: materials ---- */
  function renderMaterials() {
    $("materialGrid").innerHTML = MATERIALS.map(function (m) {
      var opts = String(m.options || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean);
      if (m.toggle) {
        var on = state.materials[m.id] !== false;
        return '<div class="pmat"><span class="pmat__num">' + "" + '</span><span class="pmat__label">' + esc(m.title) + '</span>' +
          '<label class="pmat__toggle"><input type="checkbox" data-mat="' + esc(m.id) + '"' + (on ? " checked" : "") + '><span></span></label></div>';
      }
      var cur = state.materials[m.id] || opts[0] || "";
      return '<div class="pmat"><span class="pmat__label">' + esc(m.title) + '</span>' +
        '<select class="pmat__select" data-mat="' + esc(m.id) + '" aria-label="' + esc(m.title) + '">' +
          opts.map(function (o) { return '<option value="' + esc(o) + '"' + (o === cur ? " selected" : "") + ">" + esc(o) + "</option>"; }).join("") +
        "</select></div>";
    }).join("");
    $("materialGrid").querySelectorAll("[data-mat]").forEach(function (el) {
      el.addEventListener("change", function () { state.materials[el.dataset.mat] = el.type === "checkbox" ? el.checked : el.value; });
    });
  }

  /* ---- Estimate ---- */
  function selectedType() { return byId(TYPES, state.typeId); }
  function selectedFinish() { return byId(FINISHES, state.finishId); }
  function materialAdjustPct() {
    var pct = 0;
    MATERIALS.forEach(function (m) {
      var adj = num(m.adjustPct); if (!adj) return;
      var v = state.materials[m.id];
      if (m.toggle) { if (v !== false) pct += adj; }
      else { var opts = String(m.options || "").split(",").map(function (x){return x.trim();}).filter(Boolean); if (v && opts.length && v !== opts[0]) pct += adj; }
    });
    return pct;
  }
  function computeEstimate() {
    var area = constructionArea();
    var f = selectedFinish();
    var baseRate = f ? num(f.rate) : 0;
    var adjPct = materialAdjustPct();
    var ratePerSqft = baseRate * (1 + adjPct / 100);
    var base = area * ratePerSqft;
    var profPct = num(SITE.calcProfFeesPct), contPct = num(SITE.calcContingencyPct);
    var profFees = base * profPct / 100, contingency = base * contPct / 100;
    var total = base + profFees + contingency;
    var rangePct = num(SITE.calcRangePct) || 10;
    return { area: area, baseRate: baseRate, adjPct: adjPct, ratePerSqft: ratePerSqft, base: base,
      profPct: profPct, profFees: profFees, contPct: contPct, contingency: contingency, total: total,
      rangePct: rangePct, low: total * (1 - rangePct / 100), high: total * (1 + rangePct / 100),
      capacity: capacity(), landArea: landArea() };
  }
  function roomSummary() {
    var out = [];
    for (var i = 0; i < state.floors; i++) {
      var list = state.rooms[i] || []; if (!list.length) continue;
      var parts = list.map(function (e) { var r = byId(ROOMS, e.roomId); return (r ? r.title : "Room") + " (" + e.size.charAt(0).toUpperCase() + ") ×" + e.qty; });
      out.push({ floor: floorName(i), parts: parts });
    }
    return out;
  }
  function prow(a, b) { return '<div class="pest__row"><span>' + a + "</span><span>" + b + "</span></div>"; }
  /* Cost breakdown by component (configurable % of total — should add to 100). */
  function breakdown(total) {
    var items = [
      ["Earthwork & substructure", num(SITE.calcSplitSubstructure) || 7],
      ["Structural shell", num(SITE.calcSplitStructure) || 42],
      ["Roofing & ceiling", num(SITE.calcSplitRoof) || 14],
      ["Finishes & interior", num(SITE.calcSplitFinishes) || 26],
      ["MEP systems & fixtures", num(SITE.calcSplitMEP) || 11]
    ];
    return items.map(function (it) { return { label: it[0], amount: total * it[1] / 100 }; });
  }
  function estWaMsg(e) {
    return "Hello Excello, I used the construction cost planner.\nProject: " + (selectedType() ? selectedType().title : "-") +
      "\nFinish: " + (selectedFinish() ? selectedFinish().title : "-") + "\nBuilt-up area: " + grouped(e.area) + " sq.ft\nIndicative total: " + money(e.total) + ".\nPlease help review the assumptions.";
  }
  function renderEstimate() {
    var e = computeEstimate();
    if (!(e.area > 0) || !e.ratePerSqft) { $("estimate").innerHTML = '<p class="body body--muted">Add rooms and a finish level to see your estimate.</p>'; return; }
    var brk = breakdown(e.total).map(function (b) { return prow(esc(b.label), money(b.amount)); }).join("");
    var assume =
      prow("Project", esc(selectedType() ? selectedType().title : "—")) +
      prow("Specification", esc(selectedFinish() ? selectedFinish().title : "—")) +
      prow("Land", state.land + " " + esc(SITE.calcLandUnit || "perches")) +
      prow("Floors", String(state.floors)) +
      prow("Base rate", money(e.baseRate) + " / sq.ft");
    var smin = num(SITE.calcSavingsMin) || 25, smax = num(SITE.calcSavingsMax) || 35;
    var phone = SITE.phone || "+94 77 022 2000";
    var d = (SITE.whatsapp || "").replace(/[^\d]/g, "");
    var waHref = d ? "https://wa.me/" + d + "?text=" + encodeURIComponent("Hello Excello, please help me plan and reduce my construction cost.") : (B || "") + "/contact";
    $("estimate").innerHTML =
      '<div class="pest">' +
        '<div class="pest__cost">' +
          '<span class="pest__eyebrow">Indicative construction cost</span>' +
          '<strong class="pest__big">' + moneyM(e.total) + "</strong>" +
          '<span class="pest__range">Planning range ' + moneyM(e.low) + " – " + moneyM(e.high) + "</span>" +
        "</div>" +
        '<div class="pest__kpis">' +
          '<div class="pest__kpi"><span>Built-up area</span><strong>' + grouped(e.area) + ' sq.ft</strong></div>' +
          '<div class="pest__kpi"><span>Effective rate</span><strong>' + money(e.ratePerSqft) + ' / sq.ft</strong></div>' +
        "</div>" +
        '<div class="pest__card">' +
          '<span class="pest__eyebrow">System allowance</span><h3 class="pest__h">Indicative breakdown</h3>' +
          '<div class="pest__rows">' + brk + "</div>" +
        "</div>" +
        '<div class="pest__card">' +
          '<span class="pest__eyebrow">Project summary</span><h3 class="pest__h">Current assumptions</h3>' +
          '<div class="pest__rows">' + assume + "</div>" +
        "</div>" +
        '<p class="pest__important"><strong>Important:</strong> <span id="estDisc"></span></p>' +
        '<div class="pest__plan">' +
          '<span class="pest__eyebrow">Plan before you build</span>' +
          '<h2 class="pest__plan-head">Your estimated cost could be ' + smin + "%–" + smax + '% lower.</h2>' +
          '<p class="pest__plan-text" id="estSavings"></p>' +
          '<span class="pest__eyebrow">Speak with Excello on WhatsApp</span>' +
          '<a class="pest__phone" href="' + waHref + '"' + (d ? ' target="_blank" rel="noopener"' : "") + ">" + esc(phone) + "</a>" +
        "</div>" +
      "</div>";
    $("estDisc").textContent = SITE.calcDisclaimer || "This is an indicative early-stage planning estimate, not a quotation.";
    $("estSavings").textContent = SITE.calcSavingsText || "Proper planning, professional consultation and coordinated execution can help reduce avoidable construction costs.";
    $("estWa").setAttribute("href", d ? "https://wa.me/" + d + "?text=" + encodeURIComponent(estWaMsg(e)) : (B || "") + "/contact");
    if (!d) $("estWa").removeAttribute("target");
  }

  /* ---- Validation ---- */
  function validate(step) {
    if (step === 1) { var t = selectedType(); if (!t || (t.mode || "calculator") !== "calculator") { toast("Select a project to continue, or use WhatsApp / Call me."); return false; } return true; }
    if (step === 2) { var f = selectedFinish(); if (!f || f.pending) { toast("Choose a finish level to continue."); return false; } return true; }
    if (step === 4) { if (!(constructionArea() > 0)) { toast("Add at least one room to continue."); return false; } return true; }
    if (step === 6) {
      var d = state.details;
      d.name = $("dName").value.trim(); d.phone = $("dPhone").value.trim(); d.email = $("dEmail").value.trim();
      d.location = $("dLocation").value.trim(); d.consent = $("dConsent").checked;
      var err = $("errDetails");
      if (!d.name || !d.phone || !d.email) { err.textContent = "Complete your name, contact number and email."; err.hidden = false; toast("Complete all contact details."); return false; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) { err.textContent = "Enter a valid email address."; err.hidden = false; return false; }
      if (!d.consent) { err.textContent = "Please tick the consent box to view your estimate."; err.hidden = false; return false; }
      err.hidden = true; return true;
    }
    return true;
  }
  function submitLead() {
    var e = computeEstimate();
    var payload = Object.assign({}, state.details, {
      projectType: selectedType() ? selectedType().title : "",
      finish: selectedFinish() ? selectedFinish().title : "",
      area: grouped(e.area) + " sq.ft", total: money(e.total),
      summary: "Floors " + state.floors + " · " + state.roof + " · Land " + state.land + " " + (SITE.calcLandUnit || "perches")
    });
    fetch(B + "/api/estimate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).catch(function () {});
  }

  /* ---- Wizard navigation ---- */
  function showStep(n) {
    state.step = n; state.reached = Math.max(state.reached, n);
    form.querySelectorAll(".pstep").forEach(function (s) { s.classList.toggle("is-active", +s.dataset.step === n); });
    var active = form.querySelector('.pstep[data-step="' + n + '"]');
    var name = active ? active.dataset.name : "";
    var pct = Math.round(n / 7 * 100);
    $("pStepLabel").textContent = "Step " + n + " of 7";
    $("pSectionLabel").textContent = name;
    $("pPct").textContent = pct + "%";
    $("pTrack").style.width = pct + "%";
    $("pBack").disabled = n === 1;
    var next = $("pNext");
    if (n === 7) { next.style.display = "none"; }
    else { next.style.display = ""; next.innerHTML = (n === 6 ? "Submit &amp; view estimate" : "Continue") + ' <span aria-hidden="true">↗</span>'; }
    if (n === 3) renderSite();
    if (n === 4) renderRooms();
    if (n === 7) renderEstimate();
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) {}
    var f = active && active.querySelector("button,select,input"); if (f) { try { f.focus({ preventScroll: true }); } catch (e) {} }
    refreshST();
  }
  function next() {
    if (!validate(state.step)) return;
    if (state.step === 6) submitLead();
    showStep(Math.min(7, state.step + 1));
  }
  function back() { showStep(Math.max(1, state.step - 1)); }

  $("pNext").addEventListener("click", next);
  $("pBack").addEventListener("click", back);
  $("pSave").addEventListener("click", save);
  $("printBtn").addEventListener("click", function () { window.print(); });
  $("shareBtn").addEventListener("click", function () {
    var e = computeEstimate();
    var text = "Excello construction estimate — " + (selectedType() ? selectedType().title : "") + ", " +
      (selectedFinish() ? selectedFinish().title : "") + ", " + grouped(e.area) + " sq.ft: " + money(e.total) + " (indicative).";
    var url = location.href;
    if (navigator.share) { navigator.share({ title: "Excello Construction Cost Estimate", text: text, url: url }).catch(function () {}); }
    else if (navigator.clipboard) { navigator.clipboard.writeText(text + " " + url).then(function () { toast("Estimate copied to clipboard."); }).catch(function () { toast("Could not copy."); }); }
    else { toast("Sharing is not supported on this browser."); }
  });
  $("landRange").addEventListener("input", function () { state.land = num(this.value); $("landNum").textContent = state.land; updateSiteStrip(); });
  $("addRoom").addEventListener("click", function () {
    if (!ROOMS.length) return toast("No rooms configured.");
    state.rooms[state.activeFloor] = state.rooms[state.activeFloor] || [];
    state.rooms[state.activeFloor].push({ roomId: ROOMS[0].id, size: "medium", qty: 1 });
    renderRooms();
  });
  ["dName","dPhone","dEmail","dLocation"].forEach(function (id) { var el = $(id); if (el) el.addEventListener("input", function () { state.details[id.slice(1).toLowerCase()] = el.value; }); });

  /* ---- Defaults + boot ---- */
  function applyDefaults() {
    if (!state.typeId) { var firstCalc = TYPES.filter(function (t) { return (t.mode || "calculator") === "calculator"; })[0]; if (firstCalc) state.typeId = firstCalc.id; }
    if (!state.finishId) { var firstFin = FINISHES.filter(function (f) { return !f.pending; })[0] || FINISHES[0]; if (firstFin) state.finishId = firstFin.id; }
    MATERIALS.forEach(function (m) {
      if (state.materials[m.id] === undefined) {
        if (m.toggle) state.materials[m.id] = true;
        else { var opts = String(m.options || "").split(",").map(function (x){return x.trim();}).filter(Boolean); state.materials[m.id] = opts[0] || ""; }
      }
    });
    ensureFloors();
    if (!Object.keys(state.rooms).some(function (k) { return (state.rooms[k] || []).length; })) {
      var pick = function (title) { var r = ROOMS.filter(function (x){return x.title===title;})[0]; return r ? r.id : (ROOMS[0] && ROOMS[0].id); };
      if (ROOMS.length) state.rooms[0] = [
        { roomId: pick("Living"), size: "medium", qty: 1 },
        { roomId: pick("Kitchen"), size: "medium", qty: 1 },
        { roomId: pick("Master bedroom"), size: "medium", qty: 1 },
        { roomId: pick("Bathroom"), size: "medium", qty: 2 }
      ];
    }
  }
  function fillDetailInputs() {
    $("dName").value = state.details.name || ""; $("dPhone").value = state.details.phone || "";
    $("dEmail").value = state.details.email || ""; $("dLocation").value = state.details.location || "";
    $("dConsent").checked = !!state.details.consent;
  }

  function applyText(s) {
    if (!s) return; SITE = Object.assign({}, SITE, s);
    if (s.calcHeading) { /* keep planner headline per-step; heading unused here */ }
    updateSiteStrip();
  }
  if (window.__sitePromise) window.__sitePromise.then(applyText); else applyText(SITE);

  Promise.all([
    fetch(B + "/api/projecttypes").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch(B + "/api/finishes").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch(B + "/api/rooms").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch(B + "/api/materials").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; })
  ]).then(function (res) {
    TYPES = res[0] || []; FINISHES = res[1] || []; ROOMS = res[2] || []; MATERIALS = res[3] || [];
    restore();
    applyDefaults();
    renderTypes(); renderFinishes(); renderMaterials(); fillDetailInputs();
    showStep(state.step && state.reached ? 1 : 1);
  });
})();
