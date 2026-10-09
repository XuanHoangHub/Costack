'use client';

import React from 'react';
import Script from 'next/script';
import { supabase } from '@/lib/supabaseClient';

interface GoogleOneTapProps {
  onSuccess?: () => void;
}

// Generate nonce and sha-256 hashed nonce for Google ID token sign-in
// as specified in Supabase documentation
const generateNonce = async (): Promise<[string, string]> => {
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const encoder = new TextEncoder();
  const encodedNonce = encoder.encode(nonce);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encodedNonce);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashedNonce = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return [nonce, hashedNonce];
};

export default function GoogleOneTap({ onSuccess }: GoogleOneTapProps) {
  const clientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID;

  const initializeGoogleOneTap = async () => {
    if (!clientId) return;

    try {
      // Check if session already exists before showing One Tap
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) return;

      const [rawNonce, hashedNonce] = await generateNonce();

      if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
        const google = (window as any).google;
        google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: { credential: string }) => {
            try {
              const { data, error } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: response.credential,
                nonce: rawNonce,
              });

              if (error) throw error;
              if (data?.session) {
                onSuccess?.();
              }
            } catch (err) {
              console.warn('Google One Tap sign in error:', err);
            }
          },
          nonce: hashedNonce,
          use_fedcm_for_prompt: true,
        });

        google.accounts.id.prompt();
      }
    } catch (e) {
      console.warn('Failed to initialize Google One Tap:', e);
    }
  };

  if (!clientId) return null;

  return (
    <Script
      src="https://accounts.google.com/gsi/client"
      strategy="afterInteractive"
      onReady={() => {
        void initializeGoogleOneTap();
      }}
    />
  );
}
