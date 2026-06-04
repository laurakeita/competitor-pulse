# Known Limitations

## sampledAdsCount ≠ Total Active Ads

The most important limitation to understand when reading the dashboard.

**What happens:** Apify downloads the top 50 ads per brand ranked by impressions. `sampledAdsCount` reflects this — 50 ads downloaded, `sampledAdsCount = 50`.

**What this does NOT mean:** Nike is not running 50 ads. Nike runs ~1,975 active ads globally (as of June 2026). The tool samples the most-seen 50 for creative analysis.

**How Competitor Pulse handles this:**
- `sampledAdsCount` and `estimatedActiveAdsCount` are stored and displayed as separate fields
- The UI labels them distinctly: "Active Ads Estimate" vs "Sampled Creatives"
- A tooltip on the Ad Inventory panel explains the difference to the reader
- `sampledAdsCount` is never used as a proxy for the total count

---

## Creative Analysis Is Based on the Sample Only

All of the following features operate on the 50 sampled creatives, not the full library:

- Format breakdown (Video / Image / Carousel %)
- Ad survival ranking (running days)
- Messaging pillars (AI-generated)
- Creative tone tags (AI-generated)
- Top landing pages
- New ads in last 20 days

A brand running 1,975 ads may have patterns in the remaining 1,925 that are not reflected in the analysis. The sample is impression-weighted, so it skews toward creatives Meta is actively serving — which is generally the most useful signal for competitive research.

---

## Country Filter Affects Sample Composition, Not Total Count

When a country code is selected (e.g. TW, US), the Apify scraper filters the Ads Library results by that country. This changes which ads appear in the sample — a brand may run different creatives in different markets.

However, `estimatedActiveAdsCount` is fetched **without** a country filter because filtering by country produces artificially low totals (e.g. filtering Nike by US returns ~55 ads because most Nike ads are global, not US-targeted). The enrichment script intentionally omits the country filter to get the true library total.

---

## Estimated Count Requires Manual Enrichment

`estimatedActiveAdsCount` comes from `data/enriched-counts.json`, which is populated by running `npm run enrich`. If you add a new brand and don't run the enrichment script, the count will show as "—" (null) with an `apify_sample` source badge.

The enrichment script requires `FACEBOOK_ACCESS_TOKEN` (a Meta Ads MCP token) in `.env.local`. Without it, the app still works — creative analysis runs normally — but the "Active Ads Estimate" field will be empty for un-enriched brands.

---

## Meta Ads Library Coverage

The Meta Ads Library is Meta's transparency tool and reflects ads that have run on Facebook, Instagram, Messenger, and Audience Network. It does not include:

- Ads that have been inactive for more than 30 days (depending on ad type)
- Ads from pages that have been removed
- Ads excluded from the Ads Library for policy reasons

Competitor Pulse inherits these constraints from the underlying data source.

---

## Rate Limits and Costs

| Source | Rate limit | Estimated cost |
|---|---|---|
| Apify scraper | Parallel runs supported | ~$0.04 per brand (50 ads) |
| Gemini Flash | 15 RPM free tier | ~$0.00 for typical usage |
| Meta Graph API (enrichment) | Standard API limits | Included in MCP plan |

Scanning 5 brands costs approximately $0.20 in Apify credits.
