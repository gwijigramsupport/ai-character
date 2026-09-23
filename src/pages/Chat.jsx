import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'

function Chat() {
  const { id } = useParams()

  const [character, setCharacter] = useState(null)
  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])

  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadChat() {
      setLoading(true)
      setError('')

      // Get the logged-in user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setError('You must be logged in to use chat.')
        setLoading(false)
        return
      }

      // Get character from Supabase
      const { data: characterData, error: characterError } =
        await supabase
          .from('characters')
          .select('*')
          .eq('id', id)
          .single()

      if (characterError) {
        console.error(
          'Character error:',
          characterError
        )

        setError('Character not found.')
        setLoading(false)
        return
      }

      setCharacter(characterData)

      // Find existing conversation
      const {
        data: existingConversation,
        error: conversationError,
      } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('character_id', id)
        .maybeSingle()

      if (conversationError) {
        console.error(
          'Conversation error:',
          conversationError
        )

        setError('Could not load conversation.')
        setLoading(false)
        return
      }

      let currentConversation = existingConversation

      // Create conversation if one doesn't exist
      if (!currentConversation) {
        const {
          data: newConversation,
          error: createError,
        } = await supabase
          .from('conversations')
          .insert({
            user_id: user.id,
            character_id: id,
          })
          .select()
          .single()

        if (createError) {
          console.error(
            'Create conversation error:',
            createError
          )

          setError(
            'Could not create conversation.'
          )

          setLoading(false)
          return
        }

        currentConversation = newConversation
      }

      setConversation(currentConversation)

      // Load previous messages
      const {
        data: messageData,
        error: messageError,
      } = await supabase
        .from('messages')
        .select('*')
        .eq(
          'conversation_id',
          currentConversation.id
        )
        .order('created_at', {
          ascending: true,
        })

      if (messageError) {
        console.error(
          'Messages error:',
          messageError
        )

        setError('Could not load messages.')
        setLoading(false)
        return
      }

      setMessages(messageData || [])

      setLoading(false)
    }

    loadChat()
  }, [id])

  async function handleSend(event) {
    event.preventDefault()

    const trimmedMessage = message.trim()

    if (!trimmedMessage || sending || !conversation) {
      return
    }

    setSending(true)
    setError('')

    // Save user message to Supabase
    const {
      data: savedUserMessage,
      error: userMessageError,
    } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        sender: 'user',
        content: trimmedMessage,
      })
      .select()
      .single()

    if (userMessageError) {
      console.error(
        'User message error:',
        userMessageError
      )

      setError('Could not save your message.')
      setSending(false)
      return
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      savedUserMessage,
    ])

    setMessage('')

    try {
      // Send message to your AI backend
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

      if (!response.ok) {
        throw new Error(
          `Backend error: ${response.status}`
        )
      }

      const data = await response.json()

      // Save AI response to Supabase
      const {
        data: savedAIMessage,
        error: aiMessageError,
      } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender: 'ai',
          content: data.reply,
        })
        .select()
        .single()

      if (aiMessageError) {
        console.error(
          'AI message error:',
          aiMessageError
        )

        setError(
          'AI replied, but the reply could not be saved.'
        )

        setSending(false)
        return
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        savedAIMessage,
      ])
    } catch (error) {
      console.error('Chat error:', error)

      setError(
        'Something went wrong while contacting the AI.'
      )
    }

    setSending(false)
  }

  if (loading) {
    return (
      <main className="chat-page">
        <p style={{ padding: '20px' }}>
          Loading chat...
        </p>
      </main>
    )
  }

  if (error && !character) {
    return (
      <main className="chat-page">
        <p style={{ padding: '20px' }}>
          {error}
        </p>
      </main>
    )
  }

  if (!character) {
    return (
      <main className="chat-page">
        <p style={{ padding: '20px' }}>
          Character not found.
        </p>
      </main>
    )
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

        {messages.length === 0 && (
          <div className="message ai-message">
            Hey! 👋 I'm {character.name}.
            Nice to meet you!
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message ${
              msg.sender === 'user'
                ? 'user-message'
                : 'ai-message'
            }`}
          >
            {msg.content}
          </div>
        ))}

        {sending && (
          <div className="message ai-message">
            Typing...
          </div>
        )}

      </div>

      {error && (
        <p className="auth-error">
          {error}
        </p>
      )}

      <form
        className="chat-input-area"
        onSubmit={handleSend}
      >
        <input
          type="text"
          placeholder={`Message ${character.name}...`}
          value={message}
          onChange={(event) =>
            setMessage(event.target.value)
          }
          disabled={sending}
        />

        <button
          type="submit"
          disabled={sending}
        >
          {sending ? '...' : '➤'}
        </button>
      </form>

    </main>
  )
}

export default Chat
