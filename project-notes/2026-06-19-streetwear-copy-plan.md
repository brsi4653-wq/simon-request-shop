# SHIPS Streetwear Copy Implementation Plan

**Goal:** Replace limited-drop and future/sustainability messaging with factual, permanent streetwear-brand language.

**Architecture:** Keep copy in the existing static HTML fallbacks and `DEFAULT_APPEARANCE` settings so the uploaded site works immediately and the admin editor receives the same defaults. Update dynamic product and empty-state wrappers in `site.js` without changing saved product data.

**Tech Stack:** Plain HTML, CSS, JavaScript, Node test runner.

## Tasks

1. Add a failing regression test for the approved homepage, collection, footer, empty-state, and product-wrapper copy.
2. Update `docs/index.html`, `docs/assets/settings-model.js`, and `docs/assets/site.js` with the approved factual streetwear language.
3. Remove immediate public references to limited drops, seasonal releases, small batches, carbon removal, and the retired future slogan.
4. Run the focused test, full test suite, syntax checks, and local browser verification.
