# Fix "No app with client ID `` found"

Your project is not linked to a Shopify Partner app yet. Do this **in your terminal** (not in Cursor’s automated run):

## 1. Link to an existing app

```bash
cd "/Users/tommcferran/Shopify Date Picker"
npx shopify app config link
```

- Sign in with **tomlukemcferran@gmail.com** if asked.
- When the CLI shows a list of apps, choose the app you created in Partners (e.g. “Delivery Date Pro”).
- The CLI will write the **Client ID** into `shopify.app.toml`.

## 2. If you don’t have an app yet (create one)

```bash
cd "/Users/tommcferran/Shopify Date Picker"
npx shopify app config link --reset
```

- Choose **Create new app** (or similar).
- The CLI creates the app in Partners and links it; `client_id` will be set.

## 3. After linking

- Ensure your **`.env`** has the same credentials:
  - `SHOPIFY_API_KEY` = the **Client ID** (same as `client_id` in `shopify.app.toml`)
  - `SHOPIFY_API_SECRET` = the **Client secret** from Partners
- Then run **`npx shopify app deploy`** again.

## Where to get Client ID / Client secret

In **Partners** → **Apps** → **[Your app]** → open the page that shows **Client ID** and **Client secret** (often under **Configuration**, **App setup**, or **Client credentials**). Copy those into `.env` as above; `config link` fills `client_id` in the toml from the app you select.
