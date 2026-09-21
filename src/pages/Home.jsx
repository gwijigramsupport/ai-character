import CharacterCard from '../components/CharacterCard'

function Home() {
  const characters = [
    {
      name: 'Sarah',
      age: 24,
      rating: 4.8,
      occupation: 'Photographer',
    },
    {
      name: 'Emily',
      age: 27,
      rating: 4.6,
      occupation: 'Designer',
    },
    {
      name: 'Aisha',
      age: 25,
      rating: 4.9,
      occupation: 'Writer',
    },
  ]

  return (
    <main>
      <h1>Discover Characters</h1>

      {characters.map((character) => (
        <CharacterCard
          key={character.name}
          character={character}
        />
      ))}
    </main>
  )
}

export default Home