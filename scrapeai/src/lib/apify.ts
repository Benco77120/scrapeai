// ============================================================
// Apify Scraping Engine — Multi-source HTTP API
// ============================================================
import type { ScrapingTask, Result } from '@/types'

const APIFY_TOKEN = process.env.APIFY_API_TOKEN
const APIFY_BASE = 'https://api.apify.com/v2'

// ── Actor mapping by task type / keywords ────────────────────
function selectActor(task: ScrapingTask): { actorId: string; input: Record<string, unknown> } {
  const q = task.title.toLowerCase()
  const keywords = task.keywords.join(' ').toLowerCase()
  const combined = q + ' ' + keywords

  // Instagram
  if (combined.includes('instagram')) {
    const hashtags = task.keywords.filter(k => k.startsWith('#'))
    const profiles = task.keywords.filter(k => !k.startsWith('#'))
    return {
      actorId: 'apify~instagram-scraper',
      input: {
        directUrls: profiles.map(p => `https://www.instagram.com/${p.replace('@', '')}/`),
        resultsType: hashtags.length > 0 ? 'posts' : 'profiles',
        searchType: 'hashtag',
        searchLimit: Math.min(task.config.max_results || 50, 100),
        addParentData: false,
      },
    }
  }

  // TikTok
  if (combined.includes('tiktok')) {
    return {
      actorId: 'clockworks~free-tiktok-scraper',
      input: {
        hashtags: task.keywords.map(k => k.replace('#', '')),
        resultsPerPage: Math.min(task.config.max_results || 50, 100),
        shouldDownloadVideos: false,
        shouldDownloadCovers: false,
      },
    }
  }

  // YouTube
  if (combined.includes('youtube') || combined.includes('video')) {
    return {
      actorId: 'streamers~youtube-scraper',
      input: {
        searchKeywords: task.keywords.join(' '),
        maxResults: Math.min(task.config.max_results || 50, 100),
        type: 'video',
      },
    }
  }

  // Amazon
  if (combined.includes('amazon') || combined.includes('product') || combined.includes('produit')) {
    return {
      actorId: 'junglee~amazon-product-scraper',
      input: {
        keywords: task.keywords.join(' '),
        country: task.config.country || 'US',
        maxItems: Math.min(task.config.max_results || 50, 100),
      },
    }
  }

  // Trustpilot
  if (combined.includes('trustpilot') || combined.includes('review') || combined.includes('avis')) {
    return {
      actorId: 'misceres~trustpilot-reviews-scraper',
      input: {
        keywords: [task.keywords.join(' ')],
        maxReviews: Math.min(task.config.max_results || 50, 200),
      },
    }
  }

  // Booking.com
  if (combined.includes('booking') || combined.includes('hotel') || combined.includes('hôtel')) {
    return {
      actorId: 'dtrungtin~booking-scraper',
      input: {
        search: task.config.location || task.keywords.join(' '),
        maxItems: Math.min(task.config.max_results || 50, 100),
        currency: 'EUR',
      },
    }
  }

  // Airbnb
  if (combined.includes('airbnb')) {
    return {
      actorId: 'dtrungtin~airbnb-scraper',
      input: {
        locationQuery: task.config.location || task.keywords.join(' '),
        maxListings: Math.min(task.config.max_results || 50, 100),
        currency: 'EUR',
      },
    }
  }

  // Crunchbase
  if (combined.includes('crunchbase') || combined.includes('startup') || combined.includes('funding') || combined.includes('financement')) {
    return {
      actorId: 'curious_coder~crunchbase-scraper',
      input: {
        searchKeyword: task.keywords.join(' '),
        maxItems: Math.min(task.config.max_results || 50, 100),
      },
    }
  }

  // Product Hunt
  if (combined.includes('product hunt') || combined.includes('producthunt')) {
    return {
      actorId: 'petr_cermak~product-hunt-scraper',
      input: {
        maxItems: Math.min(task.config.max_results || 50, 100),
        topic: task.keywords.join(' '),
      },
    }
  }

  // Yelp
  if (combined.includes('yelp')) {
    return {
      actorId: 'tri_angle~yelp-scraper',
      input: {
        searchTerm: task.keywords.join(' '),
        location: task.config.location || '',
        maxItems: Math.min(task.config.max_results || 50, 100),
      },
    }
  }

  // Google Search (general web)
  if (combined.includes('google') || combined.includes('website') || combined.includes('site') || combined.includes('web')) {
    return {
      actorId: 'apify~google-search-scraper',
      input: {
        queries: task.keywords.join(' '),
        maxPagesPerQuery: 3,
        resultsPerPage: 10,
        languageCode: task.config.language || 'en',
        countryCode: task.config.country || 'us',
      },
    }
  }

  // Default: Google Maps
  const location = task.config.location || task.location || ''
  const keyword = task.keywords[0] || task.title
  const searchQuery = location ? `${keyword} ${location}` : keyword
  return {
    actorId: 'compass~crawler-google-places',
    input: {
      searchStringsArray: [searchQuery],
      language: 'en',
      maxCrawledPlacesPerSearch: Math.min(task.config.max_results || 50, 200),
      includeHistogram: false,
      includeOpeningHours: false,
      includePeopleAlsoSearch: false,
      maxImages: 0,
      exportPlaceUrls: false,
      additionalInfo: false,
      scrapeReviewerInfo: false,
    },
  }
}

