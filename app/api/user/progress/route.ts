// app/api/user/progress/route.ts
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all quiz results for this user
    const { data: results, error } = await supabase
      .from('quiz_results')
      .select('module_id, passed, percentage, completed_at')
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Error fetching progress:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Module IDs for Section 1
    const moduleIds = [
      '3adad7a8-60d0-402b-a412-c7a0d24f7b9b', // Film Set Terminology
      '3a5ba7a7-1042-4f2e-893b-0f4c001f7ea0', // Background Acting Terms
      'e5b51522-90b4-4341-b082-ea667bb14ff1', // Set Etiquette
      '762fb8fb-5189-4943-adaa-92f4c16fac4f', // Safety on Set
      'c92d6d19-9153-4879-96bb-b4fdc50bbafd'  // Industry Standards
    ];

    // Calculate completed modules (passed with 80% or higher)
    const completedModules = results?.filter(r => r.passed === true).map(r => r.module_id) || [];
    const completedCount = moduleIds.filter(id => completedModules.includes(id)).length;

    return NextResponse.json({
      completed_modules: completedModules,
      completed_count: completedCount,
      total_modules: moduleIds.length,
      all_results: results || []
    });
  } catch (error) {
    console.error('Error in progress API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}