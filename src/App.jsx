import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import EditingPage from './pages/EditingPage'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/editing" element={<EditingPage />} />
      </Routes>
    </Router>
  )
}

export default App
