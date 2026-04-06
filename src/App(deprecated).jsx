// src/App.jsx
// Root component and router.
// Public routes: /
// Admin routes: /admin/* — require Supabase auth

import { useEffect, useState } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { supabase } from "./lib/supabase.js"
import GeneratePage from "./pages/GeneratePage"
import ResearchLogin from "./components/ResearchLogin.jsx"
import ResearchNav from "./components/ResearchNav.jsx"
import ResearchRunAnalysis from "./pages/admin/ResearchRunAnalysis.jsx"
import ResearchResumeLibrary from "./pages/admin/ResearchResumeLibrary.jsx"
import ResearchResultsHistory from "./pages/admin/ResearchResultsHistory.jsx"

console.log('[App] module loaded')

function AdminShell({ children }) {
  console.log('[AdminShell] rendering')
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
  console.log('[AdminRoute] session:', session)
  if (session === undefined) {
    console.log('[AdminRoute] session undefined — returning null')
    return null
  }
  if (!session) {
    console.log('[AdminRoute] no session — showing login')
    return <ResearchLogin />
  }
  console.log('[AdminRoute] session found — rendering children')
  return children
}

export default function App() {
  const [session, setSession] = useState(undefined)

  console.log('[App] rendering, session:', session)

  useEffect(() => {
    console.log('[App] useEffect running')
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[App] getSession resolved:', session)
      setSession(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[App] onAuthStateChange:', session)
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<GeneratePage />} />

        {/* Admin — auth required */}
        <Route
          path="/admin"
          element={
            <AdminRoute session={session}>
              <AdminShell><ResearchRunAnalysis /></AdminShell>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/resumes"
          element={
            <AdminRoute session={session}>
              <AdminShell><ResearchResumeLibrary /></AdminShell>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/results"
          element={
            <AdminRoute session={session}>
              <AdminShell><ResearchResultsHistory /></AdminShell>
            </AdminRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
