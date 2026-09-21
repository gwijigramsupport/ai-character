import CharacterCard from '../components/CharacterCard'

function Home() {
  const characters = [
    {
      id: 1,
      name: 'Sarah',
      age: 24,
      rating: 4.8,
      occupation: 'Photographer',
      image: '/images/sarah.jpg',
    },
    {
      id: 2,
      name: 'Emily',
      age: 27,
      rating: 4.6,
      occupation: 'Designer',
      image: '/images/emily.jpg',
    },
    {
      id: 3,
      name: 'Aisha',
      age: 25,
      rating: 4.9,
      occupation: 'Writer',
      image: '/images/aisha.jpg',
    },
  ]

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
