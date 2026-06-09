# SHIPS Custom Clothing Shop

A plain-static GitHub Pages storefront for custom clothing design and fulfillment requests.

Customers choose a garment, send artwork, references, text, or an idea, and SHIPS prepares the design before arranging production and shipping. The working film portfolio is not modified by this project.

## One-Time Setup

1. Open the existing Supabase project.
2. Open **SQL Editor**.
3. Create a new query.
4. Paste the complete contents of `supabase-shop-setup.sql`.
5. Click **Run** once.
6. Upload the contents of the `docs` folder to the root of a new GitHub repository, or configure GitHub Pages to publish from `/docs`.
7. In Supabase Authentication URL settings, add the new shop's final GitHub Pages address as an allowed redirect URL.
8. Open `admin.html` on the deployed shop and sign in with the authorized Google account.

## Reset The Existing Catalogue To The New Business Model

The file `supabase-shop-business-reset.sql` is intentionally destructive. It removes every current shop item and collection, then creates the new image-free garment catalogue.

1. Open the existing Supabase project.
2. Open **SQL Editor** and create a new query.
3. Paste the complete contents of `supabase-shop-business-reset.sql`.
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

## Security Model

- The site contains a Supabase **publishable** browser key. This key is intentionally safe to expose and cannot be hidden in a plain static GitHub Pages site.
- The site does **not** contain a database password, Supabase service-role key, Google client secret, private API key, or payment credential.
- Supabase row-level security only permits the authorized Google account to read drafts or change shop items.
- Public visitors can only read rows exposed by `public_shop_items`, which contains published items.
- Public visitors can only read visible collection names and published item memberships.
- Public visitors cannot upload, edit, feature, publish, or delete items.
- Request emails are created inside the visitor's browser. Customer information is not collected or stored by the website.

## Design Service Modes

- **Ready-made design:** starts from an existing finished design.
- **Full custom design:** develops a customer idea for the selected garment.
- **Limited placement customization:** develops a customer idea within the garment's supported print areas.

Every request email asks for the garment, size, color, artwork or idea, placement, style references, shipping location, and notes.

## Files to Publish

Publish only the contents of `docs`.

Do not upload `supabase-shop-setup.sql`, the tests, or this README as part of the public website unless you deliberately want them in the repository. They contain no secrets, but visitors do not need them.
