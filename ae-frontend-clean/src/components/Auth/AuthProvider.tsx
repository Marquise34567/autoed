"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as fbSignOut, User as FirebaseUser, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { auth, isFirebaseConfigured } from '@/lib/firebase.client'

type AuthContextType = {
  user: { id: string; email?: string } | null
  authReady: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    if (!isFirebaseConfigured() || !auth) {
      setAuthReady(true)
      if (!isFirebaseConfigured()) {
        // eslint-disable-next-line no-console
        console.error('[AuthProvider] Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* env vars in Vercel.')
      } else if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('[AuthProvider] Firebase auth not initialized')
      }
      return
    }

    const unsub = onAuthStateChanged(auth as any, (u: FirebaseUser | null) => {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.debug('[AuthProvider] onAuthStateChanged ->', u ? u.uid : null)
      }
      if (u) setUser({ id: u.uid, email: u.email ?? undefined })
      else setUser(null)
      setAuthReady(true)
    })

    return () => unsub()
  }, [])

  const login = async (email: string, password: string) => {
    if (!auth) throw new Error('Firebase auth not initialized')
    // Ensure auth persistence is local so session survives navigation
    try {
      await setPersistence(auth as any, browserLocalPersistence)
    } catch (e) {
      // ignore persistence errors and proceed to sign in
    }
    await signInWithEmailAndPassword(auth as any, email, password)
  }

  const signup = async (email: string, password: string) => {
    if (!auth) throw new Error('Firebase auth not initialized')
    // Ensure persistence before creating account so session persists
    try {
      await setPersistence(auth as any, browserLocalPersistence)
    } catch (e) {
      // ignore
    }
    await createUserWithEmailAndPassword(auth as any, email, password)
  }

  const logout = async () => {
    if (!auth) throw new Error('Firebase auth not initialized')
    await fbSignOut(auth as any)
  }

  return (
    <AuthContext.Provider value={{ user, authReady, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}
