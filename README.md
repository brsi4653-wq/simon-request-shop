# Simon Request Shop

A separate plain-static GitHub Pages storefront for regular, custom, and hybrid made-to-request items.

The working film portfolio is not modified by this project. This shop uses the same Supabase project and Google administrator account, but stores products in its own `shop_items` table and images in its own `shop-media` bucket.

## One-Time Setup

1. Open the existing Supabase project.
2. Open **SQL Editor**.
3. Create a new query.
4. Paste the complete contents of `supabase-shop-setup.sql`.
5. Click **Run** once.
6. Upload the contents of the `docs` folder to the root of a new GitHub repository, or configure GitHub Pages to publish from `/docs`.
7. In Supabase Authentication URL settings, add the new shop's final GitHub Pages address as an allowed redirect URL.
8. Open `admin.html` on the deployed shop and sign in with the authorized Google account.

The seeded Studio Edition is a private draft. Publish it from the editor when you want to test the public database connection.

## Adding Collections To An Existing Shop

If the shop was already set up before collections were added:

1. Open the existing Supabase project.
2. Open **SQL Editor** and create a new query.
3. Paste the complete contents of `supabase-shop-collections-migration.sql`.
4. Click **Run** once.
5. Upload the updated contents of `docs` to GitHub Pages.

The collection migration is additive. It does not update, delete, publish, unpublish, or reassign any existing item. Existing published items remain visible under **All** until collections are assigned in the editor.

## Security Model

- The site contains a Supabase **publishable** browser key. This key is intentionally safe to expose and cannot be hidden in a plain static GitHub Pages site.
- The site does **not** contain a database password, Supabase service-role key, Google client secret, private API key, or payment credential.
- Supabase row-level security only permits the authorized Google account to read drafts or change shop items.
- Public visitors can only read rows exposed by `public_shop_items`, which contains published items.
- Public visitors can only read visible collection names and published item memberships.
- Public visitors cannot upload, edit, feature, publish, or delete items.
- Request emails are created inside the visitor's browser. Customer information is not collected or stored by the website.

## Item Modes

- **Regular item:** asks for item, size, color, shipping location, and notes.
- **Custom item:** additionally asks for personalization and preferred font/style.
- **Hybrid item:** offers optional customization without making it mandatory.

Sizes and colors are displayed as information on the item page. Visitors write their choices in the request email instead of using a checkout form.

## Files to Publish

Publish only the contents of `docs`.

Do not upload `supabase-shop-setup.sql`, the tests, or this README as part of the public website unless you deliberately want them in the repository. They contain no secrets, but visitors do not need them.
