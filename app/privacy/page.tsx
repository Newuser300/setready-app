import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy - SetReady',
  description: 'SetReady privacy policy for Canadian film industry training. Learn how we collect, use, and protect your data.',
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto p-8 bg-white shadow-lg rounded-xl my-8">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-gray-600 mb-8">Last Updated: April 26, 2026</p>
      
      <div className="bg-blue-50 p-4 rounded-lg mb-8">
        <p className="text-sm text-blue-800">
          <strong>Quick Summary:</strong> We collect your email and quiz progress to provide training and certificates. 
          We do not sell your data. You can delete your account at any time.
        </p>
      </div>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
        <p className="mb-2">We collect the following information to provide our services:</p>
        <ul className="list-disc pl-6 space-y-1 text-gray-700">
          <li><strong>Account Information:</strong> Email address, name, and province selection</li>
          <li><strong>Progress Data:</strong> Module completion status, quiz scores, and learning progress</li>
          <li><strong>Certificate Information:</strong> Your name and completion dates on certificates</li>
          <li><strong>Usage Data:</strong> Which modules you access and time spent (anonymized)</li>
        </ul>
        <p className="mt-2 text-sm text-gray-500">We do not collect payment information directly - all payments are processed by third-party providers.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">2. How We Collect Information & Your Consent</h2>
        <ul className="list-disc pl-6 space-y-1 text-gray-700">
          <li><strong>Direct collection:</strong> When you create an account, take quizzes, and update your profile</li>
          <li><strong>Automatic collection:</strong> When you use our app, we track your progress and usage patterns</li>
          <li><strong>Cookies and Tracking Technologies:</strong> We use essential cookies required for website functionality (login, session management). We also use analytics cookies to understand how users interact with our training modules, which helps us improve our content. Analytics data is anonymized. You can disable non-essential cookies in your browser settings, though some features may be affected.</li>
        </ul>
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>How We Obtain Consent:</strong> By creating an account and using SetReady, you voluntarily provide your personal information and consent to its collection, use, and disclosure as described in this Privacy Policy. You may withdraw your consent at any time (see Section 6 below for details on how to withdraw consent without deleting your entire account).
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
        <ul className="list-disc pl-6 space-y-1 text-gray-700">
          <li>Authenticate your account and keep you signed in</li>
          <li>Track your progress through training modules</li>
          <li>Generate and store your completion certificates</li>
          <li>Improve our educational content based on usage patterns</li>
          <li>Send important account notifications (password reset, certificate available)</li>
          <li>Comply with legal obligations</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">4. Third-Party Service Providers</h2>
        <p className="mb-2">We share your information with the following trusted third parties:</p>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-200 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-300 p-2 text-left">Provider</th>
                <th className="border border-gray-300 p-2 text-left">Purpose</th>
                <th className="border border-gray-300 p-2 text-left">Data Shared</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 p-2">Supabase</td>
                <td className="border border-gray-300 p-2">Database & Authentication</td>
                <td className="border border-gray-300 p-2">Email, encrypted password, progress data</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2">Vercel</td>
                <td className="border border-gray-300 p-2">App Hosting</td>
                <td className="border border-gray-300 p-2">Usage data, IP addresses</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2">Stripe</td>
                <td className="border border-gray-300 p-2">Payment processing</td>
                <td className="border border-gray-300 p-2">Payment card data, billing information (processed by Stripe — we do not store card data). Policy: <a href="https://stripe.com/privacy" className="text-blue-600 hover:underline">stripe.com/privacy</a>. United States.</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2">Apple App Store</td>
                <td className="border border-gray-300 p-2">App distribution & subscription payments</td>
                <td className="border border-gray-300 p-2">User ID, purchase history, subscription status</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2">Google Play Store</td>
                <td className="border border-gray-300 p-2">App distribution & subscription payments</td>
                <td className="border border-gray-300 p-2">User ID, purchase history, subscription status</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm text-gray-500">We do not sell your personal information to anyone. These app stores act as merchants of record for subscription payments and collect purchase information necessary to process transactions.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">5. Data Retention</h2>
        <ul className="list-disc pl-6 space-y-1 text-gray-700">
          <li><strong>Active accounts:</strong> Your data is retained as long as your account is active</li>
          <li><strong>Deleted accounts:</strong> Data is deleted within 30 days of account deletion request</li>
          <li><strong>Certificates:</strong> Permanently stored as proof of completion</li>
          <li><strong>Usage analytics:</strong> Retained for 12 months in anonymized form</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">6. Your Rights (Under Canadian Law - PIPEDA)</h2>
        <p className="mb-2">You have the following rights regarding your personal information:</p>
        <ul className="list-disc pl-6 space-y-1 text-gray-700">
          <li><strong>Right to Access:</strong> Request a copy of all data we hold about you</li>
          <li><strong>Right to Correct:</strong> Update inaccurate information in your profile</li>
          <li><strong>Right to Delete:</strong> Request permanent account deletion</li>
          <li><strong>Right to Withdraw Consent:</strong> You may withdraw your consent to specific data processing activities (such as analytics tracking) without deleting your entire account by contacting us at setready@mail.com. Withdrawing consent may impact certain features.</li>
        </ul>
        <p className="mt-2 text-sm text-gray-500">To exercise these rights, please contact us at <a href="mailto:setready@mail.com" className="text-blue-600 hover:underline">setready@mail.com</a></p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">7. Children's Privacy</h2>
        <p>Our Service is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us immediately. If we discover that we have inadvertently collected personal information from a child under 13, we will delete it immediately. Parents or guardians who believe their child has provided us with personal information should contact us at setready@mail.com.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">8. Security & Data Breach Response</h2>
        <p>We implement industry-standard security measures including:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1 text-gray-700">
          <li>Encryption of data in transit (TLS/SSL)</li>
          <li>Secure database storage with encrypted passwords</li>
          <li>Regular security reviews and updates</li>
          <li>Row Level Security in Supabase to prevent unauthorized access</li>
        </ul>
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>Data Breach Response:</strong> In the event of a data breach involving your personal information that poses a real risk of significant harm, we will notify you and the Office of the Privacy Commissioner of Canada as required by law. We maintain breach records for 24 months as required by PIPEDA.
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">9. Accuracy of Your Information</h2>
        <p>You are responsible for ensuring that your personal information is accurate and up to date. You can update your name and province in your account settings at any time. If you believe any information we hold about you is inaccurate, please contact us at setready@mail.com and we will correct it promptly.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">10. International Data Transfers</h2>
        <p>Your data is stored on Supabase servers located in <strong>West US (Oregon)</strong>. By using SetReady, you consent to this transfer. We ensure appropriate safeguards are in place to protect your data.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">11. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. We will notify you of any material changes by:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1 text-gray-700">
          <li>Posting the new policy on this page</li>
          <li>Updating the "Last Updated" date</li>
          <li>Sending an email notification for significant changes</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">12. Contact Information & Privacy Compliance</h2>
        <p className="mb-2">For privacy-related inquiries or to exercise your rights under PIPEDA, please contact us at:</p>
        <p className="mb-2"><strong>Email:</strong> <a href="mailto:setready@mail.com" className="text-blue-600 hover:underline">setready@mail.com</a></p>
        <p className="mb-2"><strong>Privacy Compliance Contact:</strong> The individual responsible for SetReady's privacy compliance can be reached at setready@mail.com. For formal privacy-related matters, please address your correspondence to the Privacy Compliance Officer at this email address.</p>
        <p>For general inquiries, use the same email address.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">13. Complaints</h2>
        <p>If you are not satisfied with our response to a privacy complaint, you may contact the Office of the Privacy Commissioner of Canada:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1 text-gray-700">
          <li>Website: <a href="https://www.priv.gc.ca" className="text-blue-600 hover:underline">www.priv.gc.ca</a></li>
          <li>Toll-free: 1-800-282-1376</li>
        </ul>
      </section>

      <div className="mt-8 pt-4 border-t border-gray-200 text-center text-sm text-gray-500">
        <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>
        {' • '}
        <Link href="/dashboard" className="text-blue-600 hover:underline">Back to Dashboard</Link>
      </div>
    </div>
  );
}