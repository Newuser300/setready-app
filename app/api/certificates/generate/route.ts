import { NextRequest, NextResponse } from 'next/server';
import { generateCertificatePDF } from '@/lib/certificate-generator';
import { createClient } from '@supabase/supabase-js';

// Module names for certificates
const MODULE_NAMES: Record<number, string> = {
  1: 'Film Set Terminology',
  2: 'Background Acting Terms & Performance',
  3: 'Set Etiquette & Professional Conduct',
  4: 'Safety on Set',
  5: 'Industry Standards, Pay & Career Advancement',
  6: 'Foundation (Stanislavski)',
  7: 'Audition Technique (Shurtleff)',
  8: 'Scene Study (Hagen)',
  9: 'Advanced Technique (Meisner, Adler)',
};

// Admin client for all operations (uses service role key - bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    console.log('=== CERTIFICATE GENERATION API STARTED ===');
    
    // 1. Get authentication token from header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    console.log('Auth header present:', !!authHeader);
    console.log('Token present:', !!token);
    
    let user = null;
    
    // Try token auth first (from frontend)
    if (token) {
      const { data: { user: tokenUser }, error: tokenError } = await supabaseAdmin.auth.getUser(token);
      if (!tokenError && tokenUser) {
        user = tokenUser;
        console.log('✅ Authenticated via token, user ID:', user.id);
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
    console.log('Request:', { moduleId, score, certificateType });
    
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
    console.log('Recipient name:', recipientName);
    
    // 4. Determine course name
    let courseName = '';
    if (certificateType === 'module' && moduleId) {
      courseName = `Module ${moduleId}: ${MODULE_NAMES[moduleId] || 'Training Module'}`;
    } else if (certificateType === 'section1') {
      courseName = 'Section 1: Background Performer Training';
    } else if (certificateType === 'section2') {
      courseName = 'Section 2: From Background to Acting';
    } else {
      courseName = 'SetReady Training Course';
    }
    console.log('Course name:', courseName);
    
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
    
    // 6. Generate PDF
    console.log('Generating PDF...');
    const pdfBuffer = await generateCertificatePDF({
      recipientName: recipientName.toUpperCase(),
      courseName,
      score,
      issueDate,
      certificateId: certificateHash,
    });
    console.log('PDF generated, size:', pdfBuffer.length, 'bytes');
    
    // 7. Upload to Supabase Storage
    const fileName = `${user.id}/${certificateType}_${moduleId || 'completion'}_${timestamp}.pdf`;
    console.log('Uploading to:', fileName);
    
    // First, check if bucket exists
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
    } else {
      const bucketExists = buckets?.some(b => b.name === 'certificates');
      console.log('Certificates bucket exists:', bucketExists);
      if (!bucketExists) {
        console.log('Available buckets:', buckets?.map(b => b.name));
      }
    }
    
    // Attempt upload
    const { data: uploadData, error: bucketError } = await supabaseAdmin.storage
      .from('certificates')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: true
      });

    console.log('Storage upload:', uploadData, bucketError);

    if (bucketError) {
      console.error('❌ Upload error:', bucketError.name, bucketError.message);
      return NextResponse.json(
        { error: `Failed to upload certificate: ${bucketError.message}` },
        { status: 500 }
      );
    }

    console.log('✅ Upload successful!');
    
    // 8. Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('certificates')
      .getPublicUrl(fileName);
    
    console.log('Public URL:', publicUrl);
    
    // 9. Save to database
    const { data: existingCert } = await supabaseAdmin
      .from('certificates')
      .select('id')
      .eq('user_id', user.id)
      .eq('module_id', moduleId || 0)
      .eq('certificate_type', certificateType)
      .maybeSingle();

    if (existingCert) {
      const { data: updateData, error: updateError } = await supabaseAdmin
        .from('certificates')
        .update({
          score: score,
          pdf_url: publicUrl,
          issued_at: new Date().toISOString()
        })
        .eq('id', existingCert.id)
        .select();

      console.log('Certificate updated:', updateData, updateError);

      if (updateError) {
        console.error('❌ Update failed:', updateError.message);
        return NextResponse.json(
          { error: `Failed to update certificate: ${updateError.message}` },
          { status: 500 }
        );
      }
      console.log('✅ Updated existing certificate record');
    } else {
      const { data: insertData, error: insertError } = await supabaseAdmin
        .from('certificates')
        .insert({
          user_id: user.id,
          certificate_type: certificateType,
          module_id: moduleId || null,
          module_name: certificateType === 'module' ? courseName : null,
          section_name: certificateType !== 'module' ? courseName : null,
          score: score,
          certificate_hash: certificateHash,
          pdf_url: publicUrl,
          issued_at: new Date().toISOString(),
        })
        .select();

      console.log('Certificate saved:', insertData, insertError);

      if (insertError) {
        console.error('❌ Insert failed:', insertError.message);
        return NextResponse.json(
          { error: `Failed to save certificate: ${insertError.message}` },
          { status: 500 }
        );
      }
      console.log('✅ Created new certificate record');
    }
    
    console.log('=== CERTIFICATE GENERATION COMPLETED SUCCESSFULLY ===');
    
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