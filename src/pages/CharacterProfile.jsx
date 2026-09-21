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
    <main>
      <img
        src={character.image}
        alt={character.name}
      />

      <h1>{character.name}</h1>

      <p>Age: {character.age}</p>
      <p>⭐ {character.rating}</p>
      <p>📍 {character.location}</p>
      <p>💼 {character.occupation}</p>

      <h2>Personality</h2>
      <p>{character.personality}</p>

      <h2>Hobbies</h2>
      <p>{character.hobbies}</p>

      <h2>Dressing Style</h2>
      <p>{character.dressingStyle}</p>

      <h2>About</h2>
      <p>{character.about}</p>

      <button>💬 Chat</button>
    </main>
  )
}

export default CharacterProfile