// ── Run actor ────────────────────────────────────────────────
export async function runScrapingTask(task: ScrapingTask): Promise<{
  runId: string
  datasetId: string
}> {
  const { actorId, input } = selectActor(task)
  const encodedActorId = actorId.replace('~', '~')

  const response = await fetch(
    `${APIFY_BASE}/acts/${encodedActorId}/runs?token=${APIFY_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Apify error (${actorId}): ${error}`)
  }

  const data = await response.json()
  const run = data.data
  return { runId: run.id, datasetId: run.defaultDatasetId }
}

// ── Check run status ─────────────────────────────────────────
export async function getRunStatus(runId: string): Promise<{
  status: string
  progress: number
  itemCount: number
}> {
  const response = await fetch(
    `${APIFY_BASE}/actor-runs/${runId}?token=${APIFY_TOKEN}`
  )

  if (!response.ok) return { status: 'failed', progress: 0, itemCount: 0 }

  const data = await response.json()
  const run = data.data

  const statusMap: Record<string, number> = {
    READY: 5, RUNNING: 50, SUCCEEDED: 100, FAILED: 0, ABORTED: 0, TIMING_OUT: 90,
  }

  return {
    status: run.status,
    progress: statusMap[run.status] ?? 0,
    itemCount: 0,
  }
}

// ── Fetch results ────────────────────────────────────────────
export async function fetchApifyResults(
  datasetId: string,
  taskType: string
): Promise<Partial<Result>[]> {
  const response = await fetch(
    `${APIFY_BASE}/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=1000`
  )

  if (!response.ok) return []

  const items = await response.json()
  if (!Array.isArray(items)) return []
  
if (items.length > 0) {
  console.log('APIFY RAW ITEM:', JSON.stringify(items[0], null, 2))
 }
return items.map((item: Record<string, unknown>) => mapItem(item, taskType))
}

