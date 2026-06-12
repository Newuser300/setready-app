import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service - SetReady',
  description: 'SetReady terms of service for Canadian film industry training. Learn about account usage, payments, and user conduct.',
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto p-8 bg-white shadow-lg rounded-xl my-8">
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-gray-600 mb-8">Last Updated: June 12, 2026</p>

      <div className="bg-yellow-50 p-4 rounded-lg mb-8 border-l-4 border-yellow-500">
        <p className="text-sm text-yellow-800">
          <strong>By using SetReady, you agree to these terms.</strong> If you do not agree, please do not use our Service.
        </p>
      </div>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms & Privacy</h2>
        <p>By downloading, accessing, or using SetReady ("the App", "we", "our", "us"), you agree to be bound by these Terms of Service and our <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>. These terms apply to all users of the App.</p>
        <p className="mt-2">Your use of the App is also governed by our Privacy Policy, which explains how we collect, use, and share your personal information. By using SetReady, you consent to the collection and use of your information as described in the Privacy Policy.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
        <p>SetReady provides educational training for Canadian film industry background performers, including:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1 text-gray-700">
          <li>Training modules and lessons on film set terminology</li>
          <li>Quizzes and assessments to test knowledge</li>
          <li>Progress tracking and streak monitoring</li>
          <li>Completion certificate generation</li>
          <li>Union rate calculators</li>
          <li>Voucher tracking tools</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">3. Account Registration</h2>
        <h3 className="font-semibold mt-2">3.1 Eligibility</h3>
        <p>You must be at least 13 years old to create an account. By creating an account, you confirm that you are 13 years of age or older. If we discover that an account was created by someone under 13, we will terminate the account and delete all associated data.</p>
        
        <h3 className="font-semibold mt-3">3.2 Account Responsibility</h3>
        <p>You are responsible for:</p>
        <ul className="list-disc pl-6 mt-1 space-y-1 text-gray-700">
          <li>Providing accurate and complete information</li>
          <li>Keeping your login credentials secure</li>
          <li>All activity that occurs under your account</li>
          <li>Not sharing your account with others</li>
        </ul>
        
        <h3 className="font-semibold mt-3">3.3 Account Suspension and Termination</h3>
        <p>You may delete your account at any time through the Settings page.</p>
        <p className="mt-2">We may suspend or terminate your account if we reasonably believe you have violated these Terms. We will provide you with notice of the suspension or termination and the reasons for it, unless providing such notice is prohibited by law or would pose a security risk. You may appeal a suspension or termination by contacting us at setready@mail.com within 14 days of receiving the notice.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">4. User Conduct</h2>
        <p>You agree NOT to:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1 text-gray-700">
          <li>Share quiz answers or certificates fraudulently</li>
          <li>Attempt to bypass security measures or access unauthorized areas</li>
          <li>Use the App for any illegal purpose</li>
          <li>Harass, abuse, or impersonate other users</li>
          <li>Reverse engineer, copy, or modify the App's code</li>
          <li>Post inappropriate, offensive, or defamatory content</li>
          <li>Use automated scripts to interact with the App</li>
          <li>Upload, post, or transmit any content that is defamatory, harassing, obscene, or that infringes on third-party intellectual property rights</li>
          <li>Attempt to probe, scan, or test the vulnerability of our systems</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">5. Intellectual Property</h2>
        <h3 className="font-semibold mt-2">5.1 Our Content</h3>
        <p>All lesson content, quiz questions, course materials, logos, and designs are owned by SetReady and protected by Canadian and international copyright laws.</p>
        
        <h3 className="font-semibold mt-3">5.2 Your Content</h3>
        <p>You retain ownership of your quiz answers and progress data. By using the App, you grant SetReady a license to use this data to provide the Service and improve our content.</p>
        
        <h3 className="font-semibold mt-3">5.3 Certificates</h3>
        <p>Certificates generated by the App are proof of completion for the specific course. Certificates do not guarantee employment, union membership, or specific career outcomes.</p>
        
        <h3 className="font-semibold mt-3">5.4 AI-Generated Content</h3>
        <p>Some content within SetReady may be generated or assisted by artificial intelligence (AI). While we strive for accuracy, AI-generated content may contain errors or outdated information. You should verify any critical information independently.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">6. Payments and Refunds</h2>
        <h3 className="font-semibold mt-2">6.1 Pricing</h3>
        <p>Current pricing is displayed in the App. We reserve the right to change prices with reasonable notice. Any price changes will not affect existing paid subscriptions during their current term.</p>
        
        <h3 className="font-semibold mt-3">6.2 No-Refund Policy</h3>
        <p>All subscription purchases are <strong>final and non-refundable</strong>. Due to the digital nature of our educational content and the immediate access provided upon subscription, we do not issue refunds for any reason once a subscription has been activated.</p>
        <ul className="list-disc pl-6 mt-1 space-y-1 text-gray-700">
          <li>No refunds will be issued regardless of usage, progress, or circumstances</li>
          <li>Cancelling your subscription stops future billing but does not entitle you to a refund of amounts already charged</li>
          <li>If you have questions about your billing, contact setready@mail.com</li>
        </ul>

        <h3 className="font-semibold mt-3">6.3 30-Day Minimum Commitment</h3>
        <p>By subscribing to SetReady, you agree to a <strong>30-day minimum commitment period</strong>. During this period:</p>
        <ul className="list-disc pl-6 mt-1 space-y-1 text-gray-700">
          <li>Cancellation of your subscription is not available for the first 30 days from your subscription start date</li>
          <li>After 30 days, you may cancel at any time through your account&apos;s billing settings</li>
          <li>You will be billed for the full first month regardless of cancellation request timing</li>
        </ul>

        <h3 className="font-semibold mt-3">6.4 Automatic Renewal</h3>
        <p>If you purchase a subscription plan, your subscription will automatically renew at the end of each billing period at the then-current rate unless you cancel at least 24 hours before the renewal date. We will send you a reminder email at least 7 days before any automatic renewal. After the 30-day minimum commitment period, you may cancel your subscription at any time through your account settings.</p>
        
        <h3 className="font-semibold mt-3">6.5 Restoring Purchases</h3>
        <p>If you upgrade to a new device or reinstall the App, you may restore your previous purchases. For App Store purchases, tap <strong>"Restore Purchases"</strong> in the app's Settings. For Google Play Store purchases, restoration is automatic upon reinstalling.</p>

        <h3 className="font-semibold mt-3">6.6 Referral Program Terms</h3>
        <ul className="list-disc pl-6 mt-1 space-y-1 text-gray-700">
          <li>Users earn 20% commission on referrals when a referred user completes a paid subscription</li>
          <li>Commissions are held for 30 days from the referred user&apos;s subscription start date before becoming payable, to account for the minimum commitment period</li>
          <li>Minimum payout threshold is $10.00 CAD — commissions below this amount cannot be requested until the threshold is reached</li>
          <li>Commissions are paid monthly via Interac e-Transfer to the email address provided at time of request</li>
          <li>SetReady reserves the right to verify referrals before processing payment</li>
          <li>Commission is only earned on successful, non-disputed payments that complete the 30-day commitment period</li>
          <li>Referral codes are non-transferable and may only be used by the account holder</li>
          <li>SetReady reserves the right to suspend or terminate referral privileges for accounts found to be abusing the referral system</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">7. Third-Party Services</h2>
        <p>The App integrates with the following third-party services, which have their own terms and privacy policies:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1 text-gray-700">
          <li><strong>Supabase:</strong> Database and authentication</li>
          <li><strong>Vercel:</strong> App hosting and analytics</li>
          <li><strong>Stripe (<a href="https://stripe.com" className="text-blue-600 hover:underline">stripe.com</a>):</strong> Payment processing. Stripe handles all payment card data and financial transactions. Stripe&apos;s privacy policy is available at <a href="https://stripe.com/privacy" className="text-blue-600 hover:underline">stripe.com/privacy</a>. Stripe is PCI DSS compliant and we do not store your payment card information.</li>
        </ul>
        <p className="mt-2">We are not responsible for the practices of these third parties.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">8. Disclaimer of Warranties</h2>
        <p>The App is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not warrant that:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1 text-gray-700">
          <li>The App will be uninterrupted, timely, secure, or error-free</li>
          <li>Quiz results will lead to employment or career advancement</li>
          <li>All information is completely accurate or current</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">9. Limitation of Liability</h2>
        <p>To the maximum extent permitted by law, SetReady and its owners, employees, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the App, including but not limited to:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1 text-gray-700">
          <li>Loss of profits, data, or goodwill</li>
          <li>Personal injury or property damage</li>
          <li>Unauthorized access to your account</li>
        </ul>
        <p className="mt-2">Our total liability shall not exceed the amount you paid us, if any, in the past 12 months.</p>
        <p className="mt-2">Nothing in this Section 9 excludes or limits our liability for:</p>
        <ul className="list-disc pl-6 mt-1 space-y-1 text-gray-700">
          <li>Death or personal injury resulting from our gross negligence</li>
          <li>Fraud or fraudulent misrepresentation</li>
          <li>Any liability that cannot be excluded or limited under applicable law</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">10. Indemnification</h2>
        <p>You agree to indemnify and hold SetReady harmless from any claims, damages, losses, and expenses arising from:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1 text-gray-700">
          <li>Your violation of these Terms</li>
          <li>Your use of the App</li>
          <li>Your violation of any third-party rights</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">11. Governing Law</h2>
        <p>These Terms shall be governed by and construed in accordance with the laws of British Columbia, Canada, without regard to its conflict of law provisions.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">12. Dispute Resolution</h2>
        <p>Any disputes arising from these Terms or your use of the App shall be resolved through binding arbitration in Vancouver, British Columbia, Canada. You waive the right to participate in class actions.</p>
        <p className="mt-2">Any claim arising out of or relating to these Terms or your use of the App must be filed within one (1) year after the claim arose; otherwise, the claim is permanently barred.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">13. Changes to Terms</h2>
        <p>We may update these Terms from time to time. We will notify you of material changes by:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1 text-gray-700">
          <li>Posting the new Terms on this page</li>
          <li>Updating the "Last Updated" date</li>
          <li>Sending an email notification for significant changes</li>
        </ul>
        <p className="mt-2">Continued use of the App after changes constitutes acceptance of the new Terms.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">14. Contact Us</h2>
        <p>For all inquiries, including legal matters, privacy concerns, and general support:</p>
        <p className="mt-2"><strong>Email:</strong> <a href="mailto:setready@mail.com" className="text-blue-600 hover:underline">setready@mail.com</a></p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">15. Entire Agreement</h2>
        <p>These Terms constitute the entire agreement between you and SetReady regarding your use of the App, superseding any prior agreements.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">16. Force Majeure</h2>
        <p>SetReady shall not be liable for any delay or failure to perform resulting from causes outside its reasonable control, including but not limited to acts of God, war, terrorism, riots, embargos, acts of civil or military authorities, fire, floods, accidents, strikes, shortages of transportation facilities, fuel, energy, labor, or materials, or any interruption of third-party services (including but not limited to Supabase, Vercel, or internet service providers).</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">17. No Waiver</h2>
        <p>Our failure to enforce any right or provision of these Terms shall not be deemed a waiver of such right or provision.</p>
      </section>

      <div className="mt-8 pt-4 border-t border-gray-200 text-center text-sm text-gray-500">
        <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
        {' • '}
        <Link href="/dashboard" className="text-blue-600 hover:underline">Back to Dashboard</Link>
      </div>
    </div>
  );
}