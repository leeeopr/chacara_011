'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import { UserProfile } from '@/lib/types';
import { clearPermissionsCache } from '@/hooks/usePermissions';
import { isDemoMode, setAppMode } from '@/lib/appMode';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [bootError, setBootError] = useState<'timeout' | 'connection_error' | 'profile_failed' | null>(null);
  
  const mountedRef = useRef(true);
  const isFetchingProfileRef = useRef<string | null>(null);
  const bootStartTimeRef = useRef<number>(0);
  const lastReheatTimeRef = useRef<number>(0);
  
  useEffect(() => {
    if (!bootStartTimeRef.current) {
      bootStartTimeRef.current = performance.now();
    }
  }, []);
  
  const router = useRouter();
  const pathname = usePathname();

  // Helper for logging forensic events with precise timestamps
  const logForensic = useCallback((event: string) => {
    const elapsed = (performance.now() - bootStartTimeRef.current).toFixed(1);
    console.log(`[BOOT] ${event} (+${elapsed}ms)`);
  }, []);

  /**
   * Helper function to execute the query against Supabase profiles table
   * with a built-in 5-second timeout and 3 retry attempts (1s, 3s, 5s).
   */
  const fetchProfileWithRetryRef = useRef<((authUser: User, attempt?: number) => Promise<UserProfile>) | null>(null);

  const fetchProfileWithRetry = useCallback(async (authUser: User, attempt = 1): Promise<UserProfile> => {
    const delays = [1000, 3000, 5000];
    try {
      console.log(`[Auth] Fetching profile (attempt ${attempt}) for:`, authUser.email);
      
      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 5000)
      );

      // Race the supabase select query against 5-second timeout
      const { data, error } = await Promise.race([
        fetchPromise as any,
        timeoutPromise as any
      ]);

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          console.warn('[Auth] Profiles table not found in database schema, using fallback user profile.');
          return {
            id: authUser.id,
            email: authUser.email || '',
            full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuário',
            role: 'SECRETARIA'
          } as UserProfile;
        }

        if (error.code === 'PGRST116') {
          console.log('[Auth] Profile not found, checking for auto-creation...');
          
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .upsert({
              id: authUser.id,
              email: authUser.email,
              full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0],
              role: 'SECRETARIA'
            })
            .select()
            .single();

          if (insertError) {
            console.warn('[Auth] Error auto-creating profile:', insertError.message);
            return {
              id: authUser.id,
              email: authUser.email || '',
              full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuário',
              role: 'SECRETARIA'
            } as UserProfile;
          }
          
          return newProfile as UserProfile;
        }
        throw error;
      }
      return data as UserProfile;
    } catch (err: any) {
      if (err.message === 'TIMEOUT') {
        logForensic(`Profile fetch timeout on attempt ${attempt}`);
      } else {
        logForensic(`Profile fetch attempt ${attempt}: ${err.message || err}`);
      }
      
      if (attempt <= 2 && err.code !== 'PGRST205' && fetchProfileWithRetryRef.current) {
        const delay = delays[attempt - 1];
        console.log(`[Auth] Retrying profile fetch in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchProfileWithRetryRef.current(authUser, attempt + 1);
      }
      throw err;
    }
  }, [logForensic]);

  useEffect(() => {
    fetchProfileWithRetryRef.current = fetchProfileWithRetry;
  }, [fetchProfileWithRetry]);

  const fetchProfile = useCallback(async (authUser: User) => {
    if (!mountedRef.current) return;
    
    // Prevent duplicate concurrent profile fetches for the same user
    if (isFetchingProfileRef.current === authUser.id) {
      console.log('[Auth] Profile fetch already in progress for:', authUser.email);
      return;
    }
    
    isFetchingProfileRef.current = authUser.id;
    logForensic('Profile fetch start');
    
    try {
      const data = await fetchProfileWithRetry(authUser);
      if (mountedRef.current) {
        setProfile(data);
        logForensic('Profile fetch success');
        const elapsed = (performance.now() - bootStartTimeRef.current).toFixed(1);
        console.log(`[BOOT] Boot total time: ${elapsed}ms`);
      }
    } catch (error: any) {
      console.warn('[Auth] Profile fetch fallback activated:', error?.message || error);
      
      // Failsafe fallback profile to prevent page from freezing/breaking
      if (mountedRef.current) {
        setProfile({
          id: authUser.id,
          email: authUser.email || '',
          full_name: authUser.user_metadata?.full_name || 'Usuário',
          role: 'SECRETARIA'
        } as UserProfile);
        setBootError(null);
      }
    } finally {
      isFetchingProfileRef.current = null;
    }
  }, [fetchProfileWithRetry, logForensic]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      clearPermissionsCache();
      await fetchProfile(user);
    }
  }, [user, fetchProfile]);

  // Safety net global timeout for initial application load (7 seconds maximum)
  useEffect(() => {
    const bootTimeout = setTimeout(() => {
      if (isLoading) {
        console.warn('[BOOT] [Auth] Boot timeout reached. Releasing UI.');
        if (mountedRef.current) {
          setBootError('timeout');
          setIsLoading(false);
          logForensic('UI released via boot timeout');
        }
      }
    }, 7000);
    return () => clearTimeout(bootTimeout);
  }, [isLoading, logForensic]);

  useEffect(() => {
    mountedRef.current = true;
    logForensic('Boot start');

    if (isDemoMode()) {
      const demoUser = {
        id: 'demo-user-id',
        app_metadata: {},
        user_metadata: { full_name: 'Apresentação Demo' },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        email: 'demo@chacaras.com',
        role: 'authenticated',
        updated_at: new Date().toISOString(),
      } as User;

      const demoProfile: UserProfile = {
        id: 'demo-user-id',
        email: 'demo@chacaras.com',
        full_name: 'Apresentação Demo',
        role: 'admin',
      };

      setUser(demoUser);
      setProfile(demoProfile);
      setIsLoading(false);
      logForensic('Demo Mode active user loaded');
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mountedRef.current) return;
        
        try {
          const elapsed = (performance.now() - bootStartTimeRef.current).toFixed(1);
          console.log(`[BOOT] Session loaded (Event: ${event}) (+${elapsed}ms)`);

          setSession(currentSession);
          const currentUser = currentSession?.user ?? null;
          setUser(currentUser);
          
          if (currentUser) {
            console.log('[BOOT] Session encontrada');
            console.log('[BOOT] Dashboard liberado');
            console.log('[BOOT] Carregando perfil em segundo plano');
            
            if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
              clearPermissionsCache();
              // BACKGROUND-LOAD: Decouple the boot loader from database profiles.
              // Trigger profile fetch in second plane, let the UI unlock immediately.
              fetchProfile(currentUser).catch(err => {
                console.error('[Auth] Background fetchProfile chain failed:', err);
              });
            }
          } else {
            const isUnconfigured = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
            if (isUnconfigured) {
              const demoUser = {
                id: 'demo-admin-id',
                app_metadata: {},
                user_metadata: { full_name: 'Administrador Demo' },
                aud: 'authenticated',
                created_at: new Date().toISOString(),
                email: 'admin@chacara.com',
                role: 'authenticated',
                updated_at: new Date().toISOString(),
              } as User;

              const demoProfile: UserProfile = {
                id: 'demo-admin-id',
                email: 'admin@chacara.com',
                full_name: 'Administrador Demo',
                role: 'admin',
              };

              setUser(demoUser);
              setProfile(demoProfile);
            } else {
              setProfile(null);
              clearPermissionsCache();
            }
          }
        } catch (error) {
          console.error('[Auth] Exception in onAuthStateChange callback:', error);
        } finally {
          if (mountedRef.current) {
            setIsLoading(false);
            logForensic('UI released');
          }
        }
      }
    );

    // Session Reheat with 3s anti-congestion temporal lock/debounce
    const reheatSession = async () => {
      const now = Date.now();
      if (now - lastReheatTimeRef.current < 3000) {
        console.log('[Auth] Reheat request bypassed (temporal debounce active)');
        return;
      }
      lastReheatTimeRef.current = now;
      console.log('[Auth] Reheating session due to focus or visibilityState change...');
      
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('[Auth] Error looking up session on reheat:', error);
          return;
        }

        if (currentSession?.user) {
          console.log('[Auth] Active session verified via reheat, reloading profile...');
          clearPermissionsCache();
          if (mountedRef.current) {
            setSession(currentSession);
            setUser(currentSession.user);
          }
          // Do not block client response with await
          fetchProfile(currentSession.user).catch(err => {
            console.error('[Auth] Background reheat fetchProfile failed:', err);
          });
        }
      } catch (err) {
        console.error('[Auth] Exception thrown during session reheat:', err);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        reheatSession();
      }
    };

    const handleFocus = () => {
      reheatSession();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchProfile, logForensic]);

  useEffect(() => {
    if (!isLoading && !bootError) {
      if (!user && pathname !== '/login') {
        router.push('/login');
      } else if (user && pathname === '/login') {
        router.push('/');
      }
    }
  }, [user, isLoading, bootError, pathname, router]);

  const signOut = async () => {
    console.log('[Auth] Signing out...');
    clearPermissionsCache();
    if (isDemoMode()) {
      setAppMode('PRODUCTION');
      setUser(null);
      setProfile(null);
    } else {
      await supabase.auth.signOut();
    }
    router.push('/login');
  };

  if (!user && pathname !== '/login') {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, isLoading, signOut, refreshProfile }}>
      {children}
      <AnimatePresence>
        {bootError && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070B1E]/95 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center gap-6 max-w-sm px-6 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/25 flex items-center justify-center mx-auto text-amber-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-triangle-alert"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div className="space-y-2 font-sans">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Sincronização Lenta</h3>
                <p className="text-xs font-bold text-white/40 leading-relaxed normal-case tracking-normal">
                  Tivemos dificuldade para sincronizar os dados.
                </p>
              </div>
              <div className="flex flex-col gap-3 w-full pt-2 font-sans">
                <button
                  type="button"
                  onClick={async () => {
                    setBootError(null);
                    console.log('[BOOT] Retrying manual session check and profile reload...');
                    try {
                      const { data: { session: currentSession } } = await supabase.auth.getSession();
                      if (currentSession?.user) {
                        setSession(currentSession);
                        setUser(currentSession.user);
                        await fetchProfile(currentSession.user);
                      }
                    } catch (e) {
                      console.error('[BOOT] Manual retry failed:', e);
                    }
                  }}
                  className="bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black py-2.5 px-6 rounded-xl text-xs uppercase tracking-wider transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-[#FFD600]/10"
                >
                  Tentar novamente
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBootError(null);
                    console.log('[BOOT] Clicked Continuar mesmo assim. Releasing overlay...');
                  }}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black py-2.5 px-6 rounded-xl text-xs uppercase tracking-wider transition-all active:scale-[0.98] cursor-pointer"
                >
                  Continuar mesmo assim
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
