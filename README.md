# Lady Katt Luxe — Website

Storefront for **Lady Katt Luxe LLC** (Titusville, FL · Business ID 1556312).
It's a static site on a small Node/Express server that handles **Stripe Checkout** and the **contact form**.

## Pages

| Page | File |
| --- | --- |
| Home | `public/index.html` |
| Shop (all products, category filters, quick view) | `public/products.html` |
| About Us | `public/about.html` |
| Contact (form + details) | `public/contact.html` |
| Shopping bag / checkout | `public/cart.html` → Stripe Checkout |
| Order confirmation | `public/success.html` |
| Sign in / create account | `public/login.html` |
| My Account (orders, details, password) | `public/account.html` |
| Password reset | `public/reset-password.html` |
| Shipping Policy | `public/shipping.html` |
| Return Policy | `public/returns.html` |
| Terms & Conditions | `public/terms.html` |
| Privacy Policy | `public/privacy.html` |
| Cookie Policy | `public/cookies.html` |
| Legal Notice | `public/legal.html` |

The header, footer, cookie banner, and sparkle background are added to every page by `public/js/main.js`. Styles are in `public/css/styles.css`.

## Products & prices

All products live in **`public/data/products.json`**. Prices are in **cents** (`5800` = $58.00).
To add or edit a product, change that file. For gift sets, `compareAt` is the "value" price (the individual items added together).
The server reads prices from this file, so customers can't change prices in their browser.

Product photos come from Unsplash (`"image": "photo-…"`). When you have your own product photos, put them in `public/img/`. Then update the image code in `main.js`/`server.js`, or ask for help switching to local images.

## Running it

```bash
npm install
cp .env.example .env     # then fill in your keys
npm start                # http://localhost:3000
```

Requires Node 18+.

## Connecting Stripe

1. Create or sign in to a Stripe account at <https://dashboard.stripe.com>.
2. Copy your **Secret key** (`sk_test_…` for testing, `sk_live_…` when you launch) into `.env` as `STRIPE_SECRET_KEY`.
3. Set `SITE_URL` to your live domain (for example `https://ladykattluxe.shop`).
4. Optional: add a webhook endpoint in Stripe pointing to `https://YOUR-DOMAIN/api/stripe-webhook` for the `checkout.session.completed` event. Put its signing secret in `STRIPE_WEBHOOK_SECRET`. Paid orders are then also logged to `data/orders.jsonl`.

Checkout collects the U.S. shipping address and phone number, offers Standard ($6.95, free over $75) or Express ($14.95), and accepts promo codes and an optional gift note.
You can test with card `4242 4242 4242 4242`, any future date, and any CVC.
Until a key is set, the bag page tells customers to order by email or phone.

## Contact form

If you set the `SMTP_*` values in `.env`, messages are emailed to `CONTACT_TO`.
Otherwise they're saved on the server in `data/messages.jsonl`.

## Customer accounts

Customers can create an account, sign in and out, update their name and phone, change or reset their password, and delete their account. The **My Account** page shows the orders they placed while signed in.

- Passwords are hashed with scrypt, so they are never stored as readable text. Sign-in uses a secure, HttpOnly session cookie (`lkl_session`) that lasts 30 days.
- Sign-in, sign-up, and password reset are rate-limited.
- Password reset emails are sent with the same SMTP settings as the contact form. If SMTP isn't set up, the reset link is printed in the server log instead, so set up SMTP before launch.
- Account data is kept in `data/store.json` (or in `DATA_DIR` if you set it). **On hosts whose disk resets on each deploy, such as Render or Railway, attach a persistent disk and point `DATA_DIR` at it.** Otherwise accounts will be lost. Back this file up regularly.
- Orders placed while signed in are linked to the account once payment succeeds. This happens on the confirmation page, and through the Stripe webhook if you set one up.

## Hosting

This site needs a host that runs Node, such as Render, Railway, Fly.io, Heroku, or a VPS. Set the same environment variables there that you use in `.env`.

## Policies

The Shipping, Return, Privacy, Cookie, Terms and Legal Notice pages use the owner's policy documents (last updated August 1, 2026), with contact details set to contact@ladykattluxe.shop and 904-663-2417. The cookie banner matches the Cookie Policy (essential cookies only).
