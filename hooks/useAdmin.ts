// hooks/useAdmin.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface AdminState {
  isAdmin: boolean;
  isLoading: boolean;
  userEmail: string | null;
  userId: string | null;
}

export function useAdmin(): AdminState & { checkAdmin: () => Promise<void> } {
  const [state, setState] = useState<AdminState>({
    isAdmin: false,
    isLoading: true,
    userEmail: null,
    userId: null
  });

  const checkAdmin = async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // First check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setState({
          isAdmin: false,
          isLoading: false,
          userEmail: null,
          userId: null
        });
        return;
      }
      
      // Call the admin check API (server-side, secure)
      const response = await fetch('/api/admin/check');
      const data = await response.json();
      
      setState({
        isAdmin: data.isAdmin,
        isLoading: false,
        userEmail: user.email || null,
        userId: user.id
      });
    } catch (error) {
      console.error('Admin check error:', error);
      setState({
        isAdmin: false,
        isLoading: false,
        userEmail: null,
        userId: null
      });
    }
  };

  useEffect(() => {
    checkAdmin();
  }, []);

  return { ...state, checkAdmin };
}