import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase.js'
import LandingPage from './pages/LandingPage'
import RecruiterLandingPage from './pages/RecruiterLandingPage'
import GeneratePage from './pages/GeneratePage'
import ResearchLogin from './components/ResearchLogin.jsx'
import ResearchNav from './components/ResearchNav.jsx'
import ResearchRunAnalysis from './pages/admin/ResearchRunAnalysis.jsx'
import ResearchResumeLibrary from './pages/admin/ResearchResumeLibrary.jsx'
import ResearchResultsHistory from './pages/admin/ResearchResultsHistory.jsx'
import ResearchReviewQueue from './pages/admin/ResearchReviewQueue.jsx'
import ResearchResultsViz from './pages/admin/ResearchResultsViz.jsx'
import './index.css'

function AdminShell({ children }) {
  return (
    <div style={{ minHeight: '100vh' }}>
      <ResearchNav />
      <div style={{ padding: '0 28px 48px' }}>
        {children}
      </div>
    </div>
  )
}

function AdminRoute({ session, children }) {
  // Still resolving — show a minimal loading state instead of null
  if (session === undefined) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#a09080' }}>Loading...</div>
  }
  if (!session) return <ResearchLogin />
  return children
}

function AdminApp() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    }).catch(() => {
      setSession(null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <Routes>
      <Route
        path="/"
        element={
          <AdminRoute session={session}>
            <AdminShell><ResearchRunAnalysis /></AdminShell>
          </AdminRoute>
        }
      />
      <Route
        path="/resumes"
        element={
          <AdminRoute session={session}>
            <AdminShell><ResearchResumeLibrary /></AdminShell>
          </AdminRoute>
        }
      />
      <Route
        path="/results"
        element={
          <AdminRoute session={session}>
            <AdminShell><ResearchResultsHistory /></AdminShell>
          </AdminRoute>
        }
      />
      <Route
        path="/review"
        element={
          <AdminRoute session={session}>
            <AdminShell><ResearchReviewQueue /></AdminShell>
          </AdminRoute>
        }
      />
      <Route
        path="/viz"
        element={
          <AdminRoute session={session}>
            <AdminShell><ResearchResultsViz /></AdminShell>
          </AdminRoute>
        }
      />
    </Routes>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<RecruiterLandingPage />} />
        <Route path="/candidate" element={<LandingPage />} />
        <Route path="/generate" element={<GeneratePage />} />

        {/* Admin — auth required */}
        <Route path="/admin/*" element={<AdminApp />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
