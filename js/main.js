/* Lady Katt Luxe — shared site behaviour.
   Every page includes this file; page-specific setup runs off <body data-page="…">. */
(function () {
  'use strict';

  var BUSINESS = {
    name: 'Lady Katt Luxe LLC',
    email: 'contact@ladykattluxe.shop',
    phone: '904-663-2417',
    phoneHref: '+19046632417',
    city: 'Titusville, Florida',
    businessId: '1556312'
  };

  // Contact form delivery via Formspree (https://formspree.io). Create a form
  // for contact@ladykattluxe.shop and paste its ID here, e.g. 'xyzabcde'.
  // Until this is set, the contact form opens the visitor's email app instead.
  var FORMSPREE_FORM_ID = '';

  var NAV = [
    { href: 'index.html', label: 'Home', page: 'home' },
    { href: 'products.html', label: 'Shop', page: 'products' },
    { href: 'products.html?category=gift-sets', label: 'Gift Sets', page: 'gift-sets' },
    { href: 'about.html', label: 'About', page: 'about' },
    { href: 'contact.html', label: 'Contact', page: 'contact' }
  ];
  var POLICIES = [
    { href: 'shipping.html', label: 'Shipping Policy' },
    { href: 'returns.html', label: 'Return Policy' },
    { href: 'terms.html', label: 'Terms & Conditions' },
    { href: 'privacy.html', label: 'Privacy Policy' },
    { href: 'cookies.html', label: 'Cookie Policy' },
    { href: 'legal.html', label: 'Legal Notice' }
  ];

  var ICONS = {
    diamond: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true"><path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20M12 21 8 9l4-6 4 6z"/></svg>',
    spark: '<svg viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="M6 0c.4 3.2 2.4 5.2 6 6-3.6.8-5.6 2.8-6 6-.4-3.2-2.4-5.2-6-6 3.6-.8 5.6-2.8 6-6z"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'
  };

  // ---------------------------------------------------------------- utilities

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function money(cents) {
    return '$' + (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
  }

  function imgUrl(photo, w, h) {
    return 'https://images.unsplash.com/' + photo + '?auto=format&fit=crop&w=' + w + (h ? '&h=' + h : '') + '&q=75';
  }

  function storageGet(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function storageSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* private mode */ }
  }

  // ---------------------------------------------------------------- catalog

  var catalogPromise = null;
  function getCatalog() {
    if (!catalogPromise) {
      catalogPromise = fetch('data/products.json', { cache: 'no-cache' })
        .then(function (r) { if (!r.ok) throw new Error('catalog'); return r.json(); })
        .then(function (data) {
          data.byId = {};
          data.catNames = {};
          data.products.forEach(function (p) { data.byId[p.id] = p; });
          data.categories.forEach(function (c) { data.catNames[c.id] = c.name; });
          return data;
        });
    }
    return catalogPromise;
  }

  // ---------------------------------------------------------------- chrome

  function brandHtml() {
    return '<a class="brand" href="index.html" aria-label="Lady Katt Luxe — home">' +
      '<span class="brand-mark">' + ICONS.diamond + '</span>' +
      '<span class="brand-name"><b>Lady Katt</b><small>Luxe</small></span></a>';
  }

  function renderHeader() {
    var page = document.body.getAttribute('data-page');
    var params = new URLSearchParams(location.search);
    var current = page === 'products' && params.get('category') === 'gift-sets' ? 'gift-sets' : page;
    var header = document.createElement('header');
    header.className = 'site-header';
    header.innerHTML =
      '<div class="wrap header-inner">' + brandHtml() +
      '<nav class="nav" id="site-nav" aria-label="Main">' +
      NAV.map(function (n) {
        return '<a href="' + n.href + '"' + (n.page === current ? ' aria-current="page"' : '') + '>' + n.label + '</a>';
      }).join('') +
      '</nav>' +
      '<div class="header-actions">' +
      '<button class="menu-toggle" type="button" aria-controls="site-nav" aria-expanded="false" aria-label="Open menu"><span></span></button>' +
      '</div></div>';
    document.body.insertBefore(header, document.body.firstChild);

    var skip = document.createElement('a');
    skip.className = 'skip-link';
    skip.href = '#main';
    skip.textContent = 'Skip to content';
    document.body.insertBefore(skip, document.body.firstChild);

    var toggle = $('.menu-toggle', header);
    toggle.addEventListener('click', function () {
      var open = document.body.classList.toggle('menu-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    $all('.nav a', header).forEach(function (a) {
      a.addEventListener('click', function () { document.body.classList.remove('menu-open'); toggle.setAttribute('aria-expanded', 'false'); });
    });

    var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 10); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function renderFooter() {
    var footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML =
      '<div class="wrap"><div class="glass footer-panel">' +
      '<div class="footer-grid">' +
      '<div>' + brandHtml() +
      '<p style="margin-top:18px">Refined pieces for everyday life — thoughtfully chosen, beautifully packaged, and shipped with care from Titusville, Florida to your door.</p></div>' +
      '<div><h4>Explore</h4><ul>' +
      NAV.map(function (n) { return '<li><a href="' + n.href + '">' + n.label + '</a></li>'; }).join('') +
      '</ul></div>' +
      '<div><h4>Policies</h4><ul>' +
      POLICIES.map(function (p) { return '<li><a href="' + p.href + '">' + p.label + '</a></li>'; }).join('') +
      '<li><a href="#" data-cookie-settings>Cookie Settings</a></li></ul></div>' +
      '<div><h4>Contact</h4><ul>' +
      '<li><a href="mailto:' + BUSINESS.email + '">' + BUSINESS.email + '</a></li>' +
      '<li><a href="tel:' + BUSINESS.phoneHref + '">' + BUSINESS.phone + '</a></li>' +
      '<li><span class="muted">' + BUSINESS.city + '</span></li>' +
      '<li><span class="muted">Business ID ' + BUSINESS.businessId + '</span></li>' +
      '</ul></div>' +
      '</div>' +
      '<div class="footer-bottom">' +
      '<span>Copyright &copy; ' + BUSINESS.name + ' 2026. All rights reserved.</span>' +
      '<span class="pay-icons" aria-label="Accepted payment methods"><span>Visa</span><span>Mastercard</span><span>Amex</span><span>Apple Pay</span><span>Google Pay</span></span>' +
      '</div>' +
      '</div></div>';
    document.body.appendChild(footer);

    $all('[data-cookie-settings]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); showCookieBanner(true); });
    });
  }

  // ---------------------------------------------------------------- sparkles
  // A still field of tiny four-point stars that twinkle slowly — never moving,
  // just catching the light, like diamonds on black velvet.

  function initSparkles() {
    var canvas = document.createElement('canvas');
    canvas.id = 'sparkles';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(canvas, document.body.firstChild);
    var bg = document.createElement('div');
    bg.className = 'backdrop';
    bg.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(bg, document.body.firstChild);

    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var stars = [];
    var w, h;

    function seed() {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.min(70, Math.round((w * h) / 24000));
      stars = [];
      for (var i = 0; i < n; i++) {
        var big = Math.random() < 0.14;
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: big ? 3 + Math.random() * 3.5 : 0.8 + Math.random() * 1.6,
          big: big,
          phase: Math.random() * Math.PI * 2,
          speed: 0.25 + Math.random() * 0.6,
          base: big ? 0.15 : 0.12 + Math.random() * 0.25
        });
      }
    }

    function drawStar(s, a) {
      ctx.globalAlpha = a;
      if (s.big) {
        // four-point glint with soft halo
        var g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 2.2);
        g.addColorStop(0, 'rgba(255,255,255,0.55)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        var r = s.r * 1.6, t = s.r * 0.16;
        ctx.moveTo(s.x, s.y - r);
        ctx.quadraticCurveTo(s.x + t, s.y - t, s.x + r, s.y);
        ctx.quadraticCurveTo(s.x + t, s.y + t, s.x, s.y + r);
        ctx.quadraticCurveTo(s.x - t, s.y + t, s.x - r, s.y);
        ctx.quadraticCurveTo(s.x - t, s.y - t, s.x, s.y - r);
        ctx.fill();
      } else {
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r / 2, 0, Math.PI * 2); ctx.fill();
      }
    }

    function frame(t) {
      ctx.clearRect(0, 0, w, h);
      var time = (t || 0) / 1000;
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var tw = (Math.sin(time * s.speed + s.phase) + 1) / 2; // 0..1
        var a = s.big ? Math.pow(tw, 6) * 0.9 : s.base + tw * 0.45;
        if (a > 0.01) drawStar(s, a);
      }
      ctx.globalAlpha = 1;
      if (!reduce) raf = requestAnimationFrame(frame);
    }

    var raf;
    var resizeTimer;
    seed();
    frame(0);
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { cancelAnimationFrame(raf); seed(); frame(performance.now()); }, 150);
    });
    document.addEventListener('visibilitychange', function () {
      if (reduce) return;
      if (document.hidden) cancelAnimationFrame(raf); else raf = requestAnimationFrame(frame);
    });
  }

  // ---------------------------------------------------------------- reveal

  function initReveal(root) {
    var els = $all('.reveal:not(.is-visible)', root);
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('is-visible'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (e) { io.observe(e); });
  }

  // ---------------------------------------------------------------- cookie banner

  var CONSENT_KEY = 'lkl_cookie_consent';
  function showCookieBanner(force) {
    if (!force && storageGet(CONSENT_KEY, null)) return;
    var el = $('.cookie-banner');
    if (!el) {
      el = document.createElement('div');
      el.className = 'cookie-banner';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-live', 'polite');
      el.setAttribute('aria-label', 'Cookie consent');
      el.innerHTML =
        '<p>We use essential cookies only &mdash; to remember your cookie preference, enable secure checkout, and maintain site security and performance. ' +
        'We do not use cookies for advertising, third-party tracking, or analytics. ' +
        '<a href="cookies.html">Read our Cookie Policy</a></p>' +
        '<div class="cookie-actions">' +
        '<a class="btn btn-ghost btn-sm" href="cookies.html">Learn more</a>' +
        '<button type="button" class="btn btn-sm" data-consent="essential">Accept</button>' +
        '</div>';
      document.body.appendChild(el);
      $all('[data-consent]', el).forEach(function (b) {
        b.addEventListener('click', function () {
          storageSet(CONSENT_KEY, { choice: b.getAttribute('data-consent'), date: new Date().toISOString() });
          el.classList.remove('show');
          document.dispatchEvent(new CustomEvent('cookie:consent', { detail: b.getAttribute('data-consent') }));
        });
      });
    }
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('show'); }); });
  }

  // ---------------------------------------------------------------- products

  function productCard(p, data) {
    var save = p.compareAt ? '<span class="value-note">A ' + money(p.compareAt) + ' value</span>' : '';
    return '<article class="glass product-card reveal">' +
      '<button class="product-media" type="button" data-quickview="' + esc(p.id) + '" aria-label="View details for ' + esc(p.name) + '">' +
      (p.badge ? '<span class="badge">' + esc(p.badge) + '</span>' : '') +
      '<img src="' + imgUrl(p.image, 640, 640) + '" alt="' + esc(p.alt) + '" loading="lazy" width="640" height="640"></button>' +
      '<div class="product-body">' +
      '<div class="product-cat">' + esc(data.catNames[p.category] || '') + '</div>' +
      '<h3 class="product-title">' + esc(p.name) + '</h3>' +
      '<p class="product-desc">' + esc(p.description) + '</p>' +
      '<div class="product-foot"><div class="price">' + money(p.price) + save + '</div>' +
      buyButton(p, 'add-btn') + '</div>' +
      '</div></article>';
  }

  // Checkout happens on Stripe through a Payment Link for each product. Products
  // without a link yet fall back to an order inquiry on the contact page.
  function buyButton(p, cls) {
    if (p.paymentLink) {
      return '<a class="' + cls + '" href="' + esc(p.paymentLink) + '" rel="noopener">Buy now</a>';
    }
    return '<a class="' + cls + '" href="contact.html?product=' + encodeURIComponent(p.id) + '">Inquire to order</a>';
  }

  function bindProductActions(root, data) {
    root.addEventListener('click', function (e) {
      var qv = e.target.closest('[data-quickview]');
      if (qv) openQuickView(data.byId[qv.getAttribute('data-quickview')], data);
    });
  }

  function openQuickView(p, data) {
    if (!p) return;
    var dlg = $('dialog.quickview');
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.className = 'quickview';
      document.body.appendChild(dlg);
      dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    }
    if (typeof dlg.showModal !== 'function') { location.href = p.paymentLink || ('contact.html?product=' + encodeURIComponent(p.id)); return; }
    var includes = p.includes ? '<div class="qv-includes"><h4>Inside the set</h4><ul>' +
      p.includes.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul></div>' : '';
    var utm = '?utm_source=lady_katt_luxe&utm_medium=referral';
    dlg.innerHTML =
      '<button class="qv-close" type="button" aria-label="Close">&times;</button>' +
      '<div class="qv-grid">' +
      '<img src="' + imgUrl(p.image, 900, 1000) + '" alt="' + esc(p.alt) + '">' +
      '<div class="qv-body">' +
      '<div class="product-cat">' + esc(data.catNames[p.category] || '') + '</div>' +
      '<h2 style="font-size:clamp(1.8rem,3vw,2.4rem)">' + esc(p.name) + '</h2>' +
      '<div class="price" style="font-size:1.3rem;margin-bottom:18px">' + money(p.price) +
      (p.compareAt ? ' <s>' + money(p.compareAt) + '</s><span class="value-note">You save ' + money(p.compareAt - p.price) + '</span>' : '') + '</div>' +
      '<p>' + esc(p.description) + '</p>' + includes +
      (p.details ? '<ul>' + p.details.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul>' : '') +
      '<div class="qv-actions">' + buyButton(p, 'btn') + '</div>' +
      '<p class="muted" style="font-size:.8rem;margin:12px 0 0">' + (p.paymentLink
        ? 'Secure checkout by Stripe. Choose quantity and shipping at checkout.'
        : 'Online checkout for this piece is coming soon &mdash; send us a note and we&rsquo;ll arrange your order.') + '</p>' +
      '<p class="credit">Photo: <a href="https://unsplash.com/@' + esc(p.credit.username) + utm + '" target="_blank" rel="noopener">' + esc(p.credit.name) + '</a> on <a href="https://unsplash.com/' + utm + '" target="_blank" rel="noopener">Unsplash</a></p>' +
      '</div></div>';
    $('.qv-close', dlg).addEventListener('click', function () { dlg.close(); });
    dlg.showModal();
  }

  // ---------------------------------------------------------------- pages

  function initHome() {
    var grid = $('#featured-grid');
    if (!grid) return;
    getCatalog().then(function (data) {
      var featured = data.products.filter(function (p) { return p.featured; }).slice(0, 8);
      grid.innerHTML = featured.map(function (p) { return productCard(p, data); }).join('');
      bindProductActions(grid, data);
      initReveal(grid);
    }).catch(function () { grid.innerHTML = '<p class="muted">Our collection is loading slowly — please refresh the page.</p>'; });
  }

  function initProducts() {
    var grid = $('#product-grid');
    var filters = $('#filters');
    var sort = $('#sort');
    var countEl = $('#product-count');
    var titleEl = $('#shop-title');
    getCatalog().then(function (data) {
      var params = new URLSearchParams(location.search);
      var active = params.get('category') || 'all';
      if (active !== 'all' && !data.catNames[active]) active = 'all';

      filters.innerHTML = '<button class="chip" type="button" data-cat="all">All</button>' +
        data.categories.map(function (c) { return '<button class="chip" type="button" data-cat="' + c.id + '">' + esc(c.name) + '</button>'; }).join('');

      function render() {
        $all('.chip', filters).forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-cat') === active)); });
        var list = data.products.filter(function (p) { return active === 'all' || p.category === active; });
        var order = sort.value;
        if (order === 'price-asc') list.sort(function (a, b) { return a.price - b.price; });
        else if (order === 'price-desc') list.sort(function (a, b) { return b.price - a.price; });
        else if (order === 'name') list.sort(function (a, b) { return a.name.localeCompare(b.name); });
        grid.innerHTML = list.map(function (p) { return productCard(p, data); }).join('');
        countEl.textContent = list.length + (list.length === 1 ? ' piece' : ' pieces');
        titleEl.textContent = active === 'all' ? 'The Collection' : data.catNames[active];
        initReveal(grid);
      }

      filters.addEventListener('click', function (e) {
        var chip = e.target.closest('[data-cat]');
        if (!chip) return;
        active = chip.getAttribute('data-cat');
        var url = new URL(location.href);
        if (active === 'all') url.searchParams.delete('category'); else url.searchParams.set('category', active);
        history.replaceState(null, '', url);
        render();
      });
      sort.addEventListener('change', render);
      bindProductActions(grid, data);
      render();
    }).catch(function () { grid.innerHTML = '<p class="muted">We could not load the collection. Please refresh the page.</p>'; });
  }

  function initContact() {
    var form = $('#contact-form');
    if (!form) return;
    var status = $('#contact-status');

    // Arriving from an "Inquire to order" button: prefill the message
    var productId = new URLSearchParams(location.search).get('product');
    if (productId) {
      getCatalog().then(function (data) {
        var p = data.byId[productId];
        if (!p) return;
        $('#cf-subject').value = 'Order inquiry';
        var msg = $('#cf-message');
        if (!msg.value) msg.value = 'Hello! I would like to order the ' + p.name + ' (' + money(p.price) + '). Quantity: 1\n\nShipping ZIP code: ';
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var data = new FormData(form);

      if (!FORMSPREE_FORM_ID) {
        // No form service connected yet: hand the message to the visitor's email app.
        var body = ['Name: ' + data.get('name'), 'Email: ' + data.get('email'),
          data.get('phone') ? 'Phone: ' + data.get('phone') : '',
          data.get('orderNumber') ? 'Order #: ' + data.get('orderNumber') : '', '', data.get('message')]
          .filter(function (l, i) { return l !== '' || i === 4; }).join('\n');
        location.href = 'mailto:' + BUSINESS.email + '?subject=' + encodeURIComponent(data.get('subject') + ' — ' + data.get('name')) +
          '&body=' + encodeURIComponent(body);
        status.className = 'form-status ok';
        status.innerHTML = 'Your email app should open with your message ready to send. If it doesn&rsquo;t, email us at <a href="mailto:' + BUSINESS.email + '">' + BUSINESS.email + '</a>.';
        return;
      }

      var btn = $('button[type="submit"]', form);
      btn.disabled = true;
      btn.textContent = 'Sending…';
      status.className = 'form-status';
      status.textContent = '';
      data.append('_subject', 'Website: ' + data.get('subject') + ' — ' + data.get('name'));
      data.append('_replyto', data.get('email'));
      fetch('https://formspree.io/f/' + FORMSPREE_FORM_ID, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error('send'); })
        .then(function () {
          form.reset();
          status.className = 'form-status ok';
          status.textContent = 'Thank you — your message has been received. We reply within one business day.';
        })
        .catch(function () {
          status.className = 'form-status err';
          status.innerHTML = 'We couldn&rsquo;t send your message. Please email us at <a href="mailto:' + BUSINESS.email + '">' + BUSINESS.email + '</a>.';
        })
        .then(function () { btn.disabled = false; btn.textContent = 'Send message'; });
    });
  }

  // ---------------------------------------------------------------- boot

  document.addEventListener('DOMContentLoaded', function () {
    initSparkles();
    renderHeader();
    renderFooter();
    initReveal(document);

    var page = document.body.getAttribute('data-page');
    if (page === 'home') initHome();
    if (page === 'products') initProducts();
    if (page === 'contact') initContact();

    setTimeout(function () { showCookieBanner(false); }, 900);

  });

  window.LKL = { getCatalog: getCatalog, BUSINESS: BUSINESS, ICONS: ICONS };
})();
