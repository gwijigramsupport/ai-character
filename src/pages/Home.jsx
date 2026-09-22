import { useEffect, useState } from 'react'
import CharacterCard from '../components/CharacterCard'
import { supabase } from '../supabase'

function Home() {
  const [characters, setCharacters] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCharacters() {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching characters:', error)
        setLoading(false)
        return
      }

      setCharacters(data)
      setLoading(false)
    }

    fetchCharacters()
  }, [])

  if (loading) {
    return <p style={{ padding: '20px' }}>Loading characters...</p>
  }

  return (
    <main className="home">
      <h1>Discover Characters</h1>

      <div className="character-grid">
        {characters.map((character) => (
          <CharacterCard
            key={character.id}
            character={character}
          />
        ))}
      </div>
    </main>
  )
}

export default Home