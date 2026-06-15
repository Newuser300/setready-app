import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
  const { data: { user }, error } = await supabase.auth.getUser()
  console.log('Availability auth:', { userId: user?.id, error: error?.message })
  return user
}

export async function GET(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)

  const startDate = `${month}-01`
  const year = parseInt(month.split('-')[0])
  const mon = parseInt(month.split('-')[1])
  const lastDay = new Date(year, mon, 0).getDate()
  const endDate = `${month}-${lastDay.toString().padStart(2, '0')}`

  const { data, error } = await supabaseAdmin
    .from('performer_availability')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date')

  if (error) {
    console.error('GET availability error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { date, status, notes, bulk, dates } = body

  console.log('POST availability:', { userId: user.id, date, status, bulk, datesCount: dates?.length })

  if (bulk && dates?.length) {
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

export async function DELETE(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { date } = await request.json()

  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 })

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
