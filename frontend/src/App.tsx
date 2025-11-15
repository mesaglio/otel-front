import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout/Layout'
import { Dashboard } from './pages/Dashboard'
import { TracesList } from './pages/Traces/TracesList'
import { TraceDetail } from './pages/Traces/TraceDetail'
import { Logs } from './pages/Logs'
import { Metrics } from './pages/Metrics'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/traces" element={<TracesList />} />
          <Route path="/traces/:id" element={<TraceDetail />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/metrics" element={<Metrics />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
