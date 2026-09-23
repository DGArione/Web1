/* Excello content admin — vanilla SPA talking to the /api/admin endpoints. */
(function () {
  var app = document.getElementById("app");
  var toastEl = document.getElementById("toast");
  /* Base path derived from where this script loaded (…/<prefix>/admin/admin.js),
     so admin calls and the "View site" link work under any sub-folder with or
     without an injected <base>. */
  var B = (function () {
    try {
      var s = (document.currentScript && document.currentScript.src) || "";
      if (s) return new URL(s).pathname.replace(/\/admin\/admin\.js.*$/, "");
    } catch (e) {}
    var b = document.querySelector("base"); return b ? (b.getAttribute("href") || "/").replace(/\/+$/, "") : "";
  })();
  var state = { me: null, coll: "projects", items: [], editing: null, saving: false, site: null, images: null, imgPage: "About" };

  /* Page Images: editable image slots per page (keys match data-img on the pages). */
  var IMAGE_SLOTS = {
    About: [
      { k: "about.hero", label: "Hero image" },
      { k: "about.feature", label: "Feature image (Design & Build)" },
      { k: "about.team1", label: "Team — Leadership & Direction" },
      { k: "about.team2", label: "Team — Architecture & Design" },
      { k: "about.team3", label: "Team — Engineering, QS & Site" }
    ],
    Services: [{ k: "services.hero", label: "Hero image" }],
    Projects: [{ k: "projects.hero", label: "Hero image" }],
    Contact: [{ k: "contact.hero", label: "Hero image" }],
    Availability: [{ k: "availability.hero", label: "Hero image" }]
  };

  var SITE_FIELDS = [
    { k: "companyName", label: "Company name" },
    { k: "tagline", label: "Header tagline (small text under the logo)" },
    { k: "phone", label: "Phone (as shown, e.g. +94 77 022 2000)" },
    { k: "whatsapp", label: "WhatsApp number (digits only, with country code, e.g. 94770222000)" },
    { k: "whatsappText", label: "WhatsApp pre-filled message", type: "textarea" },
    { k: "email", label: "Email address" },
    { k: "addressLine1", label: "Address line 1" },
    { k: "addressLine2", label: "Address line 2" },
    { k: "addressLine3", label: "Address line 3" },
    { k: "facebook", label: "Facebook URL" },
    { k: "linkedin", label: "LinkedIn URL" },
    { k: "instagram", label: "Instagram URL (optional — leave blank to hide)" },
    { k: "formEndpoint", label: "Contact-form endpoint (where submissions are sent)" },
    { k: "seoTitleSuffix", label: "SEO: site name (shown in the browser tab)" },
    { k: "seoDescription", label: "SEO: default meta description", type: "textarea" },
    { k: "__home", label: "Home page — highlighted & selected work", type: "heading" },
    { k: "homeFeatured", label: "Highlighted project", type: "project" },
    { k: "homeFeaturedImage", label: "Highlighted image (optional — overrides the project's cover)", type: "image" },
    { k: "homeSelectedA", label: "Selected work — project 1", type: "project" },
    { k: "homeSelectedImageA", label: "Selected work — image 1 (optional)", type: "image" },
    { k: "homeSelectedB", label: "Selected work — project 2", type: "project" },
    { k: "homeSelectedImageB", label: "Selected work — image 2 (optional)", type: "image" },
    { k: "__avail", label: "Aathavan unit-availability page", type: "heading" },
    { k: "availabilityProject", label: "Development name (e.g. Aathavan by Excello)" },
    { k: "availabilityLocation", label: "Location line" },
    { k: "availabilityHeading", label: "Heading (H1)" },
    { k: "availabilityIntro", label: "Intro description", type: "textarea" },
    { k: "availabilityNote", label: "Small note (e.g. Availability checked daily)" },
    { k: "aathavanPricePerSqFt", label: "Standard price per sq.ft (numbers only)" },
    { k: "availabilityDisclaimer", label: "Availability disclaimer", type: "textarea" },
    { k: "availabilityPay1", label: "Payment structure — line 1" },
    { k: "availabilityPay2", label: "Payment structure — line 2" },
    { k: "availabilityPay3", label: "Payment structure — line 3" },
    { k: "availabilityCtaTitle", label: "Help CTA — title" },
    { k: "availabilityCtaLead", label: "Help CTA — lead line" },
    { k: "availabilityCtaText", label: "Help CTA — supporting text", type: "textarea" },
    { k: "__calc", label: "Construction cost calculator", type: "heading" },
    { k: "calcHeading", label: "Heading (H1)" },
    { k: "calcIntro", label: "Intro description", type: "textarea" },
    { k: "calcCurrency", label: "Currency code (e.g. LKR)" },
    { k: "calcRangePct", label: "Estimate range +/- (percent, e.g. 10)" },
    { k: "calcLandUnit", label: "Land extent unit (e.g. perches)" },
    { k: "calcCoverage", label: "Site coverage % for capacity check (e.g. 65)" },
    { k: "calcProfFeesPct", label: "Professional fees % (0 = off — CONFIRM with client)" },
    { k: "calcContingencyPct", label: "Contingency % (0 = off — CONFIRM with client)" },
    { k: "calcAreaNote", label: "Note about how construction area is derived", type: "textarea" },
    { k: "calcDisclaimer", label: "Calculator disclaimer (the 'Important' note)", type: "textarea" },
    { k: "__calcsplit", label: "Estimate breakdown split (% of total — should add to 100)", type: "heading" },
    { k: "calcSplitSubstructure", label: "Earthwork & substructure %" },
    { k: "calcSplitStructure", label: "Structural shell %" },
    { k: "calcSplitRoof", label: "Roofing & ceiling %" },
    { k: "calcSplitFinishes", label: "Finishes & interior %" },
    { k: "calcSplitMEP", label: "MEP systems & fixtures %" },
    { k: "calcSavingsMin", label: "Savings claim — lower % (e.g. 25)" },
    { k: "calcSavingsMax", label: "Savings claim — upper % (e.g. 35)" },
    { k: "calcSavingsText", label: "Savings supporting line", type: "textarea" }
  ];

  var FIELDS = {
    projects: [
      { k: "title", label: "Title", type: "text", req: true },
      { k: "category", label: "Category", type: "text", half: true },
      { k: "location", label: "Location", type: "text", half: true },
      { k: "year", label: "Year", type: "text", half: true },
      { k: "status", label: "Status", type: "text", half: true },
      { k: "services", label: "Services", type: "text" },
      { k: "excerpt", label: "Short excerpt", type: "textarea" },
      { k: "body", label: "Body (blank line = new paragraph)", type: "textarea", big: true },
      { k: "cover", label: "Cover image", type: "image" },
      { k: "gallery", label: "Gallery images", type: "images" },
      { k: "published", label: "Published (visible on the site)", type: "bool" }
    ],
    insights: [
      { k: "title", label: "Title", type: "text", req: true },
      { k: "category", label: "Category", type: "text", half: true },
      { k: "date", label: "Date (e.g. September 2026)", type: "text", half: true },
      { k: "excerpt", label: "Short excerpt", type: "textarea" },
      { k: "body", label: "Body (blank line = new paragraph)", type: "textarea", big: true },
      { k: "cover", label: "Cover image", type: "image" },
      { k: "published", label: "Published (visible on the site)", type: "bool" }
    ],
    services: [
      { k: "title", label: "Service name", type: "text", req: true },
      { k: "headline", label: "Headline (big line)", type: "text", half: true },
      { k: "headlineEm", label: "Headline italic part", type: "text", half: true },
      { k: "tagline", label: "Intro line (under the headline)", type: "textarea" },
      { k: "card", label: "Home-page card description", type: "textarea" },
      { k: "forWho", label: "For", type: "text" },
      { k: "scope", label: "Scope", type: "text" },
      { k: "deliverables", label: "Deliverables", type: "text" },
      { k: "lead", label: "Lead", type: "text" },
      { k: "connected", label: "Connected to (optional)", type: "text" },
      { k: "projects", label: "Related projects (optional)", type: "text" },
      { k: "cover", label: "Image", type: "image" },
      { k: "published", label: "Published (visible on the site)", type: "bool" }
    ],
    chatbot: [
      { k: "title", label: "Question / button label", type: "text", req: true },
      { k: "keywords", label: "Trigger words (comma-separated — what the visitor might type)", type: "textarea" },
      { k: "answer", label: "Answer", type: "textarea", big: true },
      { k: "quick", label: "Show as a quick-reply button in the chat", type: "bool" },
      { k: "published", label: "Active (chatbot uses this)", type: "bool" }
    ],
    units: [
      { k: "title", label: "Residence number (e.g. AATH-206)", type: "text", req: true },
      { k: "type", label: "Type label (e.g. Type 6)", type: "text", half: true },
      { k: "floor", label: "Floor", type: "number", half: true },
      { k: "configuration", label: "Configuration", type: "select", options: [
        { v: "2 Bedroom", label: "2 Bedroom" },
        { v: "3 Bedroom", label: "3 Bedroom" },
        { v: "3 Bedroom + Maid's Room", label: "3 Bedroom + Maid's Room" }
      ] },
      { k: "area", label: "Area (sq ft)", type: "number", half: true },
      { k: "pricePerSqFt", label: "Price / sq.ft (blank = use standard rate)", type: "number", half: true },
      { k: "status", label: "Status", type: "select", options: [
        { v: "available", label: "Available" }, { v: "reserved", label: "Reserved" }, { v: "sold", label: "Sold" }
      ] },
      { k: "published", label: "Published (visible on the site)", type: "bool" }
    ],
    projecttypes: [
      { k: "title", label: "Project direction name", type: "text", req: true },
      { k: "subtitle", label: "Sub-line (shown on the card)", type: "text" },
      { k: "mode", label: "Behaviour", type: "select", options: [
        { v: "calculator", label: "Continue in the calculator" },
        { v: "whatsapp", label: "Open WhatsApp (feasibility review)" },
        { v: "call", label: "Request a call (contact page)" }
      ] },
      { k: "published", label: "Active (calculator uses this)", type: "bool" }
    ],
    finishes: [
      { k: "title", label: "Finish level name (e.g. Essential, Premium)", type: "text", req: true },
      { k: "rate", label: "Rate (currency / sq.ft)", type: "number" },
      { k: "desc", label: "Description (shown on the row)", type: "text" },
      { k: "pending", label: "Pending review (shown but not selectable)", type: "bool" },
      { k: "published", label: "Active (calculator uses this)", type: "bool" }
    ],
    rooms: [
      { k: "title", label: "Room / space name", type: "text", req: true },
      { k: "areaSmall", label: "Small allowance (sq ft)", type: "number", half: true },
      { k: "areaMedium", label: "Medium allowance (sq ft)", type: "number", half: true },
      { k: "areaLarge", label: "Large allowance (sq ft)", type: "number", half: true },
      { k: "note", label: "Note (optional)", type: "textarea" },
      { k: "published", label: "Active (calculator uses this)", type: "bool" }
    ],
    materials: [
      { k: "title", label: "Influence name (e.g. Walling, Windows)", type: "text", req: true },
      { k: "options", label: "Options (comma-separated). Leave blank for a yes/no toggle.", type: "textarea" },
      { k: "toggle", label: "Show as a yes/no toggle instead of a dropdown", type: "bool" },
      { k: "adjustPct", label: "Cost adjustment % when selected (0 = none — CONFIRM)", type: "number" },
      { k: "note", label: "Note (optional)", type: "textarea" },
      { k: "published", label: "Active (calculator uses this)", type: "bool" }
    ]
  };
  var LABELS = {
    projects: { plural: "Projects", one: "project" },
    insights: { plural: "Insights", one: "insight" },
    services: { plural: "Services", one: "service" },
    chatbot: { plural: "Chatbot", one: "Q&A" },
    units: { plural: "Aathavan Units", one: "unit" },
    projecttypes: { plural: "Project types", one: "project type" },
    finishes: { plural: "Finish levels", one: "finish level" },
    rooms: { plural: "Rooms", one: "room" },
    materials: { plural: "Materials (doors, windows, etc.)", one: "material influence" }
  };
  /* The four calculator collections live under one top-level "Calculator" tab. */
  var CALC_COLLS = ["projecttypes", "finishes", "rooms", "materials"];
  var CALC_SUB = { projecttypes: "Project types", finishes: "Finish levels", rooms: "Rooms", materials: "Materials" };
  function inCalc(c) { return CALC_COLLS.indexOf(c) !== -1; }
  /* Defaults for a brand-new item, per collection. */
  var NEW_DEFAULTS = {
    chatbot: { published: true, quick: false },
    units: { published: true, status: "available", configuration: "3 Bedroom" },
    projecttypes: { published: true, mode: "calculator" },
    finishes: { published: true, pending: false },
    rooms: { published: true },
    materials: { published: true, toggle: false, adjustPct: "0" }
  };

  /* ---- API ---- */
  function api(method, url, body, isForm) {
    if (url && url.charAt(0) === "/") url = B + url;
    var opts = { method: method, headers: {}, credentials: "same-origin" };
    if (body && !isForm) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
    if (body && isForm) opts.body = body;
    return fetch(url, opts).then(function (r) {
      if (r.status === 401) { state.me = null; render(); throw new Error("Session expired — please sign in again."); }
      return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || "Request failed"); return j; });
    });
  }
  function toast(msg) { toastEl.textContent = msg; toastEl.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(function () { toastEl.hidden = true; }, 2600); }
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }

  /* ---- Boot ---- */
  api("GET", "/api/admin/me").then(function (me) { state.me = me; loadItems(); }).catch(function () { render(); });

  function loadItems() {
    if (state.coll === "site") {
      Promise.all([api("GET", "/api/admin/site"), api("GET", "/api/admin/projects")])
        .then(function (r) { state.site = r[0]; state.projectList = r[1] || []; render(); })
        .catch(function () { render(); });
      return;
    }
    if (state.coll === "images") {
      api("GET", "/api/admin/images").then(function (m) { state.images = m || {}; render(); }).catch(function () { state.images = {}; render(); });
      return;
    }
    api("GET", "/api/admin/" + state.coll).then(function (items) { state.items = items; render(); });
  }

  /* ---- Render ---- */
  function render() {
    if (!state.me) return renderLogin();
    renderShell();
  }

  function renderLogin() {
    app.innerHTML =
      '<div class="login"><form class="login__card" id="loginForm">' +
        '<div class="login__logo">EXCELLO</div><div class="login__sub">Content Admin</div>' +
        '<div class="field"><label>Username</label><input type="text" id="u" autocomplete="username" value="admin"></div>' +
        '<div class="field"><label>Password</label><input type="password" id="p" autocomplete="current-password"></div>' +
        '<button class="btn" style="width:100%;justify-content:center" type="submit">Sign in</button>' +
        '<p id="loginErr" style="color:var(--danger);font-size:12px;margin-top:12px;min-height:16px"></p>' +
      "</form></div>";
    document.getElementById("loginForm").addEventListener("submit", function (e) {
      e.preventDefault();
      api("POST", "/admin/login", { user: document.getElementById("u").value, pass: document.getElementById("p").value })
        .then(function (r) { state.me = r; loadItems(); })
        .catch(function (err) { document.getElementById("loginErr").textContent = err.message; });
    });
  }

  function renderShell() {
    var banner = state.me.usesDefaultPassword ? '<div class="banner">You are using the default password. <a href="#" id="chgpw"><strong>Set a new password</strong></a> before going live.</div>' : "";
    app.innerHTML =
      '<header class="top"><div class="brand">EXCELLO<small>Content Admin</small></div>' +
        '<div class="top__right"><span>Signed in as ' + esc(state.me.user) + "</span>" +
        '<button class="btn btn--ghost btn--sm" id="pwBtn">Password</button>' +
        '<button class="btn btn--ghost btn--sm" id="viewBtn">View site</button>' +
        '<button class="btn btn--sm" id="logoutBtn">Log out</button></div></header>' +
      '<div class="wrap">' + banner +
        '<div class="tabs">' +
          '<button class="tab ' + (state.coll === "projects" ? "is-active" : "") + '" data-coll="projects">Projects</button>' +
          '<button class="tab ' + (state.coll === "insights" ? "is-active" : "") + '" data-coll="insights">Insights</button>' +
          '<button class="tab ' + (state.coll === "services" ? "is-active" : "") + '" data-coll="services">Services</button>' +
          '<button class="tab ' + (state.coll === "units" ? "is-active" : "") + '" data-coll="units">Aathavan Units</button>' +
          '<button class="tab ' + (inCalc(state.coll) ? "is-active" : "") + '" data-coll="' + (inCalc(state.coll) ? state.coll : "projecttypes") + '">Calculator</button>' +
          '<button class="tab ' + (state.coll === "chatbot" ? "is-active" : "") + '" data-coll="chatbot">Chatbot</button>' +
          '<button class="tab ' + (state.coll === "images" ? "is-active" : "") + '" data-coll="images">Page Images</button>' +
          '<button class="tab ' + (state.coll === "site" ? "is-active" : "") + '" data-coll="site">Site details</button>' +
        "</div>" +
        (inCalc(state.coll)
          ? '<div class="subtabs">' + CALC_COLLS.map(function (c) { return '<button class="subtab ' + (state.coll === c ? "is-active" : "") + '" data-subcoll="' + c + '">' + CALC_SUB[c] + "</button>"; }).join("") + "</div>" +
            '<p class="subhint">One calculator, edited part by part. Add or change project types, finish levels &amp; rates, rooms and their sizes, and material options — including door and window types — one by one.</p>'
          : "") +
        (state.coll === "site"
          ? '<div class="head"><h2>Site details</h2></div>' + renderSite()
          : state.coll === "images"
          ? '<div class="head"><h2>Page Images</h2></div>' + renderImages()
          : '<div class="head"><h2>' + LABELS[state.coll].plural + " <span style=\"color:var(--muted);font-family:var(--sans);font-size:14px\">(" + state.items.length + ')</span></h2><button class="btn" id="newBtn">+ New ' + LABELS[state.coll].one + "</button></div>" + renderList()) +
      "</div>" +
      '<div class="drawer" id="drawer"><div class="drawer__scrim" data-close></div><div class="drawer__panel" id="panel"></div></div>';

    document.getElementById("logoutBtn").onclick = function () { api("POST", "/admin/logout").then(function () { state.me = null; render(); }); };
    document.getElementById("viewBtn").onclick = function () { window.open((B || "") + "/", "_blank"); };
    document.getElementById("pwBtn").onclick = changePassword;
    if (document.getElementById("chgpw")) document.getElementById("chgpw").onclick = function (e) { e.preventDefault(); changePassword(); };
    var newBtn = document.getElementById("newBtn");
    if (newBtn) newBtn.onclick = function () { openEditor(null); };
    Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (t) {
      t.onclick = function () { state.coll = t.dataset.coll; state.items = []; loadItems(); };
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-subcoll]"), function (t) {
      t.onclick = function () { state.coll = t.dataset.subcoll; state.items = []; loadItems(); };
    });
    if (state.coll === "site") bindSite();
    if (state.coll === "images") bindImages();
    Array.prototype.forEach.call(document.querySelectorAll("[data-edit]"), function (b) { b.onclick = function () { openEditor(b.dataset.edit); }; });
    Array.prototype.forEach.call(document.querySelectorAll("[data-del]"), function (b) { b.onclick = function () { del(b.dataset.del); }; });
    Array.prototype.forEach.call(document.querySelectorAll("[data-toggle]"), function (b) { b.onclick = function () { togglePublish(b.dataset.toggle); }; });
  }

  function renderList() {
    if (!state.items.length) return '<div class="list"><div class="empty">Nothing here yet. Click “New” to add the first one.</div></div>';
    return '<div class="list">' + state.items.map(function (it) {
      var meta;
      if (state.coll === "units") {
        meta = [it.configuration, it.floor ? "Floor " + it.floor : "", it.area ? it.area + " sq.ft" : "", it.status].filter(Boolean).map(esc).join(" · ");
      } else if (state.coll === "projecttypes") {
        meta = [esc(it.subtitle || ""), it.mode ? "→ " + esc(it.mode) : ""].filter(Boolean).join(" · ");
      } else if (state.coll === "finishes") {
        meta = [it.rate ? esc(it.rate) + " / sq.ft" : "", esc(it.desc || "").slice(0, 48), it.pending ? "PENDING" : ""].filter(Boolean).join(" · ");
      } else if (state.coll === "rooms") {
        meta = [it.areaSmall ? "S " + esc(it.areaSmall) : "", it.areaMedium ? "M " + esc(it.areaMedium) : "", it.areaLarge ? "L " + esc(it.areaLarge) : ""].filter(Boolean).join(" · ");
      } else if (state.coll === "materials") {
        meta = [it.toggle ? "toggle" : (it.options ? esc(it.options).slice(0, 40) : ""), (it.adjustPct && it.adjustPct !== "0") ? "+" + esc(it.adjustPct) + "%" : ""].filter(Boolean).join(" · ");
      } else {
        meta = [it.category, it.location || it.date, it.year].filter(Boolean).map(esc).join(" · ");
        if (!meta && (it.tagline || it.card || it.answer)) meta = esc((it.tagline || it.card || it.answer).slice(0, 64));
      }
      var thumb = it.cover ? '<img src="' + esc(it.cover) + '" alt="">' : "";
      return '<div class="row">' +
        '<div class="row__thumb">' + thumb + "</div>" +
        '<div><div class="row__title">' + esc(it.title) + '</div><div class="row__meta">' + meta + " · /" + esc(it.slug) + "</div></div>" +
        '<div class="row__actions">' +
          '<button class="pill ' + (it.published !== false ? "is-live" : "") + '" data-toggle="' + it.id + '">' + (it.published !== false ? "Live" : "Draft") + "</button>" +
          '<button class="btn btn--ghost btn--sm" data-edit="' + it.id + '">Edit</button>' +
          '<button class="btn btn--danger btn--sm" data-del="' + it.id + '">Delete</button>' +
        "</div></div>";
    }).join("") + "</div>";
  }

  /* ---- Site details (single settings record) ---- */
  function renderSite() {
    var s = state.site || {};
    var body = SITE_FIELDS.map(function (f) {
      var raw = s[f.k] || "", v = esc(raw), lab = esc(f.label);
      if (f.type === "heading") return '<h3 style="margin:30px 0 6px;font-size:15px;letter-spacing:.02em;border-top:1px solid #e7e2d7;padding-top:22px">' + lab + "</h3>";
      if (f.type === "textarea") return '<div class="field"><label>' + lab + '</label><textarea data-sk="' + f.k + '">' + v + "</textarea></div>";
      if (f.type === "image") return '<div class="field"><label>' + lab + '</label><div class="cover" data-cover="' + f.k + '">' + (raw ? '<img src="' + v + '">' : "") + '</div><div class="uploader" data-siteup="' + f.k + '">Click or drop an image here</div>' + (raw ? '<button type="button" class="btn btn--ghost btn--sm" data-siteclear="' + f.k + '" style="margin-top:8px">Remove image</button>' : "") + "</div>";
      if (f.type === "project") {
        var opts = '<option value="">— Select a project —</option>' + (state.projectList || []).map(function (p) {
          return '<option value="' + esc(p.slug) + '"' + (p.slug === raw ? " selected" : "") + ">" + esc(p.title) + "</option>";
        }).join("");
        return '<div class="field"><label>' + lab + '</label><select data-sk="' + f.k + '">' + opts + "</select></div>";
      }
      return '<div class="field"><label>' + lab + '</label><input type="text" data-sk="' + f.k + '" value="' + v + '"></div>';
    }).join("");
    return '<div class="siteform" style="max-width:680px">' + body +
      '<div style="margin-top:8px"><button class="btn" id="siteSave">Save site details</button></div>' +
      '<p style="color:var(--muted);font-size:12px;margin-top:14px">These drive the header, footer, menu, WhatsApp button and contact page across the whole site.</p>' +
      "</div>";
  }
  function bindSite() {
    state.site = state.site || {};
    Array.prototype.forEach.call(document.querySelectorAll("[data-sk]"), function (el) {
      el.oninput = el.onchange = function () { state.site[el.dataset.sk] = el.value; };
    });
    /* Image uploaders on the Site tab (highlighted / selected / hero images). */
    Array.prototype.forEach.call(document.querySelectorAll("[data-siteup]"), function (u) {
      var key = u.dataset.siteup;
      wireUpload(u, false, function (url) {
        state.site[key] = url;
        var box = document.querySelector('[data-cover="' + key + '"]');
        if (box) box.innerHTML = '<img src="' + esc(url) + '">';
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-siteclear]"), function (b) {
      b.onclick = function () {
        var key = b.dataset.siteclear;
        state.site[key] = "";
        var box = document.querySelector('[data-cover="' + key + '"]');
        if (box) box.innerHTML = "";
        b.style.display = "none";
      };
    });
    var btn = document.getElementById("siteSave");
    if (btn) btn.onclick = function () {
      api("PUT", "/api/admin/site", state.site).then(function (s) { state.site = s; toast("Site details saved."); }).catch(function (e) { toast(e.message); });
    };
  }

  /* ---- Page Images (per-page image slots, saved on each change) ---- */
  function renderImages() {
    state.images = state.images || {};
    var pages = Object.keys(IMAGE_SLOTS);
    if (pages.indexOf(state.imgPage) === -1) state.imgPage = pages[0];
    var tabs = '<div class="subtabs">' + pages.map(function (p) {
      return '<button class="subtab ' + (state.imgPage === p ? "is-active" : "") + '" data-imgpage="' + esc(p) + '">' + esc(p) + "</button>";
    }).join("") + "</div>";
    var slots = IMAGE_SLOTS[state.imgPage].map(function (f) {
      var raw = state.images[f.k] || "", v = esc(raw);
      return '<div class="field" style="max-width:520px">' +
        '<label>' + esc(f.label) + '</label>' +
        '<div class="cover" data-imgcover="' + f.k + '">' + (raw ? '<img src="' + v + '">' : "") + "</div>" +
        '<div class="uploader" data-imgup="' + f.k + '">Click or drop an image here</div>' +
        (raw ? '<button type="button" class="btn btn--ghost btn--sm" data-imgclear="' + f.k + '" style="margin-top:8px">Remove image</button>' : "") +
        "</div>";
    }).join("");
    return tabs +
      '<p class="subhint">Change the images on each page here — one by one. Uploads save immediately. Leave a hero empty to use the dark placeholder.</p>' +
      '<div class="siteform">' + slots + "</div>";
  }
  function bindImages() {
    state.images = state.images || {};
    Array.prototype.forEach.call(document.querySelectorAll("[data-imgpage]"), function (t) {
      t.onclick = function () { state.imgPage = t.dataset.imgpage; render(); };
    });
    function persist(msg) {
      api("PUT", "/api/admin/images", state.images).then(function (m) { state.images = m; if (msg) toast(msg); }).catch(function (e) { toast(e.message); });
    }
    Array.prototype.forEach.call(document.querySelectorAll("[data-imgup]"), function (u) {
      var key = u.dataset.imgup;
      wireUpload(u, false, function (url) {
        state.images[key] = url;
        var box = document.querySelector('[data-imgcover="' + key + '"]');
        if (box) box.innerHTML = '<img src="' + esc(url) + '">';
        persist("Image updated.");
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-imgclear]"), function (b) {
      b.onclick = function () {
        var key = b.dataset.imgclear;
        state.images[key] = "";
        var box = document.querySelector('[data-imgcover="' + key + '"]');
        if (box) box.innerHTML = "";
        b.style.display = "none";
        persist("Image removed.");
      };
    });
  }

  /* ---- Editor ---- */
  function openEditor(id) {
    var item = id ? JSON.parse(JSON.stringify(state.items.find(function (x) { return x.id === id; }))) : Object.assign({ published: true, gallery: [] }, NEW_DEFAULTS[state.coll] || {});
    state.editing = item;
    var fields = FIELDS[state.coll];
    var html = '<div class="drawer__head"><h3>' + (id ? "Edit" : "New " + LABELS[state.coll].one) + '</h3><button class="btn btn--ghost btn--sm" data-close>Close</button></div>';
    var i = 0;
    while (i < fields.length) {
      var f = fields[i];
      if (f.half && fields[i + 1] && fields[i + 1].half) { html += '<div class="grid2">' + fieldHtml(f, item) + fieldHtml(fields[i + 1], item) + "</div>"; i += 2; }
      else { html += fieldHtml(f, item); i += 1; }
    }
    html += '<div class="drawer__foot"><button class="btn" id="saveBtn">Save</button><button class="btn btn--ghost" data-close>Cancel</button><span class="spacer"></span>' +
      (id ? '<button class="btn btn--danger btn--ghost" id="delBtn" style="border-color:var(--danger);color:var(--danger)">Delete</button>' : "") + "</div>";
    document.getElementById("panel").innerHTML = html;
    document.getElementById("drawer").classList.add("is-open");
    bindEditor(item, id);
  }

  function fieldHtml(f, item) {
    var v = item[f.k];
    if (f.type === "text") return '<div class="field"><label>' + f.label + (f.req ? " *" : "") + '</label><input type="text" data-k="' + f.k + '" value="' + esc(v || "") + '"></div>';
    if (f.type === "number") return '<div class="field"><label>' + f.label + (f.req ? " *" : "") + '</label><input type="number" step="any" data-k="' + f.k + '" value="' + esc(v == null ? "" : v) + '"></div>';
    if (f.type === "select") {
      var opts = (f.options || []).map(function (o) {
        return '<option value="' + esc(o.v) + '"' + (String(v) === String(o.v) ? " selected" : "") + ">" + esc(o.label) + "</option>";
      }).join("");
      return '<div class="field"><label>' + f.label + '</label><select data-k="' + f.k + '">' + opts + "</select></div>";
    }
    if (f.type === "textarea") return '<div class="field"><label>' + f.label + '</label><textarea class="' + (f.big ? "big" : "") + '" data-k="' + f.k + '">' + esc(v || "") + "</textarea></div>";
    if (f.type === "bool") return '<div class="field"><label class="check"><input type="checkbox" data-k="' + f.k + '" ' + (v !== false ? "checked" : "") + "> " + f.label + "</label></div>";
    if (f.type === "image") return '<div class="field"><label>' + f.label + '</label><div class="cover" data-cover>' + (v ? '<img src="' + esc(v) + '">' : "") + '</div><div class="uploader" data-up="' + f.k + '">Click or drop an image here</div></div>';
    if (f.type === "images") return '<div class="field"><label>' + f.label + '</label><div class="thumbs" data-thumbs></div><div class="uploader" data-up-multi="' + f.k + '">Click or drop images here</div></div>';
    return "";
  }

  function bindEditor(item, id) {
    var panel = document.getElementById("panel");
    /* close on the backdrop scrim and every Close/Cancel control */
    Array.prototype.forEach.call(document.getElementById("drawer").querySelectorAll("[data-close]"), function (b) { b.onclick = closeEditor; });
    Array.prototype.forEach.call(panel.querySelectorAll("[data-k]"), function (el) {
      el.oninput = el.onchange = function () { item[el.dataset.k] = el.type === "checkbox" ? el.checked : el.value; };
    });
    /* single image uploaders */
    Array.prototype.forEach.call(panel.querySelectorAll("[data-up]"), function (u) {
      var key = u.dataset.up;
      wireUpload(u, false, function (url) { item[key] = url; var box = u.previousElementSibling; box.innerHTML = '<img src="' + esc(url) + '">'; });
    });
    /* gallery uploaders */
    Array.prototype.forEach.call(panel.querySelectorAll("[data-up-multi]"), function (u) {
      var key = u.dataset.upMulti;
      item[key] = item[key] || [];
      var box = u.previousElementSibling;
      function paint() {
        box.innerHTML = item[key].map(function (url, idx) { return '<div class="thumb"><img src="' + esc(url) + '"><button type="button" data-rm="' + idx + '">×</button></div>'; }).join("");
        Array.prototype.forEach.call(box.querySelectorAll("[data-rm]"), function (b) { b.onclick = function () { item[key].splice(parseInt(b.dataset.rm, 10), 1); paint(); }; });
      }
      paint();
      wireUpload(u, true, function (url) { item[key].push(url); paint(); });
    });
    var saveBtn = document.getElementById("saveBtn");
    if (saveBtn) saveBtn.onclick = function () { save(item, id); };
    var delBtn = document.getElementById("delBtn");
    if (delBtn) delBtn.onclick = function () { del(id, true); };
  }

  function wireUpload(el, multi, onUrl) {
    function pick() {
      var inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; if (multi) inp.multiple = true;
      inp.onchange = function () { Array.prototype.forEach.call(inp.files, uploadOne); };
      inp.click();
    }
    function uploadOne(file) {
      var fd = new FormData(); fd.append("file", file);
      el.textContent = "Uploading…";
      api("POST", "/api/admin/upload", fd, true).then(function (r) { onUrl(r.url); el.textContent = multi ? "Click or drop images here" : "Replace image"; })
        .catch(function (e) { el.textContent = "Click or drop an image here"; toast(e.message); });
    }
    el.onclick = pick;
    el.ondragover = function (e) { e.preventDefault(); el.classList.add("drag"); };
    el.ondragleave = function () { el.classList.remove("drag"); };
    el.ondrop = function (e) { e.preventDefault(); el.classList.remove("drag"); Array.prototype.forEach.call(e.dataTransfer.files, uploadOne); };
  }

  function closeEditor() { document.getElementById("drawer").classList.remove("is-open"); state.editing = null; }

  function save(item, id) {
    if (!item.title || !item.title.trim()) return toast("A title is required.");
    var url = "/api/admin/" + state.coll + (id ? "/" + id : "");
    api(id ? "PUT" : "POST", url, item).then(function () { closeEditor(); toast(id ? "Saved." : "Created."); loadItems(); }).catch(function (e) { toast(e.message); });
  }
  function del(id, fromEditor) {
    var it = state.items.find(function (x) { return x.id === id; });
    if (!confirm('Delete "' + (it ? it.title : "this item") + '"? This cannot be undone.')) return;
    api("DELETE", "/api/admin/" + state.coll + "/" + id).then(function () { if (fromEditor) closeEditor(); toast("Deleted."); loadItems(); }).catch(function (e) { toast(e.message); });
  }
  function togglePublish(id) {
    var it = state.items.find(function (x) { return x.id === id; });
    api("PUT", "/api/admin/" + state.coll + "/" + id, { published: it.published === false }).then(function () { loadItems(); }).catch(function (e) { toast(e.message); });
  }
  function changePassword() {
    var pw = prompt("New admin password (at least 6 characters):");
    if (!pw) return;
    api("POST", "/api/admin/password", { password: pw }).then(function () { toast("Password updated."); state.me.usesDefaultPassword = false; render(); }).catch(function (e) { toast(e.message); });
  }

  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && state.editing) closeEditor(); });
})();
