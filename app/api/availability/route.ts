import { NextResponse } from 'next/server'
import { getSessionUser } from '@/utils/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId') || user.id
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)

  const startDate = `${month}-01`
  const endDate = new Date(
    new Date(startDate).getFullYear(),
    new Date(startDate).getMonth() + 1,
    0
  ).toISOString().slice(0, 10)

  const { data } = await supabaseAdmin
    .from('performer_availability')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)

  return NextResponse.json(data || [])
}

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { date, status, notes, bulk, dates } = await req.json()

  if (bulk && dates?.length) {
    console.log('API bulk upsert:', { count: dates.length, status, userId: user.id })
    const records = dates.map((d: string) => ({
      user_id: user.id,
      date: d,
      status,
      notes: notes || null,
      is_public: true,
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabaseAdmin
      .from('performer_availability')
      .upsert(records, { onConflict: 'user_id,date', ignoreDuplicates: false })

    if (error) {
      console.error('Bulk upsert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, count: records.length })
  }

  if (!date || !status) {
    return NextResponse.json({ error: 'date and status required' }, { status: 400 })
  }

  console.log('API received:', { date, status, userId: user.id })

  const { error } = await supabaseAdmin
    .from('performer_availability')
    .upsert(
      {
        user_id: user.id,
        date,
        status,
        notes: notes || null,
        is_public: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,date', ignoreDuplicates: false }
    )

  if (error) {
    console.error('Upsert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { date } = await req.json()

  if (!date) {
    return NextResponse.json({ error: 'date required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('performer_availability')
    .delete()
    .eq('user_id', user.id)
    .eq('date', date)

  if (error) {
    console.error('Delete error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
