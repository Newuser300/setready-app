import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export default async function AdminAffiliatesPage() {
  const supabase = await createClient()
  
  // Get the authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  console.log('Admin page - User:', user?.email)
  console.log('Admin page - Error:', userError?.message)
  
  // If not logged in, redirect to sign in
  if (!user) {
    console.log('No user found, redirecting to sign in')
    redirect('/auth/sign-in')
  }
  
  // Check if user is admin (case-insensitive)
  const isAdmin = user.email?.toLowerCase() === 'mikebhangu@gmail.com'
  
  if (!isAdmin) {
    console.log(`User ${user.email} is not admin, redirecting to dashboard`)
    redirect('/dashboard')
  }
  
  console.log('Admin access granted for:', user.email)
  
  // Fetch all affiliates
  const { data: affiliates } = await supabase
    .from('affiliate_codes')
    .select('*')
    .order('created_at', { ascending: false })
  
  // Fetch pending e-transfer requests
  const { data: pendingRequests } = await supabase
    .from('etransfer_requests')
    .select(`
      *,
      affiliate_codes (code, name, email)
    `)
    .eq('status', 'pending')
    .order('requested_at', { ascending: true })
  
  // Server action to create affiliate code
  async function createAffiliateCode(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const code = formData.get('code') as string
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    
    await supabase.from('affiliate_codes').insert({
      code: code.toUpperCase(),
      name,
      email
    })
    
    revalidatePath('/admin/affiliates')
  }
  
  // Server action to mark payout as complete
  async function markPayoutComplete(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const requestId = formData.get('requestId') as string
    const codeId = formData.get('codeId') as string
    const amount = parseFloat(formData.get('amount') as string)
    const email = formData.get('email') as string
    const name = formData.get('name') as string
    const reference = formData.get('reference') as string
    
    // Update request status
    await supabase
      .from('etransfer_requests')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', requestId)
    
    // Create payout record
    await supabase.from('affiliate_payouts').insert({
      code_id: codeId,
      amount,
      status: 'completed',
      recipient_email: email,
      recipient_name: name,
      etransfer_reference: reference,
      processed_by: user?.email,
      processed_at: new Date().toISOString()
    })
    
    // Update affiliate paid commission
    await supabase.rpc('mark_commission_paid', { code_id: codeId, amount })
    
    revalidatePath('/admin/affiliates')
  }
  
  // Server action to reject payout request
  async function rejectPayoutRequest(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const requestId = formData.get('requestId') as string
    
    await supabase
      .from('etransfer_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId)
    
    revalidatePath('/admin/affiliates')
  }
  
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          ✅ Admin Access Granted! Logged in as: {user.email}
        </div>
        
        <h1 className="text-3xl font-bold mb-8">Affiliate Management</h1>
        
        {/* Create Affiliate Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Create New Affiliate Code</h2>
          <form action={createAffiliateCode} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Affiliate Code</label>
                <input type="text" name="code" required className="w-full px-3 py-2 border rounded-lg" placeholder="e.g., MIKE20" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input type="text" name="name" required className="w-full px-3 py-2 border rounded-lg" placeholder="Mike Johnson" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email (for E-Transfers)</label>
                <input type="email" name="email" required className="w-full px-3 py-2 border rounded-lg" placeholder="mike@example.com" />
              </div>
            </div>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              Create Affiliate Code
            </button>
          </form>
        </div>
        
        {/* Pending E-Transfer Requests */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">
            Pending E-Transfer Requests
            {pendingRequests && pendingRequests.length > 0 && (
              <span className="ml-2 bg-yellow-100 text-yellow-800 text-sm px-2 py-1 rounded">
                {pendingRequests.length} pending
              </span>
            )}
          </h2>
          
          {pendingRequests && pendingRequests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Affiliate</th>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Amount</th>
                    <th className="px-4 py-2 text-left">Requested</th>
                    <th className="px-4 py-2 text-left">E-Transfer Reference</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.map((request) => (
                    <tr key={request.id} className="border-t">
                      <td className="px-4 py-2">{request.affiliate_codes?.name}</td>
                      <td className="px-4 py-2">{request.recipient_email}</td>
                      <td className="px-4 py-2 font-semibold">${request.amount}</td>
                      <td className="px-4 py-2 text-sm">{new Date(request.requested_at).toLocaleDateString()}</td>
                      <td className="px-4 py-2">
                        <form action={markPayoutComplete} className="flex gap-2">
                          <input type="hidden" name="requestId" value={request.id} />
                          <input type="hidden" name="codeId" value={request.code_id} />
                          <input type="hidden" name="amount" value={request.amount} />
                          <input type="hidden" name="email" value={request.recipient_email} />
                          <input type="hidden" name="name" value={request.recipient_name} />
                          <input type="text" name="reference" required placeholder="ET-XXXXX" className="px-2 py-1 border rounded text-sm w-32" />
                          <button type="submit" className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">
                            Mark Paid
                          </button>
                        </form>
                      </td>
                      <td className="px-4 py-2">
                        <form action={rejectPayoutRequest}>
                          <input type="hidden" name="requestId" value={request.id} />
                          <button type="submit" className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">
                            Reject
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No pending e-transfer requests</p>
          )}
        </div>
        
        {/* All Affiliates List */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">All Affiliates</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Code</th>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Rate</th>
                  <th className="px-4 py-2 text-left">Clicks</th>
                  <th className="px-4 py-2 text-left">Signups</th>
                  <th className="px-4 py-2 text-left">Total Commission</th>
                  <th className="px-4 py-2 text-left">Paid</th>
                  <th className="px-4 py-2 text-left">Pending</th>
                </tr>
              </thead>
              <tbody>
                {affiliates?.map((affiliate) => {
                  const pending = (affiliate.total_commission || 0) - (affiliate.paid_commission || 0)
                  return (
                    <tr key={affiliate.id} className="border-t">
                      <td className="px-4 py-2 font-mono">{affiliate.code}</td>
                      <td className="px-4 py-2">{affiliate.name}</td>
                      <td className="px-4 py-2">{affiliate.email}</td>
                      <td className="px-4 py-2">20%</td>
                      <td className="px-4 py-2">{affiliate.total_clicks || 0}</td>
                      <td className="px-4 py-2">{affiliate.total_signups || 0}</td>
                      <td className="px-4 py-2">${(affiliate.total_commission || 0).toFixed(2)}</td>
                      <td className="px-4 py-2">${(affiliate.paid_commission || 0).toFixed(2)}</td>
                      <td className="px-4 py-2 font-semibold text-green-600">${pending.toFixed(2)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}