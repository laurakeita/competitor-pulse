# Data Sources

Competitor Pulse draws from two distinct sources that serve different purposes. Understanding the difference is important for interpreting the dashboard correctly.

---

## 1. Apify — Sampled Ad Creatives

**Actor:** `curious_coder/facebook-ads-library-scraper` ([XtaWFhbtfxyzqrFmd](https://apify.com/curious_coder/facebook-ads-library-scraper))

**What it provides:**
- The top 50 active ads per brand, ranked by impressions descending
- Creative images (including DPA carousel thumbnails)
- Ad copy text, start dates, landing page URLs
- Format detection (video / image / carousel) via `snapshot.videos` and `snapshot.cards`
- Publisher platforms (Facebook, Instagram, Messenger, etc.)

**How it's used:**
- All creative analysis features — format breakdown, top hooks, top CTAs, ad survival ranking, ad lifespan gantt, landing pages — are based on this sample
- Video Ratio is also computed from this sample at runtime (MCP does not return format fields)
- `sampledAdsCount` in the UI reflects the number of creatives actually downloaded

**Input format:**
```
URL: https://www.facebook.com/{handle}/
Filters: activeStatus=active, sortBy=impressions_desc, countryCode=<user-selected>
Limit: 50 per brand
```

The user provides a Facebook page URL (e.g. `https://www.facebook.com/LancomeTW/`). The system extracts the handle, resolves it to a numeric page ID via `data/page-id-cache.json`, and passes the original URL to Apify.

**Cost:** ~$0.75 per 1,000 results → ~$0.04 per brand per scan

**Important constraint:** Apify scrapes the public Ads Library page. The `facebook.com/{handle}/` URL format is used instead of `view_all_page_id=` because the latter silently returns no data for many brands.

---

## 2. Meta Graph API / MCP — Inventory Metrics (Dev-Time Only)

**Tool:** `ads_library_search` via Meta Ads MCP

**What it provides (two calls per brand, both country-filtered):**

| Call | Parameters | Metric derived |
|---|---|---|
| Count call | `limit=1, countries=[country]` | `estimatedActiveAdsCount` from `estimated_total_count` |
| Recency sample | `limit=50, countries=[country], sort=creation_time_desc` | `newAds10d`, `avgRunningDays` |

**How it's used:**
- Stored in `data/enriched-counts.json` at development time via `npm run enrich`
- Merged into ad data at request time by `src/lib/enriched-counts.ts`
- Displayed as Brand Pulse KPIs with a "Meta Graph API" source badge
- **Never called at runtime from the Next.js app** — only read from the local JSON file

**Key distinctions:**
- `estimatedActiveAdsCount` is a true full-inventory number — it reflects the entire active ad library for the brand in the selected country
- `newAds10d` and `avgRunningDays` are derived from the 50-ad recency sample — they are sample-based approximations, not full-inventory figures
- The MCP hard limit is 50 ads per call with no pagination; high-volume brands will hit this ceiling

**Why dev-time only:**
The Meta Ads MCP token is scoped to MCP server access and cannot make direct Graph API calls from a Next.js server route. The enrichment script calls the MCP server via its JSON-RPC HTTP transport, which is the intended access path for this token.

**Enriching counts:**
```bash
# Enrich all default brands (Estée Lauder Taiwan + Lancôme Taiwan)
npm run enrich

# Enrich a single brand with country filter
npx tsx scripts/enrich-meta-counts.ts --pageId 188151501215824 --brand "Estée Lauder Taiwan" --country TW
npx tsx scripts/enrich-meta-counts.ts --pageId 156514087702491 --brand "Lancôme Taiwan" --country TW
```

---

## countSource Field

Every `AdData` object carries a `countSource` field that records the provenance of `estimatedActiveAdsCount`:

| Value | Meaning |
|---|---|
| `mcp_graph_api` | Count came from Meta Graph API via MCP enrichment — most accurate |
| `apify_sample` | No enrichment run; count reflects sample size only |
| `unavailable` | Count could not be determined |

The UI renders a colour-coded badge for each source:
- `mcp_graph_api` → green badge
- `apify_sample` → amber badge
- `unavailable` → grey badge
