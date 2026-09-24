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

  // Contact form and order requests are delivered via Formspree (https://formspree.io).
  // Create a form for contact@ladykattluxe.shop and paste its ID here, e.g. 'xyzabcde'.
  // Until this is set, both forms open the visitor's email app instead.
  var FORMSPREE_FORM_ID = '';
  var MAX_QTY = 10;

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

  function moneyExact(cents) { return '$' + (cents / 100).toFixed(2); }

  // Sends a form either through Formspree or, if it isn't connected yet, by
  // opening the visitor's email app with the message filled in.
  // Resolves with 'sent' or 'mailto'.
  function deliver(subject, replyTo, text, fields) {
    if (!FORMSPREE_FORM_ID) {
      location.href = 'mailto:' + BUSINESS.email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(text);
      return Promise.resolve('mailto');
    }
    var data = new FormData();
    Object.keys(fields || {}).forEach(function (k) { data.append(k, fields[k]); });
    data.append('_subject', subject);
    data.append('_replyto', replyTo);
    return fetch('https://formspree.io/f/' + FORMSPREE_FORM_ID, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error('send'); return 'sent'; });
  }

  // ---------------------------------------------------------------- cart

  var CART_KEY = 'lkl_cart_v1';
  var Cart = {
    items: function () {
      var raw = storageGet(CART_KEY, []);
      return Array.isArray(raw) ? raw.filter(function (i) { return i && i.id && i.qty > 0; }) : [];
    },
    save: function (items) { storageSet(CART_KEY, items); updateCartCount(true); document.dispatchEvent(new CustomEvent('cart:change')); },
    count: function () { return Cart.items().reduce(function (n, i) { return n + i.qty; }, 0); },
    add: function (id, qty) {
      var items = Cart.items();
      var found = items.filter(function (i) { return i.id === id; })[0];
      if (found) found.qty = Math.min(MAX_QTY, found.qty + (qty || 1));
      else items.push({ id: id, qty: Math.min(MAX_QTY, qty || 1) });
      Cart.save(items);
    },
    setQty: function (id, qty) {
      var items = Cart.items().map(function (i) { if (i.id === id) i.qty = Math.max(0, Math.min(MAX_QTY, qty)); return i; })
        .filter(function (i) { return i.qty > 0; });
      Cart.save(items);
    },
    remove: function (id) { Cart.save(Cart.items().filter(function (i) { return i.id !== id; })); },
    clear: function () { Cart.save([]); }
  };

  function updateCartCount(bump) {
    var n = Cart.count();
    $all('.cart-count').forEach(function (el) {
      el.textContent = n;
      el.setAttribute('data-count', n);
      if (bump) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    });
    $all('.cart-link').forEach(function (el) { el.setAttribute('aria-label', 'Shopping bag, ' + n + (n === 1 ? ' item' : ' items')); });
  }

  // ---------------------------------------------------------------- toast

  var toastTimer;
  function toast(html) {
    var t = $('.toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'toast';
      t.setAttribute('role', 'status');
      t.setAttribute('aria-live', 'polite');
      document.body.appendChild(t);
    }
    t.innerHTML = html;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 3200);
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
      '<a class="cart-link" href="cart.html"' + (page === 'cart' ? ' aria-current="page"' : '') + '>' + ICONS.bag +
      '<span class="cart-label">Bag</span><span class="cart-count" data-count="0">0</span></a>' +
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
      '<li><a href="cart.html">Shopping Bag</a></li></ul></div>' +
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
        '<p>We use essential cookies only &mdash; to keep items in your bag, remember your cookie preference, and maintain site security and performance. ' +
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
      buyButton(p) + '</div>' +
      '</div></article>';
  }

  // Products with a Stripe Payment Link go straight to checkout; any without
  // one fall back to the order-request bag.
  function buyButton(p) {
    if (p.paymentLink) return '<a class="add-btn" href="' + esc(p.paymentLink) + '" rel="noopener">Buy now</a>';
    return '<button class="add-btn" type="button" data-add="' + esc(p.id) + '">Add to bag</button>';
  }

  function bindProductActions(root, data) {
    root.addEventListener('click', function (e) {
      var add = e.target.closest('[data-add]');
      if (add) {
        var p = data.byId[add.getAttribute('data-add')];
        if (!p) return;
        Cart.add(p.id, 1);
        add.classList.add('added');
        add.textContent = 'Added';
        setTimeout(function () { add.classList.remove('added'); add.textContent = 'Add to bag'; }, 1600);
        toast(esc(p.name) + ' added to your bag <a href="cart.html">View bag</a>');
        return;
      }
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
    if (typeof dlg.showModal !== 'function') {
      if (p.paymentLink) { location.href = p.paymentLink; return; }
      Cart.add(p.id, 1); toast(esc(p.name) + ' added to your bag'); return;
    }
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
      (p.paymentLink
        ? '<div class="qv-actions"><a class="btn" href="' + esc(p.paymentLink) + '" rel="noopener">Buy now</a></div>' +
          '<p class="muted" style="font-size:.8rem;margin:12px 0 0">Choose your quantity and add a gift note at secure Stripe checkout.</p>'
        : '<div class="qv-actions">' +
      '<div class="qty"><button type="button" data-step="-1" aria-label="Decrease quantity">&minus;</button>' +
      '<input type="number" min="1" max="' + MAX_QTY + '" value="1" aria-label="Quantity"><button type="button" data-step="1" aria-label="Increase quantity">+</button></div>' +
      '<button class="btn" type="button" data-qv-add>Add to bag</button></div>') +
      '<p class="credit">Photo: <a href="https://unsplash.com/@' + esc(p.credit.username) + utm + '" target="_blank" rel="noopener">' + esc(p.credit.name) + '</a> on <a href="https://unsplash.com/' + utm + '" target="_blank" rel="noopener">Unsplash</a></p>' +
      '</div></div>';
    $('.qv-close', dlg).addEventListener('click', function () { dlg.close(); });
    if (p.paymentLink) { dlg.showModal(); return; }
    var input = $('input', dlg);
    $all('[data-step]', dlg).forEach(function (b) {
      b.addEventListener('click', function () {
        input.value = Math.max(1, Math.min(MAX_QTY, (parseInt(input.value, 10) || 1) + parseInt(b.getAttribute('data-step'), 10)));
      });
    });
    $('[data-qv-add]', dlg).addEventListener('click', function () {
      var q = Math.max(1, Math.min(MAX_QTY, parseInt(input.value, 10) || 1));
      Cart.add(p.id, q);
      dlg.close();
      toast(esc(p.name) + (q > 1 ? ' &times; ' + q : '') + ' added to your bag <a href="cart.html">View bag</a>');
    });
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

  // ---------------------------------------------------------------- bag & order request
  // Customers send an order request with their shipping details. Lady Katt Luxe
  // then emails a payment request with the final total (including shipping)
  // and ships once it's paid.

  var US_STATES = 'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ');

  function newOrderNumber() {
    var d = new Date();
    var ymd = String(d.getFullYear()).slice(2) + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2);
    var rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return 'LKL-' + ymd + '-' + rand;
  }

  function initCart() {
    var root = $('#cart-root');

    function field(id, label, attrs, full) {
      return '<div' + (full ? ' class="full"' : '') + '><label for="co-' + id + '">' + label + '</label><input id="co-' + id + '" name="' + id + '" ' + attrs + '></div>';
    }

    function render(data) {
      var items = Cart.items().filter(function (i) { return data.byId[i.id]; });
      if (!items.length) {
        root.innerHTML = '<div class="glass empty-state reveal">' +
          '<span class="eyebrow">Your bag</span><h2>Your bag is waiting</h2>' +
          '<p class="lead" style="margin:0 auto 28px">Nothing here just yet. Explore the collection — or start with one of our gift sets.</p>' +
          '<div class="hero-actions"><a class="btn" href="products.html">Shop the collection</a><a class="btn btn-ghost" href="products.html?category=gift-sets">Gift sets</a></div></div>';
        initReveal(root);
        return;
      }
      var subtotal = items.reduce(function (s, i) { return s + data.byId[i.id].price * i.qty; }, 0);

      root.innerHTML = '<div class="cart-layout">' +
        '<div>' +
        '<section class="glass glass-pad" aria-label="Items in your bag">' +
        items.map(function (i) {
          var p = data.byId[i.id];
          return '<div class="cart-item" data-id="' + esc(p.id) + '">' +
            '<img src="' + imgUrl(p.image, 200, 200) + '" alt="' + esc(p.alt) + '" loading="lazy">' +
            '<div><div class="product-cat">' + esc(data.catNames[p.category]) + '</div><h3>' + esc(p.name) + '</h3>' +
            '<div class="muted" style="font-size:.9rem">' + money(p.price) + ' each</div>' +
            '<div class="cart-item-controls"><div class="qty">' +
            '<button type="button" data-cart-step="-1" aria-label="Decrease quantity of ' + esc(p.name) + '">&minus;</button>' +
            '<input type="number" min="1" max="' + MAX_QTY + '" value="' + i.qty + '" aria-label="Quantity of ' + esc(p.name) + '">' +
            '<button type="button" data-cart-step="1" aria-label="Increase quantity of ' + esc(p.name) + '">+</button></div>' +
            '<button class="remove" type="button" data-remove>Remove</button></div></div>' +
            '<div class="line-total price">' + moneyExact(p.price * i.qty) + '</div></div>';
        }).join('') +
        '</section>' +

        '<section class="glass glass-pad" id="checkout" aria-label="Checkout" style="margin-top:clamp(16px,2.5vw,32px)">' +
        '<h2 style="font-size:1.9rem">Checkout</h2>' +
        '<p style="font-size:.95rem">Send us your order and shipping details. We&rsquo;ll reply within one business day with your total, including shipping, and a secure way to pay. Your order ships as soon as payment is received.</p>' +
        '<form id="checkout-form" class="form-grid" novalidate>' +
        field('name', 'Full name', 'type="text" autocomplete="name" required maxlength="120"') +
        field('email', 'Email', 'type="email" autocomplete="email" required maxlength="200"') +
        field('phone', 'Phone', 'type="tel" autocomplete="tel" required maxlength="40"', true) +
        field('address1', 'Street address', 'type="text" autocomplete="address-line1" required maxlength="160"', true) +
        field('address2', 'Apt, suite, etc. <span class="muted" style="letter-spacing:.1em;text-transform:none">(optional)</span>', 'type="text" autocomplete="address-line2" maxlength="160"', true) +
        field('city', 'City', 'type="text" autocomplete="address-level2" required maxlength="80"') +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
        '<div><label for="co-state">State</label><select class="field" id="co-state" name="state" autocomplete="address-level1" required><option value=""></option>' +
        US_STATES.map(function (st) { return '<option>' + st + '</option>'; }).join('') + '</select></div>' +
        '<div><label for="co-zip">ZIP</label><input id="co-zip" name="zip" type="text" inputmode="numeric" autocomplete="postal-code" required pattern="\\d{5}(-\\d{4})?" maxlength="10"></div>' +
        '</div>' +
        '<div class="full"><label for="co-shipping">Shipping</label><select class="field" id="co-shipping" name="shipping"><option>Standard (3–10 business days)</option><option>Express (2–3 business days)</option></select></div>' +
        '<div class="full"><label for="co-gift">Gift note <span class="muted" style="letter-spacing:.1em;text-transform:none">(optional)</span></label><textarea id="co-gift" name="giftNote" maxlength="255" style="min-height:90px" placeholder="We&rsquo;ll handwrite this and tuck it inside."></textarea></div>' +
        '<div class="full"><label for="co-notes">Order notes <span class="muted" style="letter-spacing:.1em;text-transform:none">(optional)</span></label><textarea id="co-notes" name="notes" maxlength="1000" style="min-height:90px"></textarea></div>' +
        '<div class="hp" aria-hidden="true"><label for="co-website">Website</label><input id="co-website" name="_gotcha" type="text" tabindex="-1" autocomplete="off"></div>' +
        '<div class="full"><button class="btn" type="submit">Place order request</button>' +
        '<p class="form-status" id="checkout-status" role="status" aria-live="polite"></p>' +
        '<p class="muted" style="font-size:.8rem;margin:0">No payment is taken on this site. By placing an order request you agree to our <a href="terms.html" style="border-bottom:1px solid var(--line)">Terms</a>, <a href="shipping.html" style="border-bottom:1px solid var(--line)">Shipping Policy</a>, and <a href="returns.html" style="border-bottom:1px solid var(--line)">Return Policy</a>.</p></div>' +
        '</form></section>' +
        '</div>' +

        '<aside class="glass glass-pad summary-panel" aria-label="Order summary">' +
        '<h2 style="font-size:1.8rem">Order summary</h2>' +
        items.map(function (i) {
          var p = data.byId[i.id];
          return '<div class="summary-row" style="font-size:.92rem"><span>' + esc(p.name) + ' &times; ' + i.qty + '</span><span>' + moneyExact(p.price * i.qty) + '</span></div>';
        }).join('') +
        '<div class="summary-row total"><span>Subtotal</span><span>' + moneyExact(subtotal) + '</span></div>' +
        '<p class="muted" style="font-size:.85rem;margin:10px 0 0">Shipping and any applicable sales tax are added to your payment request.</p>' +
        '<a class="btn btn-block" href="#checkout" style="margin-top:22px">Continue to checkout</a>' +
        '<a class="link-arrow" href="products.html" style="display:table;margin:18px auto 0">Continue shopping</a>' +
        '</aside></div>';

      $all('.cart-item', root).forEach(function (row) {
        var id = row.getAttribute('data-id');
        var input = $('input', row);
        $all('[data-cart-step]', row).forEach(function (b) {
          b.addEventListener('click', function () {
            var next = (parseInt(input.value, 10) || 1) + parseInt(b.getAttribute('data-cart-step'), 10);
            if (next < 1) Cart.remove(id); else Cart.setQty(id, next);
          });
        });
        input.addEventListener('change', function () {
          var v = parseInt(input.value, 10);
          if (!v || v < 1) Cart.remove(id); else Cart.setQty(id, v);
        });
        $('[data-remove]', row).addEventListener('click', function () { Cart.remove(id); });
      });

      bindCheckout($('#checkout-form', root), items, subtotal, data);
    }

    // Keep what the customer typed if the bag re-renders (quantity changes etc.)
    var draft = {};
    function bindCheckout(form, items, subtotal, data) {
      Object.keys(draft).forEach(function (k) { if (form.elements[k]) form.elements[k].value = draft[k]; });
      form.addEventListener('input', function (e) { if (e.target.name) draft[e.target.name] = e.target.value; });
      form.addEventListener('change', function (e) { if (e.target.name) draft[e.target.name] = e.target.value; });

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!form.checkValidity()) { form.reportValidity(); return; }
        var f = new FormData(form);
        if (f.get('_gotcha')) return;
        var order = newOrderNumber();
        var lines = items.map(function (i) {
          var p = data.byId[i.id];
          return '- ' + i.qty + ' × ' + p.name + ' @ ' + moneyExact(p.price) + ' = ' + moneyExact(p.price * i.qty);
        });
        var address = [f.get('name'), f.get('address1'), f.get('address2'), f.get('city') + ', ' + f.get('state') + ' ' + f.get('zip')]
          .filter(function (l) { return l; }).join('\n');
        var text = [
          'ORDER REQUEST ' + order, '',
          'Name: ' + f.get('name'), 'Email: ' + f.get('email'), 'Phone: ' + f.get('phone'), '',
          'Ship to:', address, 'Shipping: ' + f.get('shipping'), '',
          'Items:'].concat(lines).concat([
          'Subtotal: ' + moneyExact(subtotal) + ' (shipping and tax to be added)', '',
          'Gift note: ' + (f.get('giftNote') || '—'),
          'Notes: ' + (f.get('notes') || '—')
        ]).join('\n');

        var btn = $('button[type="submit"]', form);
        var status = $('#checkout-status');
        btn.disabled = true;
        btn.textContent = 'Sending…';
        status.className = 'form-status';
        status.textContent = '';

        deliver('Order request ' + order + ' — ' + f.get('name') + ' (' + moneyExact(subtotal) + ')', f.get('email'), text, {
          order: order, name: f.get('name'), email: f.get('email'), phone: f.get('phone'),
          shipTo: address, shipping: f.get('shipping'), items: lines.join('\n'),
          subtotal: moneyExact(subtotal), giftNote: f.get('giftNote'), notes: f.get('notes')
        }).then(function (how) {
          if (how === 'sent') {
            Cart.clear();
            location.href = 'success.html?order=' + encodeURIComponent(order);
            return;
          }
          // Email app opened — the customer still needs to press send.
          btn.disabled = false;
          btn.textContent = 'Place order request';
          status.className = 'form-status ok';
          status.innerHTML = 'Your email app should now be open with order <strong>' + order + '</strong> ready to go &mdash; just press <strong>Send</strong>. ' +
            'If it didn&rsquo;t open, email your order to <a href="mailto:' + BUSINESS.email + '">' + BUSINESS.email + '</a>.' +
            '<br><button type="button" class="btn btn-sm" id="sent-btn" style="margin-top:14px">I&rsquo;ve sent it</button>';
          $('#sent-btn').addEventListener('click', function () {
            Cart.clear();
            location.href = 'success.html?order=' + encodeURIComponent(order);
          });
        }).catch(function () {
          btn.disabled = false;
          btn.textContent = 'Place order request';
          status.className = 'form-status err';
          status.innerHTML = 'We couldn&rsquo;t send your order. Please try again, or email us at <a href="mailto:' + BUSINESS.email + '">' + BUSINESS.email + '</a>.';
        });
      });
    }

    getCatalog().then(function (data) {
      render(data);
      document.addEventListener('cart:change', function () { render(data); });
    }).catch(function () { root.innerHTML = '<p class="muted">We could not load your bag. Please refresh the page.</p>'; });
  }

  function initSuccess() {
    var order = new URLSearchParams(location.search).get('order');
    if (!order) return;
    // Arriving from the order-request bag rather than Stripe checkout
    $('#paid-msg').hidden = true;
    $('#request-msg').hidden = false;
    if (/^LKL-[\w-]{4,20}$/.test(order)) $('#order-number').textContent = order;
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

      var subject = data.get('subject') + ' — ' + data.get('name');
      var text = ['Name: ' + data.get('name'), 'Email: ' + data.get('email'),
        data.get('phone') ? 'Phone: ' + data.get('phone') : null,
        data.get('orderNumber') ? 'Order #: ' + data.get('orderNumber') : null, '', data.get('message')]
        .filter(function (l) { return l !== null; }).join('\n');
      var btn = $('button[type="submit"]', form);
      btn.disabled = true;
      btn.textContent = 'Sending…';
      status.className = 'form-status';
      status.textContent = '';
      var fields = {};
      data.forEach(function (v, k) { fields[k] = v; });
      deliver('Website: ' + subject, data.get('email'), text, fields)
        .then(function (how) {
          status.className = 'form-status ok';
          if (how === 'sent') {
            form.reset();
            status.textContent = 'Thank you — your message has been received. We reply within one business day.';
          } else {
            status.innerHTML = 'Your email app should open with your message ready to send. If it doesn&rsquo;t, email us at <a href="mailto:' + BUSINESS.email + '">' + BUSINESS.email + '</a>.';
          }
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
    updateCartCount(false);
    initReveal(document);

    var page = document.body.getAttribute('data-page');
    if (page === 'home') initHome();
    if (page === 'products') initProducts();
    if (page === 'contact') initContact();
    if (page === 'cart') initCart();
    if (page === 'success') initSuccess();

    setTimeout(function () { showCookieBanner(false); }, 900);

    // Keep the bag count in sync across tabs
    window.addEventListener('storage', function (e) { if (e.key === CART_KEY) { updateCartCount(false); document.dispatchEvent(new CustomEvent('cart:change')); } });

  });

  window.LKL = { Cart: Cart, getCatalog: getCatalog, BUSINESS: BUSINESS, ICONS: ICONS };
})();
