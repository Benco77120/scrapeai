import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { project_id, format = 'csv' } = body

  if (!project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

  const admin = createAdminClient()

  const { data: project } = await admin
    .from('projects')
    .select('id, title, user_id')
    .eq('id', project_id)
    .eq('user_id', user.id)
    .single()

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const { data: results, error: dbError } = await admin
    .from('results')
    .select('*')
    .eq('project_id', project_id)
    .order('created_at', { ascending: true })

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  const filename = project.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()

  const flatResults = (results || []).map((row: Record<string, unknown>) => {
    const { extra, ...rest } = row
    return {
      ...rest,
      ...(extra && typeof extra === 'object' ? extra as Record<string, unknown> : {}),
    }
  })

  switch (format) {
    case 'json': {
      const json = JSON.stringify(flatResults, null, 2)
      return new NextResponse(json, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}.json"`,
        },
      })
    }
    case 'csv': {
      const csv = Papa.unparse(flatResults)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      })
    }
    case 'xlsx': {
      const ws = XLSX.utils.json_to_sheet(flatResults)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Results')
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
        },
      })
    }
    default:
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  }
}
