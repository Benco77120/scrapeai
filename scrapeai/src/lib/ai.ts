// ============================================================
// AI Task Interpreter — Converts natural language → ScrapingTask
// ============================================================
import OpenAI from 'openai'
import type { ScrapingTask, TaskType } from '@/types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `You are ScrapeAI's task interpreter. Convert natural language data requests into structured scraping tasks.

You MUST respond with valid JSON only, no markdown, no explanation.

Task types:
- "google_maps": restaurants, shops, businesses, services by location
- "web_scrape": product prices, listings from specific URLs
- "email_extraction": extracting contacts from websites/directories  
- "marketplace": e-commerce products, Amazon, eBay listings
- "directory": company directories, startup lists, professional networks

Output fields available: name, website, email, phone, address, city, country, category, rating, reviews, price_range, description, linkedin, twitter, funding, founded, employees

Response format:
{
  "title": "Short descriptive title",
  "task_type": "google_maps|web_scrape|email_extraction|marketplace|directory",
  "description": "What will be scraped",
  "location": "City/Region if applicable",
  "country": "Country code (e.g. DE, ES, FR) if applicable",
  "keywords": ["search keyword 1", "keyword 2"],
  "target_count": 100,
  "sources": ["google_maps", "website_urls", "crunchbase", etc],
  "config": {
    "location": "Berlin, Germany",
    "max_results": 100,
    "search_queries": ["restaurants Berlin"],
    "extract_emails": true,
    "extract_phones": true,
    "include_socials": false,
    "category": "restaurant"
  },
  "output_fields": ["name", "email", "phone", "address", "website", "rating"]
}`

export async function interpretScrapeRequest(query: string): Promise<ScrapingTask> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.2,
    max_tokens: 800,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `User request: "${query}"` }
    ]
  })

  const raw = completion.choices[0]?.message?.content?.trim() ?? '{}'

  try {
    const task = JSON.parse(raw) as ScrapingTask
    // Validate & sanitize
    task.target_count = Math.min(task.target_count || 100, 500)
    task.task_type = validateTaskType(task.task_type)
    return task
  } catch {
    // Fallback task if parsing fails
    return {
      title: query.slice(0, 60),
      task_type: 'web_scrape',
      description: query,
      keywords: [query],
      target_count: 50,
      sources: ['web_search'],
      config: { max_results: 50, extract_emails: true, extract_phones: true },
      output_fields: ['name', 'email', 'phone', 'website', 'address'],
    }
  }
}

function validateTaskType(type: string): TaskType {
  const valid: TaskType[] = ['google_maps', 'web_scrape', 'email_extraction', 'marketplace', 'directory']
  return valid.includes(type as TaskType) ? (type as TaskType) : 'web_scrape'
}

// Generate a human-readable progress message
export async function generateProgressMessage(
  task: ScrapingTask,
  progress: number
): Promise<string> {
  const messages: Record<number, string> = {
    0: `🔍 Analyzing your request...`,
    10: `🗺️ Identifying best data sources for "${task.title}"`,
    25: `🚀 Launching ${task.task_type === 'google_maps' ? 'Google Maps' : 'web'} scraper...`,
    50: `⚡ Collecting data... found ${Math.floor(task.target_count * 0.4)} results so far`,
    75: `🧹 Cleaning and deduplicating results...`,
    90: `📧 Extracting email addresses from websites...`,
    100: `✅ Done! Your dataset is ready.`,
  }

  const closest = Object.keys(messages)
    .map(Number)
    .reduce((a, b) => (Math.abs(b - progress) < Math.abs(a - progress) ? b : a))

  return messages[closest]
}
