# Lady Katt Luxe — Website

Storefront for **Lady Katt Luxe LLC** (Titusville, FL · Business ID 1556312).
It's a fully static site built for **GitHub Pages**, with no server to run.
Checkout works as an **order request**: customers fill their bag and submit their shipping details, and the order is emailed to you. You then send them a payment request (PayPal invoice, Cash App, Zelle, etc.) and ship once they've paid. No payment is taken on the site.

## Pages

| Page | File |
| --- | --- |
| Home | `index.html` |
| Shop (category filters, product details) | `products.html` |
| About Us | `about.html` |
| Contact | `contact.html` |
| Shopping bag + checkout (order request) | `cart.html` |
| Order request received | `success.html` |
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

## 3. How orders reach you

When a customer places an order request, it's emailed to you with a number like `LKL-260924-AB12`. The email includes:

- their name, email, phone, and shipping address
- the shipping method they chose
- each item, with its quantity and price
- the subtotal
- a gift note and any order notes

Reply within one business day with the total (subtotal + shipping + any sales tax) and a way to pay. Ship once payment arrives.

Orders are delivered through the same **Formspree** form as the contact page (step 4). Until Formspree is connected, placing an order opens the customer's email app with the order already written, and the customer just presses Send.

To take card payments directly on the site later (for example PayPal checkout), the bag and checkout page are already in place, so only the final step needs to change.

## 4. Connect Formspree (contact form + orders)

1. Create a free account at <https://formspree.io> with contact@ladykattluxe.shop and create a new form.
2. Copy the form ID. It's the part after `/f/` in the form's URL, for example `xyzabcde`.
3. In `js/main.js`, set `var FORMSPREE_FORM_ID = 'xyzabcde';`.

Until then, both the contact form and checkout open the visitor's email app with their message ready to send to contact@ladykattluxe.shop.

## Previewing locally

Open `index.html` through any static server, for example `python3 -m http.server`, then visit <http://localhost:8000>.

## Policies

The policy pages use the owner's documents (last updated August 1, 2026). Contact details are set to contact@ladykattluxe.shop and 904-663-2417. The Cookie Policy was updated on September 23, 2026, because the site has no customer accounts. The cookie banner matches it: essential cookies only.
