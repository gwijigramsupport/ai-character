import { useParams } from 'react-router-dom'
import characters from '../data/characters'

function Chat() {
  const { id } = useParams()

  const character = characters.find(
    (character) => character.id === Number(id)
  )

  if (!character) {
    return <h1>Character not found</h1>
  }

  return (
    <main className="chat-page">

      <header className="chat-header">
        <img
          src={character.image}
          alt={character.name}
          className="chat-avatar"
        />

        <div>
          <h1>{character.name}</h1>
          <span>Online</span>
        </div>
      </header>

      <div className="chat-messages">
        <div className="message ai-message">
          Hey! 👋 I'm {character.name}. Nice to meet you!
        </div>

        <div className="message user-message">
          Hello! 😄
        </div>
      </div>

      <form className="chat-input-area">
        <input
          type="text"
          placeholder={`Message ${character.name}...`}
        />

        <button type="submit">
          ➤
        </button>
      </form>

    </main>
  )
}

export default Chat