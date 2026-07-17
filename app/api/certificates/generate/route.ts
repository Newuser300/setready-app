import { NextRequest, NextResponse } from 'next/server';
import { generateCertificatePDF } from '@/lib/certificate-generator';
import { supabaseAdmin } from '@/utils/supabase/admin';

// Module names for certificates
const MODULE_NAMES: Record<number, string> = {
  1: 'Film Set Terminology',
  2: 'Background Acting Terms & Performance',
  3: 'Set Etiquette & Professional Conduct',
  4: 'Safety on Set',
  5: 'Industry Standards, Pay & Career Advancement',
  6: 'Foundation',
  7: 'Audition Technique',
  8: 'Scene Study',
  9: 'Advanced Technique',
};

export async function POST(request: NextRequest) {
  try {
    // 1. Get authentication token from header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    let user = null;

    // Try token auth first (from frontend)
    if (token) {
      const { data: { user: tokenUser }, error: tokenError } = await supabaseAdmin.auth.getUser(token);
      if (!tokenError && tokenUser) {
        user = tokenUser;
      } else {
        console.error('Token auth error:', tokenError?.message);
      }
    }

    if (!user) {
      console.error('❌ No user found - authentication failed');
      return NextResponse.json(
        { error: 'Not authenticated. Please sign in.' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const { moduleId, score, certificateType } = await request.json();

    // Validate required fields
    if (!score || !certificateType) {
      return NextResponse.json(
        { error: 'Missing required fields: score and certificateType are required' },
        { status: 400 }
      );
    }

    // 3. Get user profile
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('name')
      .eq('id', user.id)
      .maybeSingle();

    const recipientName = profile?.name || user.email?.split('@')[0] || 'Student';

    // 4. Determine course name
    let courseName = '';
    if (certificateType === 'module' && moduleId) {
      courseName = `Module ${moduleId}: ${MODULE_NAMES[moduleId] || 'Training Module'}`;
    } else if (certificateType === 'section1') {
      courseName = 'Section 1: Background Performer Training';
    } else if (certificateType === 'section2') {
      courseName = 'Section 2: From Background to Acting';
    } else {
      courseName = 'BGReady Training Course';
    }

    // 5. Generate certificate hash
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 10);
    const certificateHash = `${user.id.substring(0, 8)}-${certificateType}-${timestamp}-${randomString}`;

    // Format issue date
    const issueDate = new Date().toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // 6. Save DB record FIRST — cert exists regardless of PDF outcome
    const { data: existingCert } = await supabaseAdmin
      .from('certificates')
      .select('id')
      .eq('user_id', user.id)
      .eq('module_id', moduleId || 0)
      .eq('certificate_type', certificateType)
      .maybeSingle();

    let certId: string | null = null;
    if (existingCert) {
      const { error: updateError } = await supabaseAdmin
        .from('certificates')
        .update({ score, issued_at: new Date().toISOString() })
        .eq('id', existingCert.id);
      if (updateError) console.error('DB update error:', updateError.message);
      else certId = existingCert.id;
    } else {
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('certificates')
        .insert({
          user_id: user.id,
          certificate_type: certificateType,
          module_id: moduleId || null,
          module_name: certificateType === 'module' ? courseName : null,
          section_name: certificateType !== 'module' ? courseName : null,
          score,
          certificate_hash: certificateHash,
          issued_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      if (insertError) console.error('DB insert error:', insertError.message);
      else certId = inserted?.id;
    }

    // 7. Attempt PDF generation + storage upload (best-effort — cert record already saved)
    let publicUrl: string | null = null;
    try {
      const pdfBuffer = await generateCertificatePDF({
        recipientName: recipientName.toUpperCase(),
        courseName,
        score,
        issueDate,
        certificateId: certificateHash,
      });

      const fileName = `${user.id}/${certificateType}_${moduleId || 'completion'}_${timestamp}.pdf`;
      const { error: bucketError } = await supabaseAdmin.storage
        .from('certificates')
        .upload(fileName, pdfBuffer, { contentType: 'application/pdf', cacheControl: '3600', upsert: true });

      if (bucketError) {
        console.error('Storage upload error (non-fatal):', bucketError.message);
      } else {
        const { data: { publicUrl: url } } = supabaseAdmin.storage.from('certificates').getPublicUrl(fileName);
        publicUrl = url;
        if (certId && publicUrl) {
          await supabaseAdmin.from('certificates').update({ pdf_url: publicUrl }).eq('id', certId);
        }
      }
    } catch (pdfErr) {
      console.error('PDF generation failed (non-fatal — cert record already saved):', pdfErr);
    }

    return NextResponse.json({
      success: true,
      pdfUrl: publicUrl,
      message: 'Certificate generated successfully!'
    });

  } catch (error) {
    console.error('❌ Certificate generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
