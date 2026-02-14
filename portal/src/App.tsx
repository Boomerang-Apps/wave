import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Loading } from './components/Loading'
import { AuthProvider } from './features/auth/context/AuthContext'
import { ProtectedRoute } from './features/auth/components/ProtectedRoute'

// Lazy load all page components for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })))
const Projects = lazy(() => import('./pages/Projects').then(m => ({ default: m.Projects })))
const ProjectChecklist = lazy(() => import('./pages/ProjectChecklist').then(m => ({ default: m.ProjectChecklist })))
const NewProject = lazy(() => import('./pages/NewProject').then(m => ({ default: m.NewProject })))
const Waves = lazy(() => import('./pages/Waves').then(m => ({ default: m.Waves })))
const Stories = lazy(() => import('./pages/Stories').then(m => ({ default: m.Stories })))
const Activity = lazy(() => import('./pages/Activity').then(m => ({ default: m.Activity })))
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })))
const Architecture = lazy(() => import('./pages/Architecture').then(m => ({ default: m.Architecture })))
const FoundationChecklist = lazy(() => import('./pages/FoundationChecklist').then(m => ({ default: m.FoundationChecklist })))
const NewStory = lazy(() => import('./pages/NewStory'))
const CommandsReference = lazy(() => import('./pages/CommandsReference').then(m => ({ default: m.CommandsReference })))
const LoginPage = lazy(() => import('./features/auth/pages/LoginPage').then(m => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('./features/auth/pages/RegisterPage').then(m => ({ default: m.RegisterPage })))

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
            <Route path="/projects" element={<ProtectedRoute><Layout><Projects /></Layout></ProtectedRoute>} />
            <Route path="/projects/new" element={<ProtectedRoute><Layout><NewProject /></Layout></ProtectedRoute>} />
            <Route path="/projects/:projectId" element={<ProtectedRoute><ProjectChecklist /></ProtectedRoute>} />
            <Route path="/projects/:projectId/foundation" element={<ProtectedRoute><FoundationChecklist /></ProtectedRoute>} />
            <Route path="/waves" element={<ProtectedRoute><Layout><Waves /></Layout></ProtectedRoute>} />
            <Route path="/stories" element={<ProtectedRoute><Layout><Stories /></Layout></ProtectedRoute>} />
            <Route path="/stories/new" element={<ProtectedRoute><Layout><NewStory /></Layout></ProtectedRoute>} />
            <Route path="/activity" element={<ProtectedRoute><Layout><Activity /></Layout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
            <Route path="/architecture" element={<ProtectedRoute><Layout><Architecture /></Layout></ProtectedRoute>} />
            <Route path="/commands" element={<ProtectedRoute><Layout><CommandsReference /></Layout></ProtectedRoute>} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
