import React, { useEffect, useState } from 'react';
import type { AppProps } from 'next/app';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { createBrowserClient } from '@supabase/auth-helpers-nextjs';
import '@/styles/globals.css';
import { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function hasValidSupabaseConfig(url?: string, key?: string) {
  return Boolean(url && key && /https?:\/\//.test(url));
}

export default function App({ Component, pageProps }: AppProps) {
  const [supabaseClient, setSupabaseClient] = useState<ReturnType<typeof createBrowserClient<Database>> | null>(null);

  useEffect(() => {
    if (!hasValidSupabaseConfig(supabaseUrl, supabaseAnonKey)) return;

    setSupabaseClient(
      createBrowserClient<Database>(supabaseUrl!, supabaseAnonKey!)
    );
  }, []);

  if (!supabaseClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white px-4">
        <div className="max-w-xl p-8 bg-slate-900 rounded-3xl border border-slate-700 shadow-2xl">
          <h1 className="text-3xl font-semibold">Supabase configuration required</h1>
          <p className="mt-4 text-slate-300">
            The app can run, but it needs a valid Supabase URL and anon key in <code className="rounded bg-slate-800 px-1 py-0.5">.env.local</code>.
          </p>
          <ul className="mt-4 list-disc list-inside text-slate-300 space-y-2">
            <li><code>NEXT_PUBLIC_SUPABASE_URL</code> must start with <code>https://</code>.</li>
            <li><code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> must be your project anon public key.</li>
          </ul>
          <p className="mt-4 text-slate-400">Update the file and restart the development server to continue.</p>
        </div>
      </div>
    );
  }

  return (
    <SessionContextProvider supabaseClient={supabaseClient} initialSession={pageProps.initialSession}>
      <Component {...pageProps} />
    </SessionContextProvider>
  );
}
