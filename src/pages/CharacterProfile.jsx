import { useParams } from 'react-router-dom'

function CharacterProfile() {
  const { id } = useParams()

  return (
    <main>
      <h1>Character Profile</h1>
      <p>Character ID: {id}</p>
    </main>
  )
}

export default CharacterProfile