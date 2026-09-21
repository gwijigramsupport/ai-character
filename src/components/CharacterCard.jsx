function CharacterCard({ character }) {
  return (
    <article className="character-card">
      <img
        src={character.image}
        alt={character.name}
        className="character-image"
      />

      <div className="character-overlay"></div>

      <div className="character-info">
        <h2>{character.name}</h2>

        <span className="character-age">
          {character.age} yrs
        </span>
      </div>
    </article>
  )
}

export default CharacterCard
