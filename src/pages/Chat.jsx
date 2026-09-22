import { useState } from 'react'
import { useParams } from 'react-router-dom'
import characters from '../data/characters'

function Chat() {
  const { id } = useParams()

  const character = characters.find(
    (character) => character.id === Number(id)
  )

  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: `Hey! 👋 I'm ${character?.name}. Nice to meet you!`,
    },
  ])

  if (!character) {
    return <h1>Character not found</h1>
  }

  async function handleSend(event) {
  event.preventDefault()

  const trimmedMessage = message.trim()

  if (!trimmedMessage) {
    return
  }

  const newMessage = {
    id: Date.now(),
    sender: 'user',
    text: trimmedMessage,
  }

  setMessages((currentMessages) => [
    ...currentMessages,
    newMessage,
  ])

  setMessage('')

  try {
    const response = await fetch(
      'https://ai-character-zlso.onrender.com/chat',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmedMessage,
        }),
      }
    )

    const data = await response.json()

    const aiMessage = {
      id: Date.now() + 1,
      sender: 'ai',
      text: data.reply,
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      aiMessage,
    ])
  } catch (error) {
    console.error('Chat error:', error)
  }
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
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message ${
              msg.sender === 'user'
                ? 'user-message'
                : 'ai-message'
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      <form
        className="chat-input-area"
        onSubmit={handleSend}
      >
        <input
          type="text"
          placeholder={`Message ${character.name}...`}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />

        <button type="submit">
          ➤
        </button>
      </form>

    </main>
  )
}

export default Chat
