import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import CharacterProfile from './pages/CharacterProfile'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
      <Route path="/character/:id" element={<CharacterProfile />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
