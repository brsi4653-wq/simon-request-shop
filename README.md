# SHIPS Clothing Brand

A plain-static GitHub Pages site for the independent SHIPS clothing brand.

SHIPS is focused on selected garments, seasonal collections, and small-batch releases designed in Nova Scotia. Custom print requests remain an optional secondary feature for select garments. The working film portfolio is not modified by this project.

## One-Time Setup

1. Open the existing Supabase project.
2. Open **SQL Editor**.
3. Create a new query.
4. Paste the complete contents of `supabase-shop-setup.sql`.
5. Click **Run** once.
6. Upload the contents of the `docs` folder to the root of a new GitHub repository, or configure GitHub Pages to publish from `/docs`.
7. In Supabase Authentication URL settings, add the new shop's final GitHub Pages address as an allowed redirect URL.
8. Open `admin.html` on the deployed shop and sign in with the authorized Google account.

## Completely Renew The Existing Shop

Use only `supabase-shop-full-renew.sql` for the complete renewal. It is intentionally destructive: it removes and rebuilds the shop catalogue tables, permissions, public views, categories, media-bucket rules, and image-free garment catalogue.

1. Open the existing Supabase project.
2. Open **SQL Editor** and create a new query.
3. Paste the complete contents of `supabase-shop-full-renew.sql`.
4. Click **Run** once.
5. Upload the updated contents of `docs` to GitHub Pages.
6. Open `admin.html`, sign in, and add the garment images.

The public category buttons will be **All**, **Pants**, **T-Shirts**, and **Hoodies**. `All` is automatic. The three named categories remain editable in the private editor, and up to six custom categories can exist.

## Adding Collections To An Existing Shop

If the shop was already set up before collections were added:

1. Open the existing Supabase project.
2. Open **SQL Editor** and create a new query.
3. Paste the complete contents of `supabase-shop-collections-step-1.sql`, press `Ctrl+A` so the entire query is selected, then click **Run**.
4. Confirm the result shows `shop_collections` and `shop_item_collections`.
5. Create another new query. Paste the complete contents of `supabase-shop-collections-step-2.sql`, press `Ctrl+A`, then click **Run**.
6. Upload the updated contents of `docs` to GitHub Pages.

The collection migration is additive. It does not update, delete, publish, unpublish, or reassign any existing item. Existing published items remain visible under **All** until collections are assigned in the editor.

## Adding Theme Controls To An Existing Shop

Run `supabase-shop-themes.sql` once in the Supabase SQL Editor. It preserves every existing garment and collection while adding the global website theme setting and the product-level **Use Global Theme** option.

After running it, upload the updated `docs` folder. The private editor can switch the whole site between Core, Sunfade, Clear Blue, Soft Orange, Warm Yellow, Fresh Green, and Studio Red. Individual products can inherit the global theme or use their own selection.

## Adding Homepage Cover Controls To An Existing Shop

Run `supabase-shop-homepage-settings.sql` once in the Supabase SQL Editor. It adds homepage cover controls without deleting or changing any garments. The private editor can then show one of six SHIPS hero-art styles, an uploaded homepage image, or a published product on the homepage.

The public request and purchase email is `purchase@theshipsshop.com`. The private admin login remains authorized to the existing iCloud Google account so the editor does not lock you out.

Run `supabase-shop-purchase-email.sql` once if the old address was ever typed into saved garment descriptions or request wording. It only replaces that address in saved public garment copy; it does not alter the private admin login.

## Adding Shopify Links And Availability To An Existing Shop

Run `supabase-shop-shopify-links.sql` once in the Supabase SQL Editor before uploading the updated `docs` folder. This additive migration preserves every garment, image, collection, and theme. Existing garments default to **Request Only**, so their current email request buttons continue working until you deliberately change them.

In the private editor, set an availability status and optionally paste a normal Shopify product or checkout URL. An **Available** garment with a Shopify URL shows **Buy Now**. No Shopify API, Storefront API, token, or payment credential is used or stored by this site.

## Security Model

- The site contains a Supabase **publishable** browser key. This key is intentionally safe to expose and cannot be hidden in a plain static GitHub Pages site.
- The site does **not** contain a database password, Supabase service-role key, Google client secret, private API key, or payment credential.
- Supabase row-level security only permits the authorized Google account to read drafts or change shop items.
- Public visitors can only read rows exposed by `public_shop_items`, which contains published items.
- Public visitors can only read visible collection names and published item memberships.
- Public visitors cannot upload, edit, feature, publish, or delete items.
- Request emails are created inside the visitor's browser. Customer information is not collected or stored by the website.

## Listing Modes

- **Collection garment:** a standard piece in the current SHIPS catalogue.
- **Selected garment:** a garment that may have additional details or limited optional requests.

Every request email asks for the garment, size, color, shipping location, and notes. It includes one optional line for a custom print request when available.

## Files to Publish

Publish only the contents of `docs`.

Do not upload `supabase-shop-setup.sql`, the tests, or this README as part of the public website unless you deliberately want them in the repository. They contain no secrets, but visitors do not need them.
