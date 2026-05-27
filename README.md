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
