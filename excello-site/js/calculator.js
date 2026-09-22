/* Excello construction cost calculator — guided 6-step planner.
   ---------------------------------------------------------------------------
   ALL commercial values are configurable (admin → Calc tabs + Site details);
   nothing is hard-coded in the UI. Placeholder rates are clearly flagged.

   CONFIGURABLE INPUTS
     /api/projecttypes  -> { title, baseRate }      base construction rate / sq.ft
     /api/materials     -> { title, multiplier }    finish-level cost multiplier
     /api/rooms         -> { title, area }           default area (sq.ft) per room
     site.calcProfFeesPct      professional fees %   (default 0 — CONFIRM)
     site.calcContingencyPct   contingency %         (default 0 — CONFIRM)
     site.calcRangePct         estimate range +/- %
     site.calcLandUnit         land extent unit label

   CALCULATION FORMULA  (single source of truth — computeEstimate())
     constructionArea = Σ (room.area × qty)
     ratePerSqft      = projectType.baseRate × material.multiplier
     base             = constructionArea × ratePerSqft
     profFees         = base × profFeesPct/100
     contingency      = base × contingencyPct/100
     total            = base + profFees + contingency
     range            = total × (1 ± rangePct/100)
   NOTE: land extent is captured for context and does NOT affect the estimate
   unless the client confirms a land-based area rule (flagged for confirmation).
   --------------------------------------------------------------------------- */
