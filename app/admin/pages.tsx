// app/dashboard/admin/page.tsx
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Basic protection: redirect if no user is logged in
  if (!user) {
    redirect('/auth/sign-in');
  }

  // Optional: Add a role check here later
  // For now, it's an admin area accessible to any logged-in user.

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Admin Dashboard</h1>
      <p className="text-gray-600 mb-8">Welcome to the admin area, {user.email}.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* User Management Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h2 className="text-xl font-semibold mb-2 text-gray-800">User Management</h2>
          <p className="text-gray-500 mb-4">View, add, or manage system users.</p>
          <Link href="/dashboard/admin/users" className="text-blue-600 hover:underline">
            Manage Users →
          </Link>
        </div>

        {/* Affiliates Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h2 className="text-xl font-semibold mb-2 text-gray-800">Affiliates</h2>
          <p className="text-gray-500 mb-4">Track affiliate performance and payouts.</p>
          <Link href="/dashboard/admin/affiliates" className="text-blue-600 hover:underline">
            View Affiliates →
          </Link>
        </div>

        {/* Analytics Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h2 className="text-xl font-semibold mb-2 text-gray-800">Analytics & Revenue</h2>
          <p className="text-gray-500 mb-4">View platform analytics and revenue reports.</p>
          <Link href="/dashboard/admin/analytics" className="text-blue-600 hover:underline">
            View Reports →
          </Link>
        </div>
      </div>
    </div>
  );
}