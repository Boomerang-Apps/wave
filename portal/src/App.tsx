import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Projects } from './pages/Projects'
import { ProjectChecklist } from './pages/ProjectChecklist'
import { NewProject } from './pages/NewProject'
import { Waves } from './pages/Waves'
import { Stories } from './pages/Stories'
import { Activity } from './pages/Activity'
import { Settings } from './pages/Settings'
import { Architecture } from './pages/Architecture'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/new" element={<NewProject />} />
          <Route path="/projects/:projectId" element={<ProjectChecklist />} />
          <Route path="/waves" element={<Waves />} />
          <Route path="/stories" element={<Stories />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/architecture" element={<Architecture />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