(function () {
  var B = (function () {
    try {
      var s = (document.currentScript && document.currentScript.src) || "";
      if (s) return new URL(s).pathname.replace(/\/js\/calculator\.js.*$/, "");
    } catch (e) {}
    var b = document.querySelector("base"); return b ? (b.getAttribute("href") || "/").replace(/\/+$/, "") : "";
  })();

  var form = document.getElementById("cwizForm");
  if (!form) return;
  var stepsEl = document.getElementById("cwizSteps");
  var backBtn = document.getElementById("cBack");
  var nextBtn = document.getElementById("cNext");
  var nowEl = document.getElementById("cNow");
  var typeOpts = document.getElementById("typeOpts");
  var materialOpts = document.getElementById("materialOpts");
  var roomOpts = document.getElementById("roomOpts");
  var roomAreaEl = document.getElementById("roomArea");
  var landVal = document.getElementById("landVal");
  var landUnitEl = document.getElementById("landUnit");
  var landConv = document.getElementById("landConv");
  var estimateEl = document.getElementById("estimate");
  var summaryEl = document.getElementById("summary");
  var printBtn = document.getElementById("printBtn");
  var summaryWa = document.getElementById("summaryWa");

  var SITE = window.__SITE || {};
  var TYPES = [], MATERIALS = [], ROOMS = [];
  var SQFT_PER_PERCH = 272.25; /* 1 perch = 25.2929 m² ≈ 272.25 sq.ft */
  var PERCH_PER_ACRE = 160;

  var state = { step: 1, reached: 1, typeId: "", materialId: "", rooms: {}, land: "" };

  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }
  function num(v) { var n = parseFloat(String(v == null ? "" : v).replace(/[^0-9.\-]/g, "")); return isNaN(n) ? 0 : n; }
  function cur() { return SITE.calcCurrency || "LKR"; }
  function grouped(n) { try { return Math.round(n).toLocaleString("en-US"); } catch (e) { return String(Math.round(n)); } }
  function money(n) { return cur() + " " + grouped(n); }
  function moneyM(n) { return n >= 1e6 ? cur() + " " + (n / 1e6).toFixed(2) + "M" : money(n); }
  function refreshST() { try { if (window.ScrollTrigger && ScrollTrigger.refresh) ScrollTrigger.refresh(); } catch (e) {} }
  function byId(arr, id) { return arr.filter(function (x) { return x.id === id; })[0] || null; }

  /* ---- Configurable pieces --------------------------------------------- */
  function selectedType() { return byId(TYPES, state.typeId); }
  function selectedMaterial() { return byId(MATERIALS, state.materialId); }
  function constructionArea() {
    var a = 0;
    ROOMS.forEach(function (r) { a += num(r.area) * (state.rooms[r.id] || 0); });
    return a;
  }

  /* ---- THE formula (single source of truth) ---------------------------- */
  function computeEstimate() {
    var area = constructionArea();
    var t = selectedType(), m = selectedMaterial();
    var baseRate = t ? num(t.baseRate) : 0;
    var mult = m ? (num(m.multiplier) || 1) : 1;
    var ratePerSqft = baseRate * mult;
    var base = area * ratePerSqft;
    var profPct = num(SITE.calcProfFeesPct);
    var contPct = num(SITE.calcContingencyPct);
    var profFees = base * profPct / 100;
    var contingency = base * contPct / 100;
    var total = base + profFees + contingency;
    var rangePct = num(SITE.calcRangePct) || 10;
    return {
      area: area, ratePerSqft: ratePerSqft, baseRate: baseRate, mult: mult, base: base,
      profPct: profPct, profFees: profFees, contPct: contPct, contingency: contingency,
      total: total, rangePct: rangePct, low: total * (1 - rangePct / 100), high: total * (1 + rangePct / 100)
    };
  }

  /* ---- Option cards (radios) ------------------------------------------- */
  function radioCard(group, r, checked) {
    var sub = group === "ptype"
      ? (r.baseRate ? money(r.baseRate) + " / sq.ft base" : "")
      : (r.multiplier ? "×" + esc(r.multiplier) + " cost" : "");
    return '' +
      '<label class="copt">' +
        '<input type="radio" name="' + group + '" value="' + esc(r.id) + '"' + (checked ? " checked" : "") + ">" +
        '<span class="copt__body">' +
          '<span class="copt__title">' + esc(r.title) + "</span>" +
          (sub ? '<span class="copt__rate">' + sub + "</span>" : "") +
          (r.note ? '<span class="copt__note">' + esc(r.note) + "</span>" : "") +
        "</span>" +
      "</label>";
  }

  function renderTypes() {
    typeOpts.innerHTML = TYPES.length
      ? TYPES.map(function (r) { return radioCard("ptype", r, r.id === state.typeId); }).join("")
      : '<p class="body body--muted">No project types configured yet (admin → Calc · Project Types).</p>';
    typeOpts.querySelectorAll('input[name="ptype"]').forEach(function (el) {
      el.addEventListener("change", function () { state.typeId = el.value; clearErr(1); });
    });
  }
  function renderMaterials() {
    materialOpts.innerHTML = MATERIALS.length
      ? MATERIALS.map(function (r) { return radioCard("material", r, r.id === state.materialId); }).join("")
      : '<p class="body body--muted">No finish levels configured yet (admin → Calc · Finish Levels).</p>';
    materialOpts.querySelectorAll('input[name="material"]').forEach(function (el) {
      el.addEventListener("change", function () { state.materialId = el.value; clearErr(4); });
    });
  }
  function renderRooms() {
    roomOpts.innerHTML = ROOMS.length
      ? ROOMS.map(function (r) {
          var qty = state.rooms[r.id] || 0;
          return '' +
            '<div class="croom" data-room="' + esc(r.id) + '">' +
              '<div class="croom__label"><span class="croom__name">' + esc(r.title) + "</span>" +
                '<span class="croom__area">' + grouped(num(r.area)) + " sq.ft each</span></div>" +
              '<div class="croom__stepper">' +
                '<button type="button" class="croom__btn" data-d="-1" aria-label="Decrease ' + esc(r.title) + '">−</button>' +
                '<input type="number" class="croom__qty" min="0" step="1" value="' + qty + '" aria-label="Quantity of ' + esc(r.title) + '">' +
                '<button type="button" class="croom__btn" data-d="1" aria-label="Increase ' + esc(r.title) + '">+</button>' +
              "</div>" +
            "</div>";
        }).join("")
      : '<p class="body body--muted">No rooms configured yet (admin → Calc · Rooms).</p>';
    roomOpts.querySelectorAll(".croom").forEach(function (row) {
      var id = row.dataset.room, input = row.querySelector(".croom__qty");
      row.querySelectorAll(".croom__btn").forEach(function (b) {
        b.addEventListener("click", function () {
          var v = Math.max(0, (state.rooms[id] || 0) + parseInt(b.dataset.d, 10));
          state.rooms[id] = v; input.value = v; updateArea();
        });
      });
      input.addEventListener("input", function () {
        var v = Math.max(0, Math.floor(num(input.value))); state.rooms[id] = v; input.value = v; updateArea();
      });
    });
    updateArea();
  }
  function updateArea() {
    var a = constructionArea();
    if (roomAreaEl) roomAreaEl.textContent = grouped(a) + " sq.ft";
    if (a > 0) clearErr(3);
  }

  /* ---- Land conversion ------------------------------------------------- */
  function updateLandConv() {
    var unit = (SITE.calcLandUnit || "perches").toLowerCase();
    var v = num(landVal.value);
    if (!v) { landConv.textContent = ""; return; }
    if (unit.indexOf("perch") === 0) {
      var sqft = v * SQFT_PER_PERCH, acres = v / PERCH_PER_ACRE;
      landConv.textContent = "≈ " + grouped(sqft) + " sq.ft" + (acres >= 0.25 ? " · " + acres.toFixed(2) + " acres" : "");
    } else { landConv.textContent = ""; }
  }

  /* ---- Validation ------------------------------------------------------ */
  function setErr(step, msg) {
    var el = document.getElementById("err" + step);
    if (el) { el.textContent = msg; el.hidden = !msg; }
  }
  function clearErr(step) { setErr(step, ""); }
  function validate(step) {
    if (step === 1 && !selectedType()) { setErr(1, "Please select a project type to continue."); return false; }
    if (step === 2) {
      var v = num(landVal.value);
      if (landVal.value !== "" && v < 0) { setErr(2, "Land extent cannot be negative."); return false; }
      if (v > 100000) { setErr(2, "Please enter a realistic land extent."); return false; }
      clearErr(2); return true;
    }
    if (step === 3 && !(constructionArea() > 0)) { setErr(3, "Add at least one room to estimate the construction area."); return false; }
    if (step === 4 && !selectedMaterial()) { setErr(4, "Please choose a material / finish level."); return false; }
    return true;
  }

  /* ---- Estimate + summary ---------------------------------------------- */
  function roomLines() {
    return ROOMS.filter(function (r) { return (state.rooms[r.id] || 0) > 0; })
      .map(function (r) { return { name: r.title, qty: state.rooms[r.id], area: num(r.area) * state.rooms[r.id] }; });
  }
  function assumptionsHtml(e) {
    var rows = [
      ["Base rate (" + (selectedType() ? esc(selectedType().title) : "") + ")", money(e.baseRate) + " / sq.ft"],
      ["Finish multiplier (" + (selectedMaterial() ? esc(selectedMaterial().title) : "") + ")", "×" + e.mult.toFixed(2)],
      ["Applied rate", money(e.ratePerSqft) + " / sq.ft"]
    ];
    if (e.profPct) rows.push(["Professional fees", e.profPct + "%"]);
    if (e.contPct) rows.push(["Contingency", e.contPct + "%"]);
    rows.push(["Estimate range", "± " + e.rangePct + "%"]);
    return rows.map(function (r) { return '<div class="crow"><span>' + r[0] + "</span><span>" + r[1] + "</span></div>"; }).join("");
  }
  function renderEstimate() {
    var e = computeEstimate();
    if (!(e.area > 0) || !e.ratePerSqft) {
      estimateEl.innerHTML = '<p class="body body--muted">Complete the previous steps to see your estimate.</p>';
      return;
    }
    estimateEl.innerHTML =
      '<div class="cest">' +
        '<div class="cest__head">' +
          '<div class="cest__kpi"><span class="cest__k">Construction area</span><span class="cest__v">' + grouped(e.area) + ' sq.ft</span></div>' +
          '<div class="cest__kpi"><span class="cest__k">Cost per sq.ft</span><span class="cest__v">' + money(e.ratePerSqft) + '</span></div>' +
        "</div>" +
        '<div class="cest__total"><span class="cest__k">Estimated construction cost</span>' +
          '<span class="cest__big">' + money(e.total) + "</span>" +
          '<span class="cest__range">Likely range ' + moneyM(e.low) + " – " + moneyM(e.high) + "</span>" +
        "</div>" +
        '<div class="cest__break">' +
          '<div class="crow"><span>Project type</span><span>' + (selectedType() ? esc(selectedType().title) : "—") + "</span></div>" +
          '<div class="crow"><span>Finish level</span><span>' + (selectedMaterial() ? esc(selectedMaterial().title) : "—") + "</span></div>" +
          '<div class="crow"><span>Rooms</span><span>' + roomLines().map(function (l) { return esc(l.name) + " ×" + l.qty; }).join(", ") + "</span></div>" +
          assumptionsHtml(e) +
        "</div>" +
        '<p class="cest__note" data-calc="disclaimer2"></p>' +
      "</div>";
    var dn = estimateEl.querySelector('[data-calc="disclaimer2"]');
    if (dn) dn.textContent = SITE.calcDisclaimer || "This is an indicative estimate only, not a formal quotation.";
  }
  function renderSummary() {
    var e = computeEstimate();
    var unit = SITE.calcLandUnit || "perches";
    var landTxt = landVal.value !== "" && num(landVal.value) > 0 ? num(landVal.value) + " " + unit : "Not specified";
    var inputs = [
      ["Project type", selectedType() ? selectedType().title : "—"],
      ["Land extent", landTxt],
      ["Finish level", selectedMaterial() ? selectedMaterial().title : "—"]
    ];
    var rl = roomLines();
    summaryEl.innerHTML =
      '<div class="csheet">' +
        '<div class="csheet__brand"><strong>' + esc(SITE.companyName || "Excello Developers") + '</strong><span>Construction Planning Summary</span>' +
          '<span class="csheet__date">' + new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) + "</span></div>" +

        '<h3 class="csheet__h">Project inputs</h3>' +
        '<div class="csheet__grid">' + inputs.map(function (r) { return '<div class="crow"><span>' + r[0] + "</span><span>" + esc(r[1]) + "</span></div>"; }).join("") + "</div>" +

        '<h3 class="csheet__h">Room programme</h3>' +
        (rl.length ? '<div class="csheet__grid">' + rl.map(function (l) { return '<div class="crow"><span>' + esc(l.name) + " ×" + l.qty + "</span><span>" + grouped(l.area) + " sq.ft</span></div>"; }).join("") + "</div>"
                   : '<p class="body body--muted">No rooms selected.</p>') +

        '<h3 class="csheet__h">Calculation assumptions</h3>' +
        '<div class="csheet__grid">' + assumptionsHtml(e) +
          '<div class="crow"><span>Area basis</span><span>' + esc(SITE.calcAreaNote || "Estimated from room programme.") + "</span></div>" +
        "</div>" +

        '<h3 class="csheet__h">Estimated budget</h3>' +
        '<div class="csheet__grid">' +
          '<div class="crow"><span>Construction area</span><span>' + grouped(e.area) + " sq.ft</span></div>" +
          '<div class="crow"><span>Cost per sq.ft</span><span>' + money(e.ratePerSqft) + "</span></div>" +
          '<div class="crow"><span>Base construction cost</span><span>' + money(e.base) + "</span></div>" +
          (e.profFees ? '<div class="crow"><span>Professional fees</span><span>' + money(e.profFees) + "</span></div>" : "") +
          (e.contingency ? '<div class="crow"><span>Contingency</span><span>' + money(e.contingency) + "</span></div>" : "") +
          '<div class="crow crow--total"><span>Indicative total</span><span>' + money(e.total) + "</span></div>" +
          '<div class="crow"><span>Likely range</span><span>' + money(e.low) + " – " + money(e.high) + "</span></div>" +
        "</div>" +

        '<p class="csheet__disc">' + esc(SITE.calcDisclaimer || "") + "</p>" +
        '<div class="csheet__contact">' +
          "<span>" + esc(SITE.companyName || "Excello Developers") + "</span>" +
          "<span>" + esc(SITE.phone || "") + "</span>" +
          "<span>" + esc(SITE.email || "") + "</span>" +
        "</div>" +
      "</div>";

    var d = (SITE.whatsapp || "").replace(/[^\d]/g, "");
    var msg = "Hello Excello, I used the construction cost planner.\n" +
      "Project: " + (selectedType() ? selectedType().title : "-") + "\n" +
      "Finish: " + (selectedMaterial() ? selectedMaterial().title : "-") + "\n" +
      "Area: " + grouped(e.area) + " sq.ft\n" +
      "Indicative total: " + money(e.total) + ".\nI'd like a detailed proposal.";
    if (summaryWa) {
      summaryWa.setAttribute("href", d ? "https://wa.me/" + d + "?text=" + encodeURIComponent(msg) : (B || "") + "/contact");
      if (!d) summaryWa.removeAttribute("target");
    }
  }

  /* ---- Wizard navigation ----------------------------------------------- */
  function showStep(n) {
    state.step = n;
    state.reached = Math.max(state.reached, n);
    form.querySelectorAll(".cstep").forEach(function (fs) {
      fs.classList.toggle("is-active", parseInt(fs.dataset.step, 10) === n);
    });
    Array.prototype.forEach.call(stepsEl.children, function (li) {
      var s = parseInt(li.dataset.s, 10);
      li.classList.toggle("is-active", s === n);
      li.classList.toggle("is-done", s < state.reached && s !== n);
    });
    if (nowEl) nowEl.textContent = n;
    backBtn.disabled = n === 1;
    nextBtn.style.display = n === 6 ? "none" : "";
    nextBtn.textContent = n === 5 ? "View summary" : "Next";
    if (n === 5) renderEstimate();
    if (n === 6) renderSummary();
    var active = form.querySelector('.cstep[data-step="' + n + '"]');
    var focusable = active && active.querySelector("input, button, select");
    if (focusable) { try { focusable.focus({ preventScroll: true }); } catch (e) {} }
    refreshST();
  }
  function next() { if (validate(state.step)) showStep(Math.min(6, state.step + 1)); }
  function back() { showStep(Math.max(1, state.step - 1)); }

  nextBtn.addEventListener("click", next);
  backBtn.addEventListener("click", back);
  stepsEl.addEventListener("click", function (e) {
    var li = e.target.closest("li"); if (!li) return;
    var s = parseInt(li.dataset.s, 10);
    if (s <= state.reached) showStep(s);
  });
  if (landVal) landVal.addEventListener("input", function () { state.land = landVal.value; updateLandConv(); clearErr(2); });
  if (printBtn) printBtn.addEventListener("click", function () { window.print(); });

  /* ---- Copy / settings ------------------------------------------------- */
  function applyText(s) {
    if (!s) return;
    SITE = Object.assign({}, SITE, s);
    if (s.calcHeading) document.querySelectorAll('[data-calc="heading"]').forEach(function (el) { el.textContent = s.calcHeading; });
    if (s.calcIntro) document.querySelectorAll('[data-calc="intro"]').forEach(function (el) { el.textContent = s.calcIntro; });
    if (s.calcAreaNote) document.querySelectorAll('[data-calc="areaNote"]').forEach(function (el) { el.textContent = s.calcAreaNote; });
    if (landUnitEl) landUnitEl.textContent = s.calcLandUnit || "perches";
    updateLandConv();
  }
  if (window.__sitePromise) window.__sitePromise.then(applyText); else applyText(SITE);

  /* ---- Load configurable data ------------------------------------------ */
  Promise.all([
    fetch(B + "/api/projecttypes").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch(B + "/api/materials").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch(B + "/api/rooms").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; })
  ]).then(function (res) {
    TYPES = res[0] || []; MATERIALS = res[1] || []; ROOMS = res[2] || [];
    renderTypes(); renderMaterials(); renderRooms();
    showStep(1);
  });
})();
