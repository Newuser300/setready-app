import type { CSSProperties } from 'react';
export const metadata = {
  title: 'Terms of Service — SetReady',
  description: 'The terms that govern your use of SetReady.',
};

const wrap: CSSProperties = {
  maxWidth: 800,
  margin: '0 auto',
  padding: '48px 20px 96px',
  color: '#374151',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fontSize: 16,
  lineHeight: 1.7,
};
const back: CSSProperties = { color: '#1d4ed8', textDecoration: 'none', fontSize: 14, fontWeight: 600 };
const h1: CSSProperties = { fontSize: 34, lineHeight: 1.15, fontWeight: 800, letterSpacing: '-0.02em', color: '#111827', margin: '24px 0 6px' };
const updated: CSSProperties = { color: '#6b7280', fontSize: 14, margin: '0 0 28px' };
const intro: CSSProperties = { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 20px', margin: '0 0 36px', fontSize: 15, color: '#374151' };
const h2: CSSProperties = { fontSize: 21, fontWeight: 700, color: '#111827', letterSpacing: '-0.01em', margin: '40px 0 10px', paddingTop: 18, borderTop: '1px solid #f0f1f3' };
const h3: CSSProperties = { fontSize: 16, fontWeight: 700, color: '#111827', margin: '20px 0 6px' };
const p: CSSProperties = { margin: '0 0 14px' };
const ul: CSSProperties = { margin: '0 0 14px', paddingLeft: 22 };
const li: CSSProperties = { margin: '0 0 8px' };
const a: CSSProperties = { color: '#1d4ed8' };

export default function TermsOfServicePage() {
  return (
    <main style={wrap}>
      <a href="/" style={back}>&larr; Back to SetReady</a>
      <h1 style={h1}>Terms of Service</h1>
      <p style={updated}>Last updated: June 27, 2026</p>

      <div style={intro}>
        By using SetReady you agree to these Terms and to our <a style={a} href="/privacy">Privacy Policy</a>.
        If you do not agree, please do not use the Service. SetReady is available only to adults (18+) who
        reside in Canada.
      </div>

      <h2 style={h2}>1. Acceptance of these terms</h2>
      <p style={p}>
        By accessing or using SetReady (&ldquo;SetReady&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;us&rdquo;),
        you agree to be bound by these Terms of Service and our Privacy Policy, which explains how we collect,
        use, and share your personal information.
      </p>

      <h2 style={h2}>2. What SetReady is</h2>
      <p style={p}>
        SetReady is an online platform that connects Canadian film and television background performers with
        agents and casting directors. The Service includes:
      </p>
      <ul style={ul}>
        <li style={li}>Performer profiles with photos and casting details, visible to agents and casting directors;</li>
        <li style={li}>An availability calendar, with an optional private calendar-sync feed;</li>
        <li style={li}>Search and discovery tools used by agents and casting directors;</li>
        <li style={li}>In-app messaging;</li>
        <li style={li}>An AI-assisted headshot feedback tool;</li>
        <li style={li}>Training modules, quizzes, and completion certificates;</li>
        <li style={li}>Tools such as a rate calculator, on-set journal, and voucher wallet;</li>
        <li style={li}>Paid subscription features; and</li>
        <li style={li}>A referral program.</li>
      </ul>
      <p style={p}>Features may change, be added, or be removed over time.</p>

      <h2 style={h2}>3. Eligibility and where SetReady is offered</h2>
      <h3 style={h3}>3.1 Age</h3>
      <p style={p}>
        You must be at least <strong>18 years old</strong> and the age of majority in your province or territory
        of residence to create an account or use the Service. By registering, you confirm that you meet this
        requirement. If we discover that an account holder is under 18, we will terminate the account and delete
        the associated data.
      </p>
      <h3 style={h3}>3.2 Location</h3>
      <p style={p}>
        SetReady is offered <strong>only to residents of Canada</strong>. The Service is not directed to, or
        intended for, users outside Canada.
      </p>
      <h3 style={h3}>3.3 Your account</h3>
      <p style={p}>You are responsible for providing accurate information, keeping your login credentials secure, and all activity under your account. Do not share your account.</p>
      <h3 style={h3}>3.4 Suspension and termination</h3>
      <p style={p}>You may delete your account at any time in Settings.</p>
      <p style={p}>
        SetReady reserves the right, at its sole discretion, to suspend, restrict, or terminate your account or
        access to all or part of the Service, at any time and with or without notice, including where: (a) you
        breach or we reasonably suspect you have breached these Terms; (b) your conduct is unlawful, fraudulent,
        abusive, harassing, or harmful to other users, to SetReady, or to any third party; (c) you fail to pay
        fees when due; (d) we are required to do so by law or by a request from law enforcement or a governmental
        authority; or (e) we discontinue or materially modify the Service.
      </p>
      <p style={p}>
        Where the circumstances are not urgent and do not involve a risk of harm, fraud, illegality, or a breach
        requiring immediate action, we will endeavour to provide notice and the reasons for the action, unless
        doing so is prohibited by law or would create a security risk. In urgent cases, we may suspend or terminate
        access immediately and without prior notice. You may appeal a suspension or termination within 14 days by
        emailing <a style={a} href="mailto:support@setready.site">support@setready.site</a>.
      </p>
      <p style={p}>
        Upon termination, your right to access and use the Service will immediately cease. Termination does not
        relieve you of obligations or liabilities accrued before termination, including outstanding payment
        obligations, and the provisions of these Terms that by their nature should survive termination will survive.
      </p>

      <h2 style={h2}>4. Your content and conduct</h2>
      <h3 style={h3}>4.1 Your content and the licence you grant</h3>
      <p style={p}>
        You retain ownership of the content you upload, including your photos and profile information. By
        uploading content, you grant SetReady a non-exclusive, royalty-free licence to host, store, reproduce,
        and display that content for the purpose of operating and providing the Service — including displaying
        your profile and photos to agents and casting directors and, where you use the headshot analyzer,
        transmitting your photo to our AI provider to generate feedback. This licence ends when you delete the
        content or your account, except for copies retained as required by law or held temporarily in routine backups.
      </p>
      <h3 style={h3}>4.2 Your responsibilities for content</h3>
      <p style={p}>
        You confirm that you have the right to upload the content you submit — for example, that you are the
        person shown in your headshots, or have permission to use the images — and that your profile information
        is accurate and not misleading.
      </p>
      <h3 style={h3}>4.3 Prohibited conduct</h3>
      <p style={p}>You agree not to:</p>
      <ul style={ul}>
        <li style={li}>Use the Service for any unlawful purpose;</li>
        <li style={li}>Impersonate anyone, or misrepresent your identity or eligibility;</li>
        <li style={li}>Harass, abuse, threaten, or harm other users;</li>
        <li style={li}>Upload content that is defamatory, obscene, harassing, or that infringes third-party rights;</li>
        <li style={li}>Access accounts, data, or areas you are not authorized to access;</li>
        <li style={li}>Probe, scan, or test the security of our systems;</li>
        <li style={li}>Reverse engineer, copy, or modify the Service;</li>
        <li style={li}>Use bots or automated scripts to interact with the Service; or</li>
        <li style={li}>Misuse personal information you obtain through the Service — for example, contacting performers for any purpose other than legitimate casting.</li>
      </ul>

      <h2 style={h2}>5. Intellectual property</h2>
      <p style={p}>
        Our software, designs, logos, training materials, and quiz content are owned by SetReady and protected
        by Canadian and international law. Certificates generated by the Service are proof of course completion
        only; they do not guarantee employment, union membership, or any specific outcome.
      </p>

      <h2 style={h2}>6. AI features</h2>
      <p style={p}>
        Some features use artificial intelligence, including the headshot analyzer (which sends your submitted
        photo to a third-party AI provider, Anthropic, to generate feedback) and AI-assisted search
        interpretation. AI output may be inaccurate or incomplete and is provided for guidance only — verify
        important information independently. AI feedback is not a casting decision and guarantees no outcome.
      </p>

      <h2 style={h2}>7. Payments, subscriptions, and refunds</h2>
      <h3 style={h3}>7.1 Billing</h3>
      <p style={p}>
        Paid features are sold by subscription, and current pricing is shown in the Service. Subscriptions are
        billed through our payment processor, Stripe. If you obtain SetReady through the Apple App Store or
        Google Play, your subscription may instead be billed by that store under its own terms; in that case you
        must manage and cancel the subscription through that store, and you can restore purchases using the
        store&rsquo;s restore function.
      </p>
      <h3 style={h3}>7.2 Automatic renewal and cancellation</h3>
      <p style={p}>
        Subscriptions renew automatically at the then-current price at the end of each billing period unless you
        cancel before the renewal date. You may cancel at any time in your billing settings (or through the app
        store, if you purchased there). Cancellation stops future renewals, and you keep access until the end of
        the period you have already paid for. Where we are able to, we will send a renewal reminder before a
        renewal; you should not rely on receiving one and remain responsible for managing your subscription.
      </p>
      <h3 style={h3}>7.3 Refunds</h3>
      <p style={p}>
        Except where rights under applicable consumer protection law require otherwise, fees already charged are
        non-refundable, and cancelling stops future billing without refunding the current period. <strong>Nothing
        in these Terms limits any rights you have under applicable consumer protection legislation — including the
        Quebec <em>Consumer Protection Act</em> — that cannot be waived by contract.</strong>
      </p>
      <h3 style={h3}>7.4 Price changes</h3>
      <p style={p}>We may change prices with reasonable advance notice. Changes do not affect the term you have already paid for.</p>

      <h2 style={h2}>8. Referral program</h2>
      <ul style={ul}>
        <li style={li}>You earn a <strong>20% commission</strong> when a user you referred makes a qualifying paid subscription payment. Commission is earned <strong>once per referred user</strong>, on their first qualifying payment.</li>
        <li style={li}>Commissions are held for 30 days from the qualifying payment before becoming payable, to allow for refund and dispute windows.</li>
        <li style={li}>The minimum payout is <strong>$10.00 CAD</strong>; amounts below the threshold carry over until it is reached.</li>
        <li style={li}>Payouts are made monthly by Interac e-Transfer to the email address you provide at the time of request.</li>
        <li style={li}>Referral codes are personal and non-transferable, and may only be used by the account holder.</li>
        <li style={li}>We may verify referrals before paying, and may withhold or reverse commissions on disputed, refunded, fraudulent, or abusive activity, and may suspend referral privileges for abuse.</li>
      </ul>

      <h2 style={h2}>9. Disclaimer of warranties</h2>
      <p style={p}>
        The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind,
        express or implied. We do not warrant that the Service will be uninterrupted, timely, secure, or
        error-free, that training or quiz results will lead to employment, or that any agent or casting director
        will contact you or cast you.
      </p>

      <h2 style={h2}>10. Limitation of liability</h2>
      <p style={p}>
        To the maximum extent permitted by law, SetReady and its owners, employees, and affiliates are not liable
        for any indirect, incidental, special, consequential, or punitive damages arising from your use of the
        Service, including loss of profits, data, or goodwill. Our total liability will not exceed the amount you
        paid us, if any, in the 12 months before the claim. Nothing in this Section excludes or limits liability
        that cannot be excluded or limited under applicable law, including liability for fraud or for death or
        personal injury caused by negligence.
      </p>

      <h2 style={h2}>11. Indemnification</h2>
      <p style={p}>
        You agree to indemnify and hold SetReady harmless from claims, damages, losses, and expenses arising from
        your violation of these Terms, your use of the Service, or your violation of any third-party rights.
      </p>

      <h2 style={h2}>12. Governing law</h2>
      <p style={p}>These Terms are governed by the laws of British Columbia and the federal laws of Canada applicable there, without regard to conflict-of-law rules.</p>

      <h2 style={h2}>13. Dispute resolution</h2>
      <p style={p}>
        We encourage you to contact us first so we can try to resolve any concern informally. Where permitted by
        applicable law, disputes that cannot be resolved informally will be settled by binding arbitration in
        Vancouver, British Columbia, and you waive participation in class actions. <strong>This Section does not
        apply to the extent it is prohibited by applicable consumer protection law — including in Quebec, where
        consumers keep the right to bring a claim in court and to participate in class actions.</strong> Any claim
        must be brought within the limitation period allowed by applicable law.
      </p>

      <h2 style={h2}>14. Changes to these terms</h2>
      <p style={p}>
        We may update these Terms from time to time. We will post the updated Terms here with a new
        &ldquo;Last updated&rdquo; date and, for material changes, notify you by email where appropriate.
        Continuing to use the Service after changes take effect means you accept the updated Terms.
      </p>

      <h2 style={h2}>15. Contact</h2>
      <p style={p}>For any inquiry, including legal and support matters: <a style={a} href="mailto:support@setready.site">support@setready.site</a>.</p>

      <h2 style={h2}>16. Entire agreement</h2>
      <p style={p}>These Terms and the Privacy Policy are the entire agreement between you and SetReady regarding the Service and supersede any prior agreements.</p>

      <h2 style={h2}>17. Force majeure</h2>
      <p style={p}>
        SetReady is not liable for any delay or failure to perform caused by events outside its reasonable
        control, including acts of God, war, terrorism, civil unrest, fire, flood, strikes, or interruptions of
        third-party services (including Supabase, Vercel, Stripe, Resend, Anthropic, or internet service providers).
      </p>

      <h2 style={h2}>18. No waiver</h2>
      <p style={p}>Our failure to enforce any provision of these Terms is not a waiver of that provision.</p>
    </main>
  );
}
