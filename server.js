'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');

const PORT = process.env.PORT || 3000;
const SITE_URL = (process.env.SITE_URL || `http://localhost:${PORT}`).replace(/\/+$/, '');
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');

// Shipping rules — keep in sync with public/shipping.html and public/js/main.js
const FREE_SHIPPING_THRESHOLD = 7500; // cents
const STANDARD_SHIPPING = 695;
const EXPRESS_SHIPPING = 1495;
const MAX_QTY_PER_ITEM = 10;

const stripe = process.env.STRIPE_SECRET_KEY
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

// The catalog is the single source of truth for prices. The browser only ever
// sends product ids and quantities; prices are looked up here so they can't be
// tampered with.
function loadCatalog() {
  const raw = fs.readFileSync(path.join(PUBLIC_DIR, 'data', 'products.json'), 'utf8');
  const catalog = JSON.parse(raw);
  return new Map(catalog.products.map((p) => [p.id, p]));
}
const catalog = loadCatalog();

const app = express();
app.disable('x-powered-by');

// Stripe webhooks need the raw body, so this route is registered before the JSON parser.
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(501).end();
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === 'checkout.session.completed') {
    const s = event.data.object;
    appendJsonLine('orders.jsonl', {
      receivedAt: new Date().toISOString(),
      sessionId: s.id,
      email: s.customer_details && s.customer_details.email,
      amountTotal: s.amount_total,
      paymentStatus: s.payment_status,
    });
  }
  res.json({ received: true });
});

app.use(express.json({ limit: '20kb' }));

app.get('/api/config', (req, res) => {
  res.json({ checkoutEnabled: Boolean(stripe) });
});

app.post('/api/create-checkout-session', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({
      error: 'Online checkout is not yet configured. Please contact us to complete your order.',
    });
  }

  const items = Array.isArray(req.body && req.body.items) ? req.body.items : [];
  const lineItems = [];
  let subtotal = 0;

  for (const item of items) {
    const product = catalog.get(String(item.id));
    const qty = Math.floor(Number(item.qty));
    if (!product || !Number.isFinite(qty) || qty < 1) continue;
    const quantity = Math.min(qty, MAX_QTY_PER_ITEM);
    subtotal += product.price * quantity;
    lineItems.push({
      quantity,
      price_data: {
        currency: 'usd',
        unit_amount: product.price,
        product_data: {
          name: product.name,
          description: product.description,
          images: [unsplashUrl(product.image, 800)],
          metadata: { product_id: product.id },
        },
      },
    });
  }

  if (lineItems.length === 0) {
    return res.status(400).json({ error: 'Your bag is empty.' });
  }

  const freeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      shipping_address_collection: { allowed_countries: ['US'] },
      phone_number_collection: { enabled: true },
      shipping_options: [
        {
          shipping_rate_data: {
            display_name: freeShipping ? 'Complimentary Standard Shipping' : 'Standard Shipping',
            type: 'fixed_amount',
            fixed_amount: { amount: freeShipping ? 0 : STANDARD_SHIPPING, currency: 'usd' },
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 3 },
              maximum: { unit: 'business_day', value: 7 },
            },
          },
        },
        {
          shipping_rate_data: {
            display_name: 'Express Shipping',
            type: 'fixed_amount',
            fixed_amount: { amount: EXPRESS_SHIPPING, currency: 'usd' },
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 2 },
              maximum: { unit: 'business_day', value: 3 },
            },
          },
        },
      ],
      custom_fields: [
        {
          key: 'gift_note',
          label: { type: 'custom', custom: 'Gift note (optional)' },
          type: 'text',
          optional: true,
          text: { maximum_length: 255 },
        },
      ],
      custom_text: {
        submit: {
          message: `By completing your purchase you agree to our Terms & Conditions (${SITE_URL}/terms.html) and Returns & Refunds Policy (${SITE_URL}/returns.html).`,
        },
      },
      allow_promotion_codes: true,
      success_url: `${SITE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/cart.html`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(500).json({ error: 'We could not start checkout. Please try again in a moment.' });
  }
});

app.get('/api/checkout-session', async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Checkout not configured.' });
  const id = String(req.query.session_id || '');
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return res.status(400).json({ error: 'Invalid session.' });
  try {
    const s = await stripe.checkout.sessions.retrieve(id);
    res.json({
      status: s.payment_status,
      email: s.customer_details && s.customer_details.email,
      name: s.customer_details && s.customer_details.name,
      amountTotal: s.amount_total,
    });
  } catch (err) {
    res.status(404).json({ error: 'Order not found.' });
  }
});

// Contact form ----------------------------------------------------------------

const recentContacts = new Map(); // ip -> [timestamps]
function rateLimited(ip) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const hits = (recentContacts.get(ip) || []).filter((t) => now - t < windowMs);
  hits.push(now);
  recentContacts.set(ip, hits);
  return hits.length > 5;
}

let mailer = null;
if (process.env.SMTP_HOST) {
  const nodemailer = require('nodemailer');
  mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

app.post('/api/contact', async (req, res) => {
  const body = req.body || {};
  // Honeypot field — real visitors never see or fill it.
  if (body.website) return res.json({ ok: true });

  const clean = (v, max) => String(v || '').trim().slice(0, max);
  const name = clean(body.name, 120);
  const email = clean(body.email, 200);
  const phone = clean(body.phone, 40);
  const subject = clean(body.subject, 120) || 'General inquiry';
  const orderNumber = clean(body.orderNumber, 60);
  const message = clean(body.message, 5000);

  if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please include your name, a valid email, and a message.' });
  }
  if (rateLimited(req.ip)) {
    return res.status(429).json({ error: 'Too many messages. Please try again later or email us directly.' });
  }

  const record = { receivedAt: new Date().toISOString(), name, email, phone, subject, orderNumber, message };

  try {
    if (mailer) {
      await mailer.sendMail({
        from: process.env.CONTACT_FROM || process.env.SMTP_USER,
        to: process.env.CONTACT_TO || 'contact@ladykattluxe.shop',
        replyTo: `${name} <${email}>`,
        subject: `[Website] ${subject} — ${name}`,
        text: [
          `Name: ${name}`,
          `Email: ${email}`,
          phone ? `Phone: ${phone}` : null,
          orderNumber ? `Order #: ${orderNumber}` : null,
          '',
          message,
        ].filter((l) => l !== null).join('\n'),
      });
    } else {
      appendJsonLine('messages.jsonl', record);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Contact form error:', err.message);
    res.status(500).json({ error: 'We could not send your message. Please email contact@ladykattluxe.shop.' });
  }
});

// Static site -------------------------------------------------------------------

app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

app.use((req, res) => {
  res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html'));
});

function appendJsonLine(file, obj) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.appendFileSync(path.join(DATA_DIR, file), JSON.stringify(obj) + '\n');
}

function unsplashUrl(photo, width) {
  return `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=${width}&q=80`;
}

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Lady Katt Luxe running at ${SITE_URL}`);
    if (!stripe) console.log('Note: STRIPE_SECRET_KEY is not set — checkout is disabled.');
    if (!mailer) console.log('Note: SMTP is not configured — contact messages are saved to data/messages.jsonl.');
  });
}

module.exports = app;
