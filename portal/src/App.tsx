import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Loading } from './components/Loading'

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

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Layout><Dashboard /></Layout>} />
          <Route path="/projects" element={<Layout><Projects /></Layout>} />
          <Route path="/projects/new" element={<Layout><NewProject /></Layout>} />
          <Route path="/projects/:projectId" element={<ProjectChecklist />} />
          <Route path="/projects/:projectId/foundation" element={<FoundationChecklist />} />
          <Route path="/waves" element={<Layout><Waves /></Layout>} />
          <Route path="/stories" element={<Layout><Stories /></Layout>} />
          <Route path="/stories/new" element={<Layout><NewStory /></Layout>} />
          <Route path="/activity" element={<Layout><Activity /></Layout>} />
          <Route path="/settings" element={<Layout><Settings /></Layout>} />
          <Route path="/architecture" element={<Layout><Architecture /></Layout>} />
          <Route path="/commands" element={<Layout><CommandsReference /></Layout>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
