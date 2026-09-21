import CharacterCard from '../components/CharacterCard'
import characters from '../data/characters'

function Home() {
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
