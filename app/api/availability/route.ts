import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json(
    { error: 'Unauthorized' }, { status: 401 }
  )

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json(
    { error: 'Unauthorized' }, { status: 401 }
  )

  const { date, status, notes, bulk, dates } = await req.json()

  if (bulk && dates?.length) {
    const records = dates.map((d: string) => ({
      user_id: user.id,
      date: d,
      status,
      notes,
      is_public: true,
      updated_at: new Date().toISOString()
    }))

    const { error } = await supabaseAdmin
      .from('performer_availability')
      .upsert(records, { onConflict: 'user_id,date' })

    if (error) return NextResponse.json(
      { error: error.message }, { status: 500 }
    )
    return NextResponse.json({ success: true })
  }

  const { error } = await supabaseAdmin
    .from('performer_availability')
    .upsert({
      user_id: user.id,
      date,
      status,
      notes,
      is_public: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,date' })

  if (error) return NextResponse.json(
    { error: error.message }, { status: 500 }
  )
  return NextResponse.json({ success: true })
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json(
    { error: 'Unauthorized' }, { status: 401 }
  )

  const { date } = await req.json()
  await supabaseAdmin
    .from('performer_availability')
    .delete()
    .eq('user_id', user.id)
    .eq('date', date)

  return NextResponse.json({ success: true })
}
