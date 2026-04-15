'use client'

import { useState } from 'react'

interface PayoutRequestFormProps {
  code: string
  availableCommission: number
  onSuccess: () => void
}

export default function PayoutRequestForm({ code, availableCommission, onSuccess }: PayoutRequestFormProps) {
  const [amount, setAmount] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    
    try {
      const response = await fetch('/api/affiliate/request-payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          amount: parseFloat(amount),
          email,
          name
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit request')
      }
      
      setSuccess(data.message)
      setAmount('')
      setEmail('')
      setName('')
      onSuccess()
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Request E-Transfer Payout
      </h3>
      
      <p className="text-sm text-gray-600 mb-4">
        Available commission: <span className="font-bold text-green-600">${availableCommission}</span>
        <br />
        Minimum payout: <span className="font-bold">$20</span>
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount to Withdraw ($)
          </label>
          <input
            type="number"
            step="0.01"
            min="20"
            max={availableCommission}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            placeholder="20.00"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Your Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            placeholder="John Smith"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email for E-Transfer
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            placeholder="you@example.com"
          />
          <p className="text-xs text-gray-500 mt-1">
            Make sure this email is registered with your bank for Interac E-Transfer
          </p>
        </div>
        
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}
        
        <button
          type="submit"
          disabled={loading || availableCommission < 20}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Submitting...' : 'Request E-Transfer'}
        </button>
      </form>
    </div>
  )
}