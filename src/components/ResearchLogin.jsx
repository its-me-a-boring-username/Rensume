// src/components/ResearchLogin.jsx
import { useState } from "react"
import { supabase } from "../lib/supabase.js"

export default function ResearchLogin() {
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email.trim()) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) setError(error.message)
    else setSent(true)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#904060', marginBottom: 4 }}>Rensume</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1410', marginBottom: 4 }}>Admin</div>
        <div style={{ fontSize: 12, color: '#706050', marginBottom: 32 }}>Research & classifier evaluation tool</div>

        {sent ? (
          <div style={{ background: '#f5f2ee', border: '1px solid #e0dbd4', borderRadius: 6, padding: '14px 16px', fontSize: 12, color: '#1a1410', lineHeight: 1.6 }}>
            Magic link sent to <strong>{email}</strong>. Check your inbox and click the link to sign in.
          </div>
        ) : (
          <>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="your@email.com"
              style={{ width: '100%', padding: '10px 14px', fontSize: 13, border: '1px solid #d8d0c4', borderRadius: 6, outline: 'none', marginBottom: 10, fontFamily: 'inherit', color: '#1a1410', boxSizing: 'border-box' }}
            />
            {error && <div style={{ fontSize: 11, color: '#c04060', marginBottom: 10 }}>{error}</div>}
            <button
              onClick={handleLogin}
              disabled={!email.trim() || loading}
              style={{ width: '100%', background: '#904060', color: '#fff', fontSize: 12, fontWeight: 700, padding: '10px 24px', borderRadius: 3, border: 'none', cursor: 'pointer', opacity: !email.trim() ? 0.5 : 1 }}
            >
              {loading ? 'Sending...' : 'Send magic link →'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
