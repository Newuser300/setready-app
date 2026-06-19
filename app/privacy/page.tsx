import type { CSSProperties } from 'react';
export const metadata = {
  title: 'Privacy Policy — SetReady',
  description: 'How SetReady collects, uses, discloses, and protects your personal information.',
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
const summary: CSSProperties = { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 20px', margin: '0 0 36px', fontSize: 15, color: '#374151' };
const h2: CSSProperties = { fontSize: 21, fontWeight: 700, color: '#111827', letterSpacing: '-0.01em', margin: '40px 0 10px', paddingTop: 18, borderTop: '1px solid #f0f1f3' };
const h3: CSSProperties = { fontSize: 16, fontWeight: 700, color: '#111827', margin: '20px 0 6px' };
const p: CSSProperties = { margin: '0 0 14px' };
const ul: CSSProperties = { margin: '0 0 14px', paddingLeft: 22 };
const li: CSSProperties = { margin: '0 0 8px' };
const th: CSSProperties = { textAlign: 'left', fontWeight: 700, color: '#111827', borderBottom: '2px solid #e5e7eb', padding: '8px 10px', fontSize: 14, verticalAlign: 'top' };
const td: CSSProperties = { borderBottom: '1px solid #eef0f2', padding: '8px 10px', fontSize: 14, verticalAlign: 'top' };
const a: CSSProperties = { color: '#1d4ed8' };

export default function PrivacyPolicyPage() {
  return (
    <main style={wrap}>
      <a href="/" style={back}>&larr; Back to SetReady</a>
      <h1 style={h1}>Privacy Policy</h1>
      <p style={updated}>Last updated: June 18, 2026</p>

      <div style={summary}>
        <strong>In short:</strong> SetReady is a Canada-only platform that connects adult background
        performers with agents and casting directors. To do that, we collect your profile information —
        including photos, physical details, general location, and availability — and make it visible to
        agents and casting directors. We use trusted service providers in the United States to run the
        platform. We never sell your information. You can access, correct, or delete your data at any time.
      </div>

      <p style={p}>
        This Privacy Policy explains how SetReady (&ldquo;SetReady&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;)
        collects, uses, discloses, and protects your personal information, and your rights under Canadian
        privacy law, including the federal <em>Personal Information Protection and Electronic Documents Act</em>
        (PIPEDA) and applicable provincial laws such as Quebec&rsquo;s <em>Law 25</em>.
      </p>

      <h2 style={h2}>1. Who SetReady is for</h2>
      <p style={p}>
        SetReady is intended <strong>solely for residents of Canada</strong>. The Service is not directed to,
        or intended for use by, anyone outside Canada.
      </p>
      <p style={p}>
        SetReady is for <strong>adults only</strong>. You must be at least <strong>18 years of age</strong> and
        the age of majority in your province or territory to create an account or use the Service. We do not
        knowingly collect personal information from anyone under 18. If we learn that we have collected
        information from a minor, we will delete it and close the account.
      </p>

      <h2 style={h2}>2. Information we collect</h2>
      <ul style={ul}>
        <li style={li}><strong>Account and identity:</strong> name, email address, password (stored only in hashed form), province, and city.</li>
        <li style={li}><strong>Casting profile:</strong> headshots and other photos you upload, physical characteristics you provide (such as height and other attributes used for casting), special skills, and other profile details.</li>
        <li style={li}><strong>Location:</strong> your home city/region and, if you provide it, approximate geographic coordinates (latitude/longitude) and your travel willingness and radius, used to match you with work in relevant regions.</li>
        <li style={li}><strong>Availability:</strong> the dates and booking status you set on your calendar. If you enable calendar sync, we generate a private feed link containing a secret token; anyone who has that link can view your availability, so treat it like a password.</li>
        <li style={li}><strong>Activity:</strong> training module progress, quiz scores, certificates, points and streaks, on-set journal entries, voucher wallet, and use of in-app tools.</li>
        <li style={li}><strong>Communications:</strong> messages you send and receive through in-app messaging, and emails you exchange with us.</li>
        <li style={li}><strong>Payments:</strong> subscription status and dates, and customer/subscription identifiers from our payment processor. We do <strong>not</strong> collect or store your payment card numbers — those are handled directly by Stripe.</li>
        <li style={li}><strong>Referrals:</strong> your referral code, the link between a referrer and a referred user, and the Interac e-Transfer email address you provide when you request a referral payout.</li>
        <li style={li}><strong>Headshot analysis:</strong> if you choose to use the headshot analyzer, the photo you submit is sent to our AI provider to generate written feedback (see Sections 5 and 6).</li>
        <li style={li}><strong>Technical:</strong> IP address, device and browser information, and request logs generated automatically when you use the Service.</li>
      </ul>

      <h2 style={h2}>3. How we collect information, cookies, and consent</h2>
      <p style={p}>
        We collect information <strong>directly from you</strong> when you register, build your profile, upload
        photos, set availability, message others, subscribe, or contact us, and <strong>automatically</strong>
        through your use of the Service.
      </p>
      <h3 style={h3}>Cookies</h3>
      <p style={p}>
        We use only <strong>essential cookies</strong> required for core functionality such as login and session
        management (provided through our authentication service). We do <strong>not</strong> use advertising or
        third-party analytics cookies. Our hosting provider records basic infrastructure-level request
        information (such as IP address and the page requested) to operate and secure the Service.
      </p>
      <h3 style={h3}>Consent</h3>
      <p style={p}>
        By creating an account and using SetReady, you consent to the collection, use, and disclosure of your
        personal information as described in this policy. Because your profile includes sensitive information
        such as photos, we rely on your consent to display and process that information as described in Section 4.
        You may withdraw your consent at any time (see Section 8), though doing so may limit or end your ability
        to use the Service.
      </p>

      <h2 style={h2}>4. How your information is shown to other users</h2>
      <p style={p}>
        SetReady is a marketplace, and this is its core purpose. Information in your performer profile —
        including your <strong>name, photos, physical characteristics, special skills, general
        location/region, and availability</strong> — is made visible to other users of the Service,
        specifically <strong>agents and casting directors</strong>, so they can consider you for work and
        contact you. Please do not include information in your profile that you are not comfortable sharing
        with these users. Agents and casting directors also hold accounts and provide information to us, which
        performers and other authorized users may see in the normal course of using the Service.
      </p>

      <h2 style={h2}>5. Service providers and international data transfers</h2>
      <p style={p}>
        We share personal information with the service providers below, who process it on our behalf. All of
        them are located in the <strong>United States</strong>, which means your information is transferred to
        and stored outside Canada. We take steps to require comparable protection, but information held in the
        U.S. may be subject to access by U.S. authorities under U.S. law.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '0 0 14px' }}>
          <thead>
            <tr>
              <th style={th}>Provider</th>
              <th style={th}>Purpose</th>
              <th style={th}>Information shared</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={td}>Supabase</td><td style={td}>Database &amp; authentication</td><td style={td}>Name, email, hashed password, profile and account data</td></tr>
            <tr><td style={td}>Vercel</td><td style={td}>Application hosting &amp; infrastructure logging</td><td style={td}>IP address, request data</td></tr>
            <tr><td style={td}>Stripe</td><td style={td}>Payment processing</td><td style={td}>Billing details and card data (held by Stripe, not by us) &mdash; <a style={a} href="https://stripe.com/privacy">stripe.com/privacy</a></td></tr>
            <tr><td style={td}>Resend</td><td style={td}>Sending transactional email</td><td style={td}>Email address and message content</td></tr>
            <tr><td style={td}>Anthropic</td><td style={td}>AI analysis of headshots you submit to the analyzer</td><td style={td}>The photo and prompt you submit</td></tr>
          </tbody>
        </table>
      </div>
      <p style={p}><strong>We do not sell your personal information.</strong></p>

      <h2 style={h2}>6. Artificial intelligence</h2>
      <p style={p}>Two features use AI:</p>
      <ul style={ul}>
        <li style={li}>
          <strong>Headshot analyzer.</strong> When you choose to use it, your photo is sent to Anthropic&rsquo;s
          API to generate written feedback. The image is processed solely to produce that feedback and, under
          Anthropic&rsquo;s API terms, is not used to train Anthropic&rsquo;s models. The feedback is automated,
          is provided for guidance only, is not a casting decision, and does not guarantee any outcome.
        </li>
        <li style={li}>
          <strong>Search assistance.</strong> Casting searches may use AI to interpret a casting director&rsquo;s
          text query into search criteria. Casting decisions are made by people, not by automated processing alone.
        </li>
      </ul>

      <h2 style={h2}>7. Data retention</h2>
      <ul style={ul}>
        <li style={li}><strong>Active accounts:</strong> retained while your account is active.</li>
        <li style={li}><strong>Deleted accounts:</strong> we delete your personal information within 30 days of your deletion request, except where we must retain certain records to meet legal, tax, or accounting obligations (for example, payment and referral-commission records).</li>
        <li style={li}><strong>Backups:</strong> residual copies in backups are overwritten on our providers&rsquo; normal cycles.</li>
      </ul>

      <h2 style={h2}>8. Your rights</h2>
      <p style={p}>Under PIPEDA and applicable provincial law (including Quebec&rsquo;s Law 25), you may:</p>
      <ul style={ul}>
        <li style={li}><strong>Access</strong> the personal information we hold about you.</li>
        <li style={li}><strong>Correct</strong> inaccurate information.</li>
        <li style={li}><strong>Withdraw consent</strong> or <strong>delete</strong> your account, subject to the legal retention noted above.</li>
        <li style={li}><strong>Request portability</strong> of certain information you provided, in a structured, commonly used format, where required by law.</li>
      </ul>
      <p style={p}>To exercise these rights, contact us at <a style={a} href="mailto:setready@mail.com">setready@mail.com</a>. We will respond within the timeframes required by law.</p>

      <h2 style={h2}>9. Security and breach response</h2>
      <p style={p}>
        We use industry-standard measures including encryption in transit (TLS), hashed passwords, access
        controls, and row-level security in our database. No system is perfectly secure. If a breach of your
        personal information creates a real risk of significant harm, we will notify you and the Office of the
        Privacy Commissioner of Canada as required by PIPEDA — and, where Quebec&rsquo;s Law 25 applies, the
        Commission d&rsquo;accès à l&rsquo;information du Québec — and we will keep breach records as required by law.
      </p>

      <h2 style={h2}>10. Accuracy of your information</h2>
      <p style={p}>
        You are responsible for keeping your information accurate and up to date. You can update your profile in
        your account settings, or contact us at <a style={a} href="mailto:setready@mail.com">setready@mail.com</a> and we will correct it promptly.
      </p>

      <h2 style={h2}>11. Privacy Officer and accountability</h2>
      <p style={p}>
        We have designated a Privacy Officer responsible for our compliance with applicable privacy law. You can
        reach the Privacy Officer at <a style={a} href="mailto:setready@mail.com">setready@mail.com</a>.
      </p>

      <h2 style={h2}>12. Changes to this policy</h2>
      <p style={p}>
        We may update this policy from time to time. We will post the updated policy here with a new
        &ldquo;Last updated&rdquo; date and, for material changes, notify you by email where appropriate.
      </p>

      <h2 style={h2}>13. Contact and complaints</h2>
      <p style={p}>
        Questions, or to exercise your rights: <a style={a} href="mailto:setready@mail.com">setready@mail.com</a>.
      </p>
      <p style={p}>If you are not satisfied with our response, you may contact:</p>
      <ul style={ul}>
        <li style={li}>Office of the Privacy Commissioner of Canada — <a style={a} href="https://www.priv.gc.ca">priv.gc.ca</a> — 1-800-282-1376</li>
        <li style={li}>(Quebec residents) Commission d&rsquo;accès à l&rsquo;information du Québec — <a style={a} href="https://www.cai.gouv.qc.ca">cai.gouv.qc.ca</a></li>
      </ul>
    </main>
  );
}
