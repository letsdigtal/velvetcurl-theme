# VelvetCurl theme — what was broken and what was fixed

## The symptom

After uploading the theme ZIP to Shopify, every page (including the home page) showed the
404 "Page not found" template, and no home page sections appeared in the storefront or in
the theme editor.

## Root causes (two blockers)

### 1. `layout/theme.liquid` rendered two section groups that did not exist

`layout/theme.liquid` contains:

```liquid
{% sections 'header-group' %}
...
{% sections 'footer-group' %}
```

…but `sections/header-group.json` and `sections/footer-group.json` were **missing from the
theme**. Shopify requires a matching JSON file for every section group referenced in a
layout — a missing one is an error, so the layout can't be rendered at all. That is what
turned every URL into a 404/blank page and hid all sections.

**Fix:** added `sections/header-group.json` and `sections/footer-group.json` using Shopify's
standard format (same shape as the Dawn theme's own group files).

### 2. JSON templates used a non-canonical block format, and listed `header` / `footer` as template sections

* In `templates/*.json` the section `blocks` were written as a JSON **array** with no block
  IDs and no `block_order`. Shopify's documented format for section data is an **object
  keyed by block ID**, plus a `block_order` array — exactly what Shopify's own theme editor
  and theme export write. Invalid template structure is the documented reason Shopify
  silently drops `templates/index.json` when a ZIP is uploaded, and a dropped `index.json`
  is *the* cause of a storefront that only shows 404.
  **Fix:** every template converted to the canonical object + `block_order` format.
* Every template also contained `header` and `footer` sections. Now that the header and
  footer are rendered from the section groups in the layout, leaving them in the templates
  would render the header and footer twice.
  **Fix:** removed `header` / `footer` from all templates (Dawn architecture).
* Added `enabled_on: {"groups": ["header"|"footer"]}` to the header/footer sections so they
  can only be placed in their own group.

## Other bugs fixed in the same pass

* **Missing translations** — `general.collections.products_count` and
  `general.collections.no_matches` did not exist in `locales/en.default.json`, so the
  collection pages printed "Translation missing: …". Now uses the existing
  `collections.general.*` keys.
* **Header logo image** was missing a `height` attribute (layout shift + linter error).
* **Hardcoded URLs** replaced with Shopify's `routes` object (`routes.root_url`,
  `routes.cart_url`, `routes.search_url`, `routes.account_url`, `routes.cart_add_url`,
  `routes.cart_change_url`, `routes.all_products_collection_url`).
* **`sections/product-feature.liquid`** passed a *setting value* through the `t` filter
  (would print "Translation missing: en.Shop Now" as soon as a product was selected) and
  shadowed Liquid's global `product` variable with `{% assign product = ... %}`. Renamed to
  `feature_product` and the button label logic fixed.
* Theme now passes Shopify's official **Theme Check with 0 errors and 0 warnings**.

## How to install the fixed theme

1. Shopify admin → **Online Store → Themes → Add theme → Upload zip file** →
   `velvetcurl-theme-fixed.zip`.
2. Preview the theme. When it looks right, click **Publish**.
3. Delete the older broken copy of the theme (Actions → Remove) so it can't be published by
   accident.

## After uploading — things that live in your store, not in the theme code

* **Navigation:** Online Store → Navigation. The theme's header defaults to the
  `main-menu` handle and the footer to the `footer` handle, so create those menus (or point
  the theme settings at the menus you already have). Without a menu the header shows no links.
* **Theme settings → Header:** upload your logo, pick the menu, set the announcement text.
* **Theme settings → Footer:** company name, address, phone, email, footer menu.
* **Home page sections** (customize → Home page): Hero, three "Product feature row" steps,
  Our Story, Testimonial, The Science, Press logos, Newsletter. The
  **Featured collection** section is available via *Add section* if you also want a product
  grid on the home page.
* Products, collections and pages have to exist in the store — the theme is only the design.
