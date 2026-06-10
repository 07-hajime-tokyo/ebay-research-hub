# eBay Research Hub

eBay seller research dashboard prototype built with Next.js.

## Local Development

```bash
npm install
npm run dev -- --port 3001
```

Open http://localhost:3001.

## Thumbnail Sync

This project can read research sheets without writing to them and cache thumbnail URLs locally.

```bash
npm run sync:thumbnails
```

For stable eBay thumbnail retrieval, set eBay API credentials:

```bash
EBAY_CLIENT_ID=
EBAY_CLIENT_SECRET=
```

## Project Hub Task Sync

Tasks created or updated in this app can also be mirrored into the Project Hub Notion Tasks DB, so they appear under the eBay project in `project-hub`.

```bash
PROJECT_HUB_NOTION_TOKEN=
PROJECT_HUB_NOTION_DS_TASKS=adb411fb-8939-4401-a112-8da9442a769b
PROJECT_HUB_EBAY_PROJECT_ID=352abd69af0e814d8b27caeba92f91bc
NEXT_PUBLIC_SITE_URL=https://ebay-research-hub-two.vercel.app
```

`PROJECT_HUB_NOTION_TOKEN` can also be provided as `NOTION_TOKEN`, and `PROJECT_HUB_NOTION_DS_TASKS` can also be provided as `NOTION_DS_TASKS`.
