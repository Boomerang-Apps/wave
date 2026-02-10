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
import { FoundationChecklist } from './pages/FoundationChecklist'
import NewStory from './pages/NewStory'
import { CommandsReference } from './pages/CommandsReference'

function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  )
}

export default App
