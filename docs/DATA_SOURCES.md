# Data Sources

Competitor Pulse draws from two distinct sources that serve different purposes. Understanding the difference is important for interpreting the dashboard correctly.

---

## 1. Apify — Sampled Ad Creatives

**Actor:** `curious_coder/facebook-ads-library-scraper` ([XtaWFhbtfxyzqrFmd](https://apify.com/curious_coder/facebook-ads-library-scraper))

**What it provides:**
- The top 50 active ads per brand, ranked by impressions descending
- Creative images (including DPA carousel thumbnails)
- Ad copy text, start dates, landing page URLs
- Format detection (video / image / carousel)
- Publisher platforms (Facebook, Instagram, Messenger, etc.)

**How it's used:**
- All creative analysis features — format breakdown, ad survival ranking, messaging pillars, AI summary — are based on this sample
- `sampledAdsCount` in the UI reflects the number of creatives actually downloaded

**Input format:**
```
URL: https://www.facebook.com/{pageId}/
Filters: activeStatus=active, sortBy=impressions_desc, countryCode=<user-selected>
Limit: 50 per brand
```

**Cost:** ~$0.75 per 1,000 results → ~$0.04 per brand per scan

**Important constraint:** Apify scrapes the public Ads Library page. The `facebook.com/{pageId}/` URL format is used instead of `view_all_page_id=` because the latter silently returns no data for many brands (confirmed for Adidas).

---

## 2. Meta Graph API / MCP — Estimated Total Count (Dev-Time Only)

**Endpoint:** `GET /v21.0/ads_archive?summary=true&search_page_ids={id}&ad_active_status=ACTIVE`

**What it provides:**
- `summary.estimated_total_count` — the total number of active ads in the library for a given brand, regardless of country filter
- This is the same number shown in the Meta Ads Library UI ("X results")

**How it's used:**
- Stored in `data/enriched-counts.json` at development time via `npm run enrich`
- Merged into ad data at request time by `src/lib/enriched-counts.ts`
- Displayed as "Active Ads Estimate" in the UI with a "Meta Graph API" source badge
- **Never called at runtime from the Next.js app** — only read from the local JSON file

**Why it's dev-time only:**
The Meta Ads MCP token used for enrichment is scoped to MCP server access and cannot make direct Graph API calls from a Next.js server route. The enrichment script calls the MCP server via its JSON-RPC HTTP transport, which is the intended access path for this token.

**Enriching counts:**
```bash
# Enrich all default brands (Nike, Adidas, Puma, New Balance)
npm run enrich

# Enrich a single brand
npx tsx scripts/enrich-meta-counts.ts --pageId 15087023444 --brand Nike
```

---

## countSource Field

Every `AdData` object carries a `countSource` field that records the provenance of `estimatedActiveAdsCount`:

| Value | Meaning |
|---|---|
| `mcp_graph_api` | Count came from Meta Graph API via MCP enrichment — most accurate |
| `apify_sample` | No enrichment run; count reflects sample size only — set when Apify returns data but no enrichment exists |
| `unavailable` | Count could not be determined |

The UI renders a colour-coded badge for each source:
- `mcp_graph_api` → green badge
- `apify_sample` → amber badge
- `unavailable` → grey badge
