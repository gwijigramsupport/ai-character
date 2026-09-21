function CharacterCard({ character }) {
  return (
    <article>
      <div>
        Character Image
      </div>

      <h2>{character.name}</h2>
      <p>Age: {character.age}</p>
      <p>⭐ {character.rating}</p>
      <p>{character.occupation}</p>
    </article>
  )
}

export default CharacterCard
