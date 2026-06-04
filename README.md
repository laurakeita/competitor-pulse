# Competitor Pulse

A competitive ad monitoring tool that tracks Facebook and Instagram ad activity across brands in real time — built for growth marketers who need to move faster than their competition.

---

## Problem Solved

Manually checking the Meta Ads Library for multiple competitors is slow and inconsistent. Competitor Pulse automates this into a single dashboard:

- Enter up to 5 Facebook Page IDs
- Get the top 50 active ads ranked by impressions, with creative thumbnails
- See format breakdown, messaging pillars, creative tone, and AI-generated summaries
- Compare brands side-by-side in a head-to-head table

---

## Features

| Feature | Description |
|---|---|
| **Live Ad Scraping** | Top 50 ads by impression rank via Apify + Facebook Ads Library |
| **Creative Thumbnails** | Real ad images pulled from Apify (incl. DPA carousel support) |
| **Ad Survival Ranking** | Sort by how long each creative has been running |
| **Format Breakdown** | Video / Image / Carousel split with visual progress bars |
| **AI Creative Analysis** | Gemini Flash summarises messaging pillars, tone, and targeting angle |
| **Head-to-Head Table** | Side-by-side metric comparison across all analysed brands |
| **Country Filter** | Filter Ads Library results by country (TW / US / JP / SG / etc.) |
| **Demo Mode** | Works without any API keys — loads realistic mock data automatically |

---

## Data Architecture

Competitor Pulse separates two distinct data signals that are often conflated:

```
┌──────────────────────────────────────────────────────────────┐
│  estimatedActiveAdsCount                                     │
│  Source: Meta Graph API (via MCP enrichment in dev mode)     │
│  → True total of all active ads in the library               │
│  → Stored in data/enriched-counts.json                       │
│  → Never inferred from sample size                           │
├──────────────────────────────────────────────────────────────┤
│  sampledAdsCount                                             │
│  Source: Apify scraper (top 50 by impressions)               │
│  → Used for ALL creative analysis: format, copy, AI summary  │
│  → Not a proxy for the total ad count                        │
└──────────────────────────────────────────────────────────────┘
```

### Why this separation matters

The Meta Ads Library shows Nike running ~1,975 active ads globally. Apify downloads the top 50 by impression rank. Displaying "50 active ads" would be misleading. Competitor Pulse shows both numbers with a clear source badge and tooltip, so the reader always knows what they're looking at.

### Enrichment script

The `data/enriched-counts.json` file stores estimated totals fetched during development:

```bash
npm run enrich
# or for a single brand:
npx tsx scripts/enrich-meta-counts.ts --pageId 15087023444 --brand Nike
```

The enrichment script calls the Meta Ads MCP server via JSON-RPC and writes results locally. The Next.js app only reads the JSON file — it never calls MCP or the Graph API at runtime.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| Ad Scraping | Apify — `curious_coder/facebook-ads-library-scraper` |
| AI Analysis | Google Gemini Flash (`@google/generative-ai`) |
| Ad Count Source | Meta Graph API via MCP (dev-time enrichment only) |
| Storage | Local JSON (`data/enriched-counts.json`) |

---

## Running Locally

### 1. Clone and install

```bash
git clone https://github.com/laurakeita/competitor-pulse.git
cd competitor-pulse
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```
APIFY_API_TOKEN=          # from console.apify.com — required for live data
GEMINI_API_KEY=           # from aistudio.google.com — required for AI summaries
```

> **No API keys?** The app automatically falls back to demo mode with realistic mock data. Just run `npm run dev` and open [localhost:3000](http://localhost:3000).

### 3. Start

```bash
npm run dev
```

### 4. (Optional) Refresh ad counts

```bash
npm run enrich
```

Updates `data/enriched-counts.json` with the latest estimated total counts from Meta. Requires `FACEBOOK_ACCESS_TOKEN` in `.env.local` (Meta Ads MCP token).

---

## Quick Start

Try the built-in **Nike vs Adidas** preset on the home page, or enter any Facebook Page ID manually. Find a Page ID by visiting the brand's Facebook page and checking the URL or page info section.

---

## Screenshots

_Screenshots live in [`public/screenshots/`](public/screenshots/). Add `.png` files there and reference them here._

---

## Portfolio Notes

This project demonstrates:

- **API integration design** — Apify for scraping, Gemini for analysis, MCP for dev-time enrichment, all with clean separation of concerns
- **Data honesty** — explicit distinction between estimated totals and sampled creatives, with source badges and tooltips
- **Graceful degradation** — auto demo mode, AI fallback to mock, no crashes on missing keys
- **TypeScript discipline** — strict mode throughout, no `any`, full interface coverage
- **Portfolio-ready UX** — works without credentials, meaningful mock data, clear data provenance labels

---

## Docs

- [Data Sources](docs/DATA_SOURCES.md) — how Apify sampling and MCP enrichment work
- [Limitations](docs/LIMITATIONS.md) — what `sampledAdsCount` does and does not mean

---

Built by [Laura Keita](https://github.com/laurakeita) · Growth Marketing & Strategy Operations
