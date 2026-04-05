// test push
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

// Wraps all admin pages with the nav bar and padding
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

// Protects admin routes — shows login if no session, null if still resolving
function AdminRoute({ session, children }) {
  if (session === undefined) return null
  if (!session) return <ResearchLogin />
  return children
}

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
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
