import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { supabase } from './supabase'

import Navbar from './components/Navbar'
import Home from './pages/Home'
import CharacterProfile from './pages/CharacterProfile'
import Chat from './pages/Chat'

import './App.css'

function App() {
  const [supabaseStatus, setSupabaseStatus] = useState('Testing...')

  useEffect(() => {
    async function testSupabase() {
      const { data, error } = await supabase
        .from('characters')
        .select('name')

      if (error) {
        setSupabaseStatus(`Error: ${error.message}`)
        return
      }

      const names = data.map((character) => character.name).join(', ')

      setSupabaseStatus(`Connected ✅ ${names}`)
    }

    testSupabase()
  }, [])

  return (
    <BrowserRouter>
      <Navbar />

      <div
        style={{
          padding: '10px',
          background: '#151515',
          color: '#16d9c4',
          textAlign: 'center',
          fontSize: '13px',
        }}
      >
        Supabase: {supabaseStatus}
      </div>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/character/:id" element={<CharacterProfile />} />
        <Route path="/chat/:id" element={<Chat />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App