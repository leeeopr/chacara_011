'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { firebaseAuth, getGoogleCalendarAuthProvider } from '@/lib/firebase';
import { 
  syncSystemToGoogleCalendar, 
  fetchGoogleCalendarList, 
  getLastSyncSummary,
  GoogleCalendarListEntry, 
  SyncSummaryResult,
  SyncOptions
} from '@/services/googleCalendarService';

interface ConnectedUser {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  uid: string;
}

interface GoogleCalendarContextType {
  isConnected: boolean;
  accessToken: string | null;
  user: ConnectedUser | null;
  selectedCalendarId: string;
  setSelectedCalendarId: (id: string) => void;
  availableCalendars: GoogleCalendarListEntry[];
  autoSyncEnabled: boolean;
  setAutoSyncEnabled: (enabled: boolean) => void;
  isSyncing: boolean;
  lastSyncResult: SyncSummaryResult | null;
  connectGoogleCalendar: () => Promise<void>;
  disconnectGoogleCalendar: () => Promise<void>;
  triggerSync: (options?: SyncOptions) => Promise<SyncSummaryResult>;
  refreshCalendars: () => Promise<void>;
}

const GoogleCalendarContext = createContext<GoogleCalendarContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'google_calendar_auth_session_v2';
const AUTO_SYNC_STORAGE_KEY = 'google_calendar_auto_sync_enabled';
const SELECTED_CALENDAR_KEY = 'google_calendar_selected_id';

export function GoogleCalendarProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<ConnectedUser | null>(null);
  const [selectedCalendarId, setSelectedCalendarIdState] = useState<string>('primary');
  const [availableCalendars, setAvailableCalendars] = useState<GoogleCalendarListEntry[]>([]);
  const [autoSyncEnabled, setAutoSyncEnabledState] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncSummaryResult | null>(null);

  // Restore session from localStorage/sessionStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
      if (savedAuth) {
        const parsed = JSON.parse(savedAuth);
        if (parsed.accessToken && parsed.user) {
          setAccessToken(parsed.accessToken);
          setUser(parsed.user);
        }
      }

      const savedAutoSync = localStorage.getItem(AUTO_SYNC_STORAGE_KEY);
      if (savedAutoSync !== null) {
        setAutoSyncEnabledState(savedAutoSync === 'true');
      }

      const savedCalendarId = localStorage.getItem(SELECTED_CALENDAR_KEY);
      if (savedCalendarId) {
        setSelectedCalendarIdState(savedCalendarId);
      }

      const summary = getLastSyncSummary();
      if (summary) {
        setLastSyncResult(summary);
      }
    } catch (e) {
      console.warn('[GoogleCalendarContext] Erro ao restaurar sessão salva:', e);
    }
  }, []);

  const setSelectedCalendarId = (id: string) => {
    setSelectedCalendarIdState(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(SELECTED_CALENDAR_KEY, id);
    }
  };

  const setAutoSyncEnabled = (enabled: boolean) => {
    setAutoSyncEnabledState(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTO_SYNC_STORAGE_KEY, String(enabled));
    }
  };

  // Fetch user's Google Calendars when connected
  const refreshCalendars = useCallback(async () => {
    if (!accessToken) return;
    try {
      const list = await fetchGoogleCalendarList(accessToken);
      setAvailableCalendars(list);
    } catch (err) {
      console.warn('[GoogleCalendarContext] Não foi possível buscar calendários:', err);
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) {
      refreshCalendars();
    }
  }, [accessToken, refreshCalendars]);

  // Connect Google OAuth Popup
  const connectGoogleCalendar = async () => {
    try {
      const provider = getGoogleCalendarAuthProvider();
      const result = await signInWithPopup(firebaseAuth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);

      if (!credential || !credential.accessToken) {
        throw new Error('Não foi possível obter o token de acesso do Google.');
      }

      const token = credential.accessToken;
      const firebaseUser = result.user;

      const userObj: ConnectedUser = {
        displayName: firebaseUser.displayName,
        email: firebaseUser.email,
        photoURL: firebaseUser.photoURL,
        uid: firebaseUser.uid
      };

      setAccessToken(token);
      setUser(userObj);

      if (typeof window !== 'undefined') {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
          accessToken: token,
          user: userObj,
          connectedAt: new Date().toISOString()
        }));
      }

      // Automatically fetch calendar list after connect
      const list = await fetchGoogleCalendarList(token);
      setAvailableCalendars(list);

      // Perform initial sync immediately upon connection!
      setTimeout(() => {
        syncSystemToGoogleCalendar(token, { calendarId: selectedCalendarId })
          .then(res => setLastSyncResult(res))
          .catch(e => console.error('Erro na sincronização inicial:', e));
      }, 500);

    } catch (err: any) {
      console.error('[GoogleCalendarContext] Erro ao conectar com Google:', err);
      throw new Error(err.message || 'Falha na autenticação com o Google.');
    }
  };

  // Disconnect Google Calendar
  const disconnectGoogleCalendar = async () => {
    try {
      await signOut(firebaseAuth);
    } catch (e) {
      // ignore
    }
    setAccessToken(null);
    setUser(null);
    setAvailableCalendars([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  };

  // Trigger manual or automatic sync
  const triggerSync = async (options: SyncOptions = {}): Promise<SyncSummaryResult> => {
    if (!accessToken) {
      throw new Error('Nenhum conta do Google Calendar está conectada.');
    }

    setIsSyncing(true);
    try {
      const syncOpts: SyncOptions = {
        calendarId: selectedCalendarId,
        ...options
      };

      const result = await syncSystemToGoogleCalendar(accessToken, syncOpts);
      setLastSyncResult(result);
      return result;
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <GoogleCalendarContext.Provider
      value={{
        isConnected: !!accessToken && !!user,
        accessToken,
        user,
        selectedCalendarId,
        setSelectedCalendarId,
        availableCalendars,
        autoSyncEnabled,
        setAutoSyncEnabled,
        isSyncing,
        lastSyncResult,
        connectGoogleCalendar,
        disconnectGoogleCalendar,
        triggerSync,
        refreshCalendars
      }}
    >
      {children}
    </GoogleCalendarContext.Provider>
  );
}

export function useGoogleCalendar() {
  const context = useContext(GoogleCalendarContext);
  if (!context) {
    throw new Error('useGoogleCalendar deve ser usado dentro de um GoogleCalendarProvider');
  }
  return context;
}
