# Lady Katt Luxe — Website

Storefront for **Lady Katt Luxe LLC** (Titusville, FL · Business ID 1556312).
It's a fully static site built for **GitHub Pages**, with no server to run.
Checkout uses **Stripe Payment Links** and the contact form uses **Formspree**.

## Pages

| Page | File |
| --- | --- |
| Home | `index.html` |
| Shop (category filters, product details) | `products.html` |
| About Us | `about.html` |
| Contact | `contact.html` |
| Order confirmation (Stripe redirects here) | `success.html` |
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

## 3. Connect Stripe checkout (Payment Links)

Each product has its own Stripe Payment Link. Until a product has one, its button reads **Inquire to order** and opens the contact form with the product already filled in.

For each product in `data/products.json`:

1. In the Stripe Dashboard, go to **Payment Links → New**. Add a product with the same **name and price** as the site.
2. Under options:
   - Turn on **Let customers adjust quantity**.
   - Turn on **Collect customers' addresses → Shipping addresses** (United States).
   - Add your **shipping rates**.
   - Optionally add a **custom field** labeled "Gift note."
3. Under **After payment**, choose *Don't show confirmation page* and redirect to `https://ladykattluxe.shop/success.html`.
4. Copy the link (`https://buy.stripe.com/…`) into that product's `"paymentLink"` field in `data/products.json`.

For gift sets, `compareAt` is the "value" price (the individual items added together). Prices are in **cents** (`5800` = $58.00). **The price in Stripe is what customers are charged**, so keep it matching the site.

## 4. Connect the contact form (Formspree)

1. Create a free account at <https://formspree.io> with contact@ladykattluxe.shop and create a new form.
2. Copy the form ID. It's the part after `/f/` in the form's URL, for example `xyzabcde`.
3. In `js/main.js`, set `var FORMSPREE_FORM_ID = 'xyzabcde';`.

Until then, the form opens the visitor's email app with their message ready to send to contact@ladykattluxe.shop.

## Previewing locally

Open `index.html` through any static server, for example `python3 -m http.server`, then visit <http://localhost:8000>.

## Policies

The policy pages use the owner's documents (last updated August 1, 2026). Contact details are set to contact@ladykattluxe.shop and 904-663-2417. The Cookie Policy was updated on September 23, 2026, because the site has no accounts or shopping cart. The cookie banner matches it: essential cookies only.
