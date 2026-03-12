// ============================================================
// POST /api/scrape — Start a new scraping job
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase'
import { interpretScrapeRequest } from '@/lib/ai'
import { runScrapingTask, generateMockResults } from '@/lib/apify'
import { checkRateLimit, checkCredits, deduplicateResults, normalizeResult } from '@/lib/credits'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { query } = body

    if (!query || typeof query !== 'string' || query.trim().length < 5) {
      return NextResponse.json({ error: 'Query must be at least 5 characters' }, { status: 400 })
    }

    // Rate limit check
    const rateLimit = checkRateLimit(user.id)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before making another request.' },
        { status: 429 }
      )
    }

    // Credits check (optimistic — we'll deduct after)
    const credits = await checkCredits(user.id, 1)
    if (!credits.allowed) {
      return NextResponse.json(
        { error: 'Insufficient credits. Please upgrade your plan.', plan: credits.plan },
        { status: 402 }
      )
    }

    // AI interprets the request
    const task = await interpretScrapeRequest(query)

    const admin = createAdminClient()

    // Create project record
    const { data: project, error: projectError } = await admin
      .from('projects')
      .insert({
        user_id: user.id,
        title: task.title,
        query: query.trim(),
        status: 'running',
        task_type: task.task_type,
        sources: task.sources,
        config: task.config,
        progress: 5,
      })
      .select()
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
    }

    // Start scraping (async — don't await)
    startScraping(project.id, task, user.id).catch(console.error)

    return NextResponse.json({
      project_id: project.id,
      task,
      status: 'running',
      message: `Starting to collect: ${task.title}`,
    })

  } catch (error) {
    console.error('Scrape API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── Background scraping process ──────────────────────────────
async function startScraping(projectId: string, task: ReturnType<typeof interpretScrapeRequest> extends Promise<infer T> ? T : never, userId: string) {
  const admin = createAdminClient()
  
  const updateProject = (updates: Record<string, unknown>) =>
    admin.from('projects').update(updates).eq('id', projectId)

  try {
    await updateProject({ progress: 10, status: 'running' })

    let results: Record<string, unknown>[]

    // Use real Apify if token is configured, otherwise use mock data
    if (process.env.APIFY_API_TOKEN && process.env.APIFY_API_TOKEN.startsWith('apify_api_')) {
      const { runId, datasetId } = await runScrapingTask(task)
      await updateProject({ apify_run_id: runId, progress: 25 })

      // Return immediately - frontend will poll via /api/projects/sync
      await updateProject({ apify_run_id: runId, progress: 30 })
      return
    } else {
      // Demo mode with realistic delay
      await new Promise(r => setTimeout(r, 2000))
      await updateProject({ progress: 40 })
      await new Promise(r => setTimeout(r, 1500))
      await updateProject({ progress: 65 })
      results = generateMockResults(task) as Record<string, unknown>[]
    }

    await updateProject({ progress: 85 })

    // Clean & deduplicate
    const normalized = results.map(r => normalizeResult(r))
    const deduped = deduplicateResults(normalized) as Record<string, unknown>[]

    await updateProject({ progress: 92 })

    // Insert results
    if (deduped.length > 0) {
      const toInsert = deduped.map(r => ({
        project_id: projectId,
        name:        r.name || null,
        website:     r.website || null,
        email:       r.email || null,
        phone:       r.phone || null,
        address:     r.address || null,
        city:        r.city || null,
        country:     r.country || null,
        category:    r.category || null,
        rating:      r.rating || null,
        reviews:     r.reviews || null,
        price_range: r.price_range || null,
        description: r.description || null,
        linkedin:    r.linkedin || null,
        twitter:     r.twitter || null,
        funding:     r.funding || null,
        founded:     r.founded || null,
        employees:   r.employees || null,
        extra:       r.extra || {},
        source_url:  r.source_url || null,
      }))

      const { error } = await admin.from('results').insert(toInsert)
      if (error) console.error('Insert results error:', error)
    }

    // Update project as completed
    await updateProject({
      status: 'completed',
      progress: 100,
      rows_count: deduped.length,
    })

    // Log usage
    await admin.from('usage_logs').insert({
      user_id: userId,
      project_id: projectId,
      rows_used: deduped.length,
      action: 'scrape',
    })

    // Update credits used
    await admin.rpc('increment_credits_used' as never, {
      p_user_id: userId,
      p_amount: deduped.length,
    })

  } catch (error) {
    console.error('Scraping error:', error)
    await updateProject({
      status: 'failed',
      error_msg: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
