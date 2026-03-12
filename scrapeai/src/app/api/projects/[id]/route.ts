// ============================================================
// /api/projects/[id] — Get project details + results
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase'
import { getRunStatus, fetchApifyResults } from '@/lib/apify'
import { deduplicateResults, normalizeResult } from '@/lib/credits'

interface Params { params: { id: string } }

// GET /api/projects/[id]
export async function GET(request: NextRequest, { params }: Params) {
  const supabase = createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const includeResults = searchParams.get('include_results') !== 'false'
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('page_size') || '100')
  const offset = (page - 1) * pageSize

  const admin = createAdminClient()

  const { data: project, error: projectError } = await admin
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (projectError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  // ── Auto-sync Apify status when project is running ──────────
  if (project.status === 'running' && project.apify_run_id) {
    try {
      const status = await getRunStatus(project.apify_run_id)

      if (status.status === 'SUCCEEDED') {
        // Get dataset ID
        const runRes = await fetch(
          `https://api.apify.com/v2/actor-runs/${project.apify_run_id}?token=${process.env.APIFY_API_TOKEN}`
        )
        const runData = await runRes.json()
        const datasetId = runData?.data?.defaultDatasetId

        if (datasetId) {
          const results = await fetchApifyResults(datasetId, project.task_type || 'google_maps')
          const normalized = results.map((r: Record<string, unknown>) => normalizeResult(r))
          const deduped = deduplicateResults(normalized) as Record<string, unknown>[]

          if (deduped.length > 0) {
            const toInsert = deduped.map((r: Record<string, unknown>) => ({
              project_id: params.id,
              name: r.name || null,
              website: r.website || null,
              email: r.email || null,
              phone: r.phone || null,
              address: r.address || null,
              city: r.city || null,
              country: r.country || null,
              category: r.category || null,
              rating: r.rating || null,
              reviews: r.reviews || null,
              price_range: r.price_range || null,
              description: r.description || null,
              extra: r.extra || {},
              source_url: r.source_url || null,
            }))
            await admin.from('results').insert(toInsert)
          }

          await admin.from('projects').update({
            status: 'completed',
            progress: 100,
            rows_count: deduped.length,
          }).eq('id', params.id)

          project.status = 'completed'
          project.progress = 100
          project.rows_count = deduped.length
        }
      } else if (status.status === 'FAILED' || status.status === 'ABORTED') {
        await admin.from('projects').update({
          status: 'failed',
          error_msg: 'Apify run failed',
        }).eq('id', params.id)
        project.status = 'failed'
      } else {
        const progress = Math.min(30 + status.progress * 0.5, 85)
        await admin.from('projects').update({ progress }).eq('id', params.id)
        project.progress = progress
      }
    } catch (e) {
      console.error('Apify sync error:', e)
    }
  }

  if (!includeResults) return NextResponse.json({ project })

  const { data: results, count, error: resultsError } = await admin
    .from('results')
    .select('*', { count: 'exact' })
    .eq('project_id', params.id)
    .order('created_at', { ascending: true })
    .range(offset, offset + pageSize - 1)

  if (resultsError) return NextResponse.json({ error: resultsError.message }, { status: 500 })

  return NextResponse.json({
    project,
    results: results || [],
    total: count || 0,
    page,
    page_size: pageSize,
    total_pages: Math.ceil((count || 0) / pageSize),
  })
}

// DELETE /api/projects/[id]
export async function DELETE(request: NextRequest, { params }: Params) {
  const supabase = createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Delete results first (foreign key constraint)
  await admin.from('results').delete().eq('project_id', params.id)

  const { error: dbError } = await admin
    .from('projects')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// PATCH /api/projects/[id]
export async function PATCH(request: NextRequest, { params }: Params) {
  const supabase = createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const admin = createAdminClient()

  const allowedUpdates = ['title', 'status']
  const updates = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowedUpdates.includes(k))
  )

  const { data, error: dbError } = await admin
    .from('projects')
    .update(updates)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json(data)
}
