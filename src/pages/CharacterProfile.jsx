import { useParams } from 'react-router-dom'
import characters from '../data/characters'

function CharacterProfile() {
  const { id } = useParams()

  const character = characters.find(
    (character) => character.id === Number(id)
  )

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
        <p>{character.dressingStyle}</p>
      </section>

      <section>
        <h2>About {character.name}</h2>
        <p>{character.about}</p>
      </section>

      <button className="chat-button">
        💬 Chat with {character.name}
      </button>
    </div>
  </main>
 )
}

export default CharacterProfile