// ── Universal data mapper ────────────────────────────────────
function mapItem(item: Record<string, unknown>, taskType: string): Partial<Result> {
  // Instagram
  if (item.ownerUsername || item.likesCount !== undefined) {
    return {
      name: (item.ownerFullName as string) || (item.ownerUsername as string) || null,
      website: item.url ? `https://www.instagram.com/${item.ownerUsername}` : null,
      description: (item.caption as string) || null,
      rating: null,
      reviews: (item.likesCount as number) || null,
      source_url: (item.url as string) || null,
      extra: { followers: item.followersCount, likes: item.likesCount, comments: item.commentsCount, type: 'instagram' },
    }
  }

  // TikTok
  if (item.authorMeta || item.diggCount !== undefined) {
    const author = item.authorMeta as Record<string, unknown> || {}
    return {
      name: (author.name as string) || null,
      website: author.name ? `https://www.tiktok.com/@${author.name}` : null,
      description: (item.text as string) || null,
      reviews: (item.playCount as number) || null,
      source_url: (item.webVideoUrl as string) || null,
      extra: { likes: item.diggCount, shares: item.shareCount, plays: item.playCount, type: 'tiktok' },
    }
  }

  // YouTube
  if (item.channelName || item.viewCount !== undefined) {
    return {
      name: (item.title as string) || (item.channelName as string) || null,
      website: (item.url as string) || null,
      description: (item.description as string) || null,
      reviews: (item.viewCount as number) || null,
      source_url: (item.url as string) || null,
      extra: { views: item.viewCount, likes: item.likes, channel: item.channelName, type: 'youtube' },
    }
  }

  // Amazon
  if (item.asin) {  // item.price seul n'est pas suffisant — Google Maps a aussi un champ price
    return {
      name: (item.title as string) || null,
      website: (item.url as string) || null,
      description: (item.description as string) || null,
      rating: (item.stars as number) || null,
      reviews: (item.reviewsCount as number) || null,
      price_range: item.price ? `${item.price}` : null,
      source_url: (item.url as string) || null,
      extra: { asin: item.asin, brand: item.brand, type: 'amazon' },
    }
  }

  // Trustpilot
  if (item.reviewerName || item.stars !== undefined) {
    return {
      name: (item.reviewerName as string) || null,
      description: (item.text as string) || null,
      rating: (item.stars as number) || null,
      source_url: (item.pageUrl as string) || null,
      extra: { company: item.companyName, verified: item.verifiedOrder, type: 'trustpilot' },
    }
  }

  // Google Search — only if no Google Maps signals present
  const isGoogleMapsItem = !!(item.placeId || item.categoryName || item.reviewsCount !== undefined || item.street || item.phoneUnformatted)
  if (!isGoogleMapsItem && item.title && item.url && item.totalScore === undefined) {
    return {
      name: (item.title as string) || null,
      website: (item.url as string) || null,
      description: (item.description as string) || null,
      source_url: (item.url as string) || null,
      extra: { position: item.position, type: 'google_search' },
    }
  }

  // Google Maps (default)
  // item.address may contain a Google Maps URL — only use if it's a real address (not http)
  const rawAddress = item.address as string | undefined
  const cleanAddress = rawAddress && !rawAddress.startsWith('http') ? rawAddress : null

  // Phone: try multiple field names
  const phone =
    (item.phone as string) ||
    (item.phoneUnformatted as string) ||
    (Array.isArray(item.phones) ? (item.phones as string[])[0] : null) ||
    null

  // Email: try single field and array field
  const email =
    extractFirstEmail(item.emails as string[] | string | undefined) ||
    extractFirstEmail(item.email as string | undefined) ||
    null

  return {
    name:        (item.title as string) || null,
    website:     (item.website as string) || null,
    email,
    phone,
    address:     (item.street as string) || cleanAddress || null,
    city:        (item.city as string) || extractCity(cleanAddress || '') || null,
    country:     (item.countryCode as string) || (item.country as string) || null,
    category:    (item.categoryName as string) || (Array.isArray(item.categories) ? (item.categories as string[])[0] : null) || null,
    rating:      typeof item.totalScore === 'number' ? item.totalScore : null,
    reviews:     (item.reviewsCount as number) || null,
    price_range: (item.price as unknown as string) || null,
    description: (item.description as string) || null,
    source_url:  (item.url as string) || null,
    extra: { place_id: item.placeId, type: 'google_maps' },
  }
}

function extractFirstEmail(emails?: string[] | string): string | null {
  if (!emails) return null
  if (typeof emails === 'string') return emails
  return emails[0] || null
}

function extractCity(address?: string): string | null {
  if (!address) return null
  const parts = address.split(',')
  return parts.length >= 2 ? parts[parts.length - 2].trim() : null
}

export function generateMockResults(task: ScrapingTask): Partial<Result>[] {
  const location = task.config.location || task.location || 'Paris'
  const base: Partial<Result>[] = [
    { name: 'Cafe Central', email: 'info@cafecentral.com', phone: '+33 1 23456789', address: `Main Street 1, ${location}`, category: 'Restaurant', rating: 4.5, reviews: 328 },
    { name: 'Restaurant Mitte', email: 'contact@restaurantmitte.com', phone: '+33 1 98765432', address: `Market Square 5, ${location}`, category: 'Restaurant', rating: 4.2, reviews: 156 },
    { name: 'Bistro Central', email: 'hello@bistro.com', phone: '+33 1 55544332', address: `Park Avenue 15, ${location}`, category: 'Bistro', rating: 4.7, reviews: 512 },
  ]
  const count = Math.min(task.target_count || 10, 50)
  const results: Partial<Result>[] = []
  for (let i = 0; i < count; i++) {
    const item = { ...base[i % base.length] }
    if (i >= base.length) item.name = `${item.name} ${i + 1}`
    results.push(item)
  }
  return results
}