// app/api/quiz/save/route.ts
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { module_id, score, total_questions, percentage, passed, answers } = await request.json();

    // Check if result already exists
    const { data: existing } = await supabase
      .from('quiz_results')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('module_id', module_id)
      .single();

    let result;

    if (existing) {
      // Update existing result
      result = await supabase
        .from('quiz_results')
        .update({
          score,
          total_questions,
          percentage,
          passed,
          answers,
          completed_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      // Insert new result
      result = await supabase
        .from('quiz_results')
        .insert({
          user_id: session.user.id,
          module_id,
          score,
          total_questions,
          percentage,
          passed,
          answers
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error('Error saving quiz result:', result.error);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Error in quiz save API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}