# Lady Katt Luxe — Website

Storefront for **Lady Katt Luxe LLC** (Titusville, FL · Business ID 1556312).
It's a fully static site built for **GitHub Pages**, with no server to run.
Customers add items to their bag and pay for everything in **one Stripe checkout**. A small free Cloudflare Worker (`checkout-worker/worker.js`) starts the Stripe payment, because GitHub Pages can't do that on its own. Until the worker is set up, the bag falls back to an **order request** that's emailed to you.

## Pages

| Page | File |
| --- | --- |
| Home | `index.html` |
| Shop (category filters, product details) | `products.html` |
| About Us | `about.html` |
| Contact | `contact.html` |
| Shopping bag + checkout | `cart.html` |
| Order confirmed / request received | `success.html` |
| Shipping Policy | `shipping.html` |
| Return Policy | `returns.html` |
| Terms & Conditions | `terms.html` |
| Privacy Policy | `privacy.html` |
| Cookie Policy | `cookies.html` |
| Legal Notice | `legal.html` |

`js/main.js` adds the header, footer, cookie banner, and sparkle background to every page. Styles are in `css/styles.css`.

## 1. Publish on GitHub Pages

1. Merge this branch into `main`.
2. In the repository, go to **Settings → Pages**. Set **Source** to *Deploy from a branch*, choose **`main`** and **`/ (root)`**, and save.
3. Under **Custom domain**, enter `ladykattluxe.shop` and save. The `CNAME` file in this repo already contains it. Once DNS is working (step 2), tick **Enforce HTTPS**.

GitHub Pages is only free for public repositories unless you have a paid GitHub plan.

## 2. Point the Porkbun domain at GitHub

In Porkbun, go to **Domain Management → ladykattluxe.shop → DNS**. Delete the default parking records for the main domain and `www` (the ALIAS, `*` CNAME, and A records), then add:

| Type | Host | Answer |
| --- | --- | --- |
| A | *(blank)* | `185.199.108.153` |
| A | *(blank)* | `185.199.109.153` |
| A | *(blank)* | `185.199.110.153` |
| A | *(blank)* | `185.199.111.153` |
| CNAME | `www` | `guccisproject.github.io` |

Don't touch any **MX** or **TXT** records used for email. DNS changes can take up to a few hours to spread.

## 3. Turn on Stripe checkout (Cloudflare Worker)

This takes about 10 minutes and is free.

1. **Get your Stripe secret key.** In the Stripe Dashboard, go to **Developers → API keys** and copy the **Secret key**. It starts with `sk_live_` for real payments, or `sk_test_` to test first with card `4242 4242 4242 4242`.
2. **Create a free Cloudflare account** at <https://dash.cloudflare.com/sign-up>.
3. **Create the worker.** Go to **Workers & Pages → Create → Create Worker**, name it `ladykattluxe-checkout`, and click **Deploy**.
4. **Paste the code.** Click **Edit code**, delete everything, paste in the whole contents of `checkout-worker/worker.js`, and click **Deploy**.
5. **Add your key.** In the worker, go to **Settings → Variables and Secrets → Add**. Choose Type **Secret**, name it `STRIPE_SECRET_KEY`, paste your Stripe secret key as the value, and click **Deploy**. Never put this key anywhere else, including the website code or a chat.
6. **Copy the worker's address.** It looks like `https://ladykattluxe-checkout.YOURNAME.workers.dev`.
7. **Connect the site.** In `js/main.js`, set `var CHECKOUT_API_URL = 'https://ladykattluxe-checkout.YOURNAME.workers.dev';`, then commit and push.

**What customers get at checkout:** the whole bag in one payment; card, Apple Pay, and Google Pay; a U.S. shipping address; Standard shipping ($6.95, free on $75+) or Express ($14.95); an optional gift note; and promo codes if you create them in Stripe. Stripe emails the receipt, and every order appears in your Stripe Dashboard under **Payments**, including the shipping address and gift note.

**Prices:** the worker always charges the prices in `data/products.json`, so changing a price there updates checkout too. To change shipping rates, edit the numbers at the top of `checkout-worker/worker.js`, paste it into Cloudflare again, and update the matching numbers near the top of `js/main.js`.

**To switch it off later:** set `CHECKOUT_API_URL` back to `''`. The bag goes back to order requests right away. You can also delete the worker in Cloudflare.

## 3b. Order requests (fallback)

When a customer places an order request, it's emailed to you with a number like `LKL-260924-AB12`. The email includes:

- their name, email, phone, and shipping address
- the shipping method they chose
- each item, with its quantity and price
- the subtotal
- a gift note and any order notes

Reply within one business day with the total (subtotal + shipping + any sales tax) and a way to pay. Ship once payment arrives.

Orders are delivered through the same **Formspree** form as the contact page (step 4). Until Formspree is connected, placing an order opens the customer's email app with the order already written, and the customer just presses Send.

## 4. Connect Formspree (contact form + orders)

1. Create a free account at <https://formspree.io> with contact@ladykattluxe.shop and create a new form.
2. Copy the form ID. It's the part after `/f/` in the form's URL, for example `xyzabcde`.
3. In `js/main.js`, set `var FORMSPREE_FORM_ID = 'xyzabcde';`.

Until then, both the contact form and checkout open the visitor's email app with their message ready to send to contact@ladykattluxe.shop.

## Previewing locally

Open `index.html` through any static server, for example `python3 -m http.server`, then visit <http://localhost:8000>.

## Policies

The policy pages use the owner's documents (last updated August 1, 2026). Contact details are set to contact@ladykattluxe.shop and 904-663-2417. The Cookie Policy was updated on September 23, 2026, because the site has no customer accounts. The cookie banner matches it: essential cookies only.
