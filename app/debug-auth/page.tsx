import { createClient } from '@/utils/supabase/server'

export default async function DebugAuthPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  const { data: { session } } = await supabase.auth.getSession()
  
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Auth Debug Information</h1>
        
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded">
            <p className="font-bold">User:</p>
            <pre className="text-sm mt-2">{JSON.stringify(user, null, 2)}</pre>
          </div>
          
          <div className="p-4 bg-gray-50 rounded">
            <p className="font-bold">Session exists:</p>
            <p>{session ? '✅ Yes' : '❌ No'}</p>
          </div>
          
          <div className="p-4 bg-yellow-50 rounded">
            <p className="font-bold">Instructions:</p>
            <p>1. Sign in at /auth/sign-in</p>
            <p>2. Come back to this page</p>
            <p>3. If no user shows, cookies aren't being set correctly</p>
          </div>
        </div>
      </div>
    </div>
  )
}