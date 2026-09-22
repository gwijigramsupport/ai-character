import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { supabase } from './supabase'

import Navbar from './components/Navbar'
import Home from './pages/Home'
import CharacterProfile from './pages/CharacterProfile'
import Chat from './pages/Chat'

import './App.css'

function App() {
  useEffect(() => {
    async function testSupabase() {
      const { data, error } = await supabase
        .from('characters')
        .select('name')

      console.log('Supabase characters:', data)
      console.log('Supabase error:', error)
    }

    testSupabase()
  }, [])

  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/character/:id" element={<CharacterProfile />} />
        <Route path="/chat/:id" element={<Chat />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App