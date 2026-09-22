import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../supabase'

function CharacterProfile() {
  const { id } = useParams()

  const [character, setCharacter] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCharacter() {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching character:', error)
        setLoading(false)
        return
      }

      setCharacter(data)
      setLoading(false)
    }

    fetchCharacter()
  }, [id])

  if (loading) {
    return <h1>Loading character...</h1>
  }

  if (!character) {
    return <h1>Character not found</h1>
  }

  return (
    <main className="profile-page">
      <div className="profile-hero">
        <img
          src={character.image}
          alt={character.name}
          className="profile-image"
        />

        <div className="profile-overlay"></div>

        <div className="profile-title">
          <h1>{character.name}</h1>

          <span className="profile-age">
            {character.age} yrs
          </span>
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-meta">
          <span>⭐ {character.rating}</span>
          <span>📍 {character.location}</span>
          <span>💼 {character.occupation}</span>
        </div>

        <section>
          <h2>Personality</h2>
          <p>{character.personality}</p>
        </section>

        <section>
          <h2>Hobbies</h2>
          <p>{character.hobbies}</p>
        </section>

        <section>
          <h2>Dressing Style</h2>
          <p>{character.dressing_style}</p>
        </section>

        <section>
          <h2>About {character.name}</h2>
          <p>{character.about}</p>
        </section>

        <Link
          to={`/chat/${character.id}`}
          className="chat-button"
        >
          💬 Chat with {character.name}
        </Link>
      </div>
    </main>
  )
}

export default CharacterProfile
