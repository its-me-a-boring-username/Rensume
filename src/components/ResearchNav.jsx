// src/components/ResearchNav.jsx
import { useNavigate, useLocation } from "react-router-dom"
import { supabase } from "../lib/supabase.js"

const LINKS = [
  { label: 'Resumes', path: '/admin/resumes' },
  { label: 'Run',     path: '/admin'         },
  { label: 'Results', path: '/admin/results' },
]

export default function ResearchNav() {
  const navigate = useNavigate()
  const location = useLocation()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '12px 28px', borderBottom: '1px solid #e0dbd4', marginBottom: 32 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#904060', marginRight: 8 }}>
        Rensume Research
      </div>
      {LINKS.map(link => (
        <button
          key={link.path}
          onClick={() => navigate(link.path)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
            fontSize: 12, fontWeight: 700,
            color: location.pathname === link.path ? '#1a1410' : '#a09080',
            borderBottom: location.pathname === link.path ? '2px solid #904060' : '2px solid transparent',
          }}
        >
          {link.label}
        </button>
      ))}
      <div style={{ marginLeft: 'auto' }}>
        <button
          onClick={handleSignOut}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#a09080' }}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
