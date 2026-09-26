/**
 * Lady Katt Luxe — Stripe checkout helper (Cloudflare Worker)
 *
 * GitHub Pages can't talk to Stripe securely, so this tiny worker does it.
 * The site sends the bag contents (product ids + quantities). The worker looks
 * up the real prices in the site's own catalog (data/products.json), starts a
 * Stripe Checkout session for the whole bag, and returns the payment page URL.
 *
 * Setup (Cloudflare dashboard → Workers & Pages → your worker):
 *   Settings → Variables and Secrets → add a SECRET named STRIPE_SECRET_KEY
 *   (your Stripe secret key, sk_live_… or sk_test_…).
 *   Optional plain-text variable SITE_URL (defaults to https://ladykattluxe.shop).
 */

// ---- Shipping (edit these to change your rates; amounts are in cents) --------
const STANDARD_SHIPPING = 695;           // $6.95
const FREE_SHIPPING_THRESHOLD = 5000;    // free standard shipping at $50+
const EXPRESS_SHIPPING = 1495;           // $14.95
const MAX_QTY_PER_ITEM = 10;
// -----------------------------------------------------------------------------

const DEFAULT_SITE_URL = 'https://ladykattluxe.shop';

export default {
  async fetch(request, env) {
    const siteUrl = (env.SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, '');
    const cors = corsHeaders(request, siteUrl);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    try {
      if (request.method === 'POST' && url.pathname === '/checkout') {
        return await createCheckout(request, env, siteUrl, cors);
      }
      if (request.method === 'GET' && url.pathname === '/session') {
        return await getSession(url, env, cors);
      }
      return json({ error: 'Not found' }, 404, cors);
    } catch (err) {
      console.error(err);
      return json({ error: 'Checkout is temporarily unavailable. Please try again in a moment.' }, 500, cors);
    }
  },
};

async function createCheckout(request, env, siteUrl, cors) {
  if (!env.STRIPE_SECRET_KEY) return json({ error: 'Checkout is not configured yet.' }, 503, cors);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400, cors); }
  const requested = Array.isArray(body && body.items) ? body.items.slice(0, 50) : [];

  const catalog = await loadCatalog(siteUrl);
  const params = {
    mode: 'payment',
    line_items: [],
    shipping_address_collection: { allowed_countries: ['US'] },
    phone_number_collection: { enabled: 'true' },
    allow_promotion_codes: 'true',
    custom_fields: [{
      key: 'giftnote',
      label: { type: 'custom', custom: 'Gift note (optional)' },
      type: 'text',
      optional: 'true',
      text: { maximum_length: 255 },
    }],
    custom_text: {
      submit: { message: `By completing your purchase you agree to our Terms & Conditions (${siteUrl}/terms.html) and Return Policy (${siteUrl}/returns.html).` },
    },
    success_url: `${siteUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/cart.html`,
  };

  let subtotal = 0;
  const seen = new Set();
  for (const item of requested) {
    const product = catalog.get(String(item && item.id));
    const qty = Math.floor(Number(item && item.qty));
    if (!product || seen.has(product.id) || !Number.isFinite(qty) || qty < 1) continue;
    seen.add(product.id);
    const quantity = Math.min(qty, MAX_QTY_PER_ITEM);
    subtotal += product.price * quantity;
    params.line_items.push({
      quantity,
      price_data: {
        currency: 'usd',
        unit_amount: product.price,
        product_data: {
          name: product.name,
          images: [`https://images.unsplash.com/${product.image}?auto=format&fit=crop&w=800&q=80`],
          metadata: { product_id: product.id },
        },
      },
    });
  }
  if (!params.line_items.length) return json({ error: 'Your bag is empty.' }, 400, cors);

  const free = subtotal >= FREE_SHIPPING_THRESHOLD;
  params.shipping_options = [
    shippingOption(free ? 'Complimentary Standard Shipping' : 'Standard Shipping', free ? 0 : STANDARD_SHIPPING, 3, 10),
    shippingOption('Express Shipping', EXPRESS_SHIPPING, 2, 3),
  ];

  const session = await stripe(env, 'POST', '/v1/checkout/sessions', params);
  if (session.error) {
    console.error('Stripe error:', session.error.message);
    return json({ error: 'We could not start checkout. Please try again in a moment.' }, 502, cors);
  }
  return json({ url: session.url }, 200, cors);
}

async function getSession(url, env, cors) {
  const id = url.searchParams.get('id') || '';
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return json({ error: 'Invalid session.' }, 400, cors);
  const s = await stripe(env, 'GET', `/v1/checkout/sessions/${id}`);
  if (s.error) return json({ error: 'Order not found.' }, 404, cors);
  return json({
    paid: s.payment_status === 'paid',
    name: s.customer_details && s.customer_details.name,
    email: s.customer_details && s.customer_details.email,
    total: s.amount_total,
    orderNumber: 'LKL-' + s.id.slice(-8).toUpperCase(),
  }, 200, cors);
}

// ---- helpers -----------------------------------------------------------------

function shippingOption(name, amount, minDays, maxDays) {
  return {
    shipping_rate_data: {
      display_name: name,
      type: 'fixed_amount',
      fixed_amount: { amount, currency: 'usd' },
      delivery_estimate: {
        minimum: { unit: 'business_day', value: minDays },
        maximum: { unit: 'business_day', value: maxDays },
      },
    },
  };
}

let catalogCache = null;
let catalogAt = 0;
async function loadCatalog(siteUrl) {
  if (catalogCache && Date.now() - catalogAt < 5 * 60 * 1000) return catalogCache;
  const res = await fetch(`${siteUrl}/data/products.json`, { cf: { cacheTtl: 300 } });
  if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`);
  const data = await res.json();
  catalogCache = new Map(data.products.map((p) => [p.id, p]));
  catalogAt = Date.now();
  return catalogCache;
}

async function stripe(env, method, path, params) {
  const res = await fetch(`https://api.stripe.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      ...(params ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: params ? encodeForm(params) : undefined,
  });
  return res.json();
}

// Stripe's API takes form-encoded bodies with bracketed keys, e.g.
// line_items[0][price_data][currency]=usd
function encodeForm(obj, prefix, out) {
  out = out || [];
  for (const [key, value] of Object.entries(obj)) {
    const name = prefix ? `${prefix}[${key}]` : key;
    if (value === undefined || value === null) continue;
    if (typeof value === 'object') encodeForm(value, name, out);
    else out.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);
  }
  return prefix ? out : out.join('&');
}

function corsHeaders(request, siteUrl) {
  const origin = request.headers.get('Origin') || '';
  const host = siteUrl.replace(/^https?:\/\//, '');
  const allowed = [siteUrl, `https://www.${host}`, 'http://localhost:8000'];
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : siteUrl,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
