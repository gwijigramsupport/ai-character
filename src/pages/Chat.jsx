import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'

function Chat() {
  const { id } = useParams()

  const [character, setCharacter] = useState(null)
  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [memories, setMemories] = useState([])

  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [memoryNotice, setMemoryNotice] = useState('')

  useEffect(() => {
    async function loadChat() {
      setLoading(true)
      setError('')

      // =========================
      // GET LOGGED-IN USER
      // =========================

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setError('You must be logged in to use chat.')
        setLoading(false)
        return
      }

      // =========================
      // GET CHARACTER
      // =========================

      const {
        data: characterData,
        error: characterError,
      } = await supabase
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

      // =========================
      // LOAD LONG-TERM MEMORIES
      // =========================

      const {
        data: memoryData,
        error: memoryError,
      } = await supabase
        .from('memories')
        .select('id, content')
        .eq('user_id', user.id)
        .eq('character_id', id)
        .order('created_at', {
          ascending: true,
        })

      if (memoryError) {
        console.error(
          'Memory error:',
          memoryError
        )

        setMemories([])
      } else {
        setMemories(memoryData || [])
      }

      // =========================
      // FIND EXISTING CONVERSATION
      // =========================

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

      // =========================
      // CREATE CONVERSATION
      // =========================

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

      // =========================
      // LOAD PREVIOUS MESSAGES
      // =========================

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

  // =========================
  // SAVE EXPLICIT MEMORY
  // =========================

  async function saveMemory(userMessage) {
    const rememberPrefixes = [
      'remember that ',
      'remember ',
    ]

    const lowerMessage = userMessage.toLowerCase()

    const matchedPrefix = rememberPrefixes.find(
      (prefix) => lowerMessage.startsWith(prefix)
    )

    if (!matchedPrefix) {
      return
    }

    const memoryContent = userMessage
      .slice(matchedPrefix.length)
      .trim()

    if (!memoryContent) {
      return
    }

    // Get current logged-in user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error(
        'Memory user error:',
        userError
      )
      return
    }

    // Save memory automatically
    const {
      data: savedMemory,
      error: memoryError,
    } = await supabase
      .from('memories')
      .insert({
        user_id: user.id,
        character_id: id,
        content: memoryContent,
      })
      .select('id, content')
      .single()

    if (memoryError) {
      console.error(
        'Save memory error:',
        memoryError
      )

      return
    }

    // Add the new memory immediately to local state
    setMemories((currentMemories) => [
      ...currentMemories,
      savedMemory,
    ])

    setMemoryNotice('🧠 Memory saved!')

    setTimeout(() => {
      setMemoryNotice('')
    }, 2500)
  }

  // =========================
  // SEND MESSAGE
  // =========================

  async function handleSend(event) {
    event.preventDefault()

    const trimmedMessage = message.trim()

    if (
      !trimmedMessage ||
      sending ||
      !conversation
    ) {
      return
    }

    setSending(true)
    setError('')
    setMemoryNotice('')

    // =========================
    // SAVE USER MESSAGE
    // =========================

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

    // =========================
    // CHECK FOR MEMORY COMMAND
    // =========================

    await saveMemory(trimmedMessage)

    try {
      // =========================
      // PREVIOUS CHAT HISTORY
      // =========================

      const history = messages.map((msg) => ({
        sender: msg.sender,
        content: msg.content,
      }))

      // =========================
      // PREPARE MEMORIES
      // =========================

      const memoryList = memories.map(
        (memory) => memory.content
      )

      // =========================
      // SEND TO AI BACKEND
      // =========================

      const response = await fetch(
        'https://ai-character-zlso.onrender.com/chat',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            message: trimmedMessage,

            character: {
              name: character.name,
              age: character.age,
              occupation: character.occupation,
              location: character.location,
              personality: character.personality,
              hobbies: character.hobbies,
              dressing_style:
                character.dressing_style,
              about: character.about,
            },

            history: history,

            memories: memoryList,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(
          `Backend error: ${response.status}`
        )
      }

      const data = await response.json()

      // =========================
      // SAVE AI RESPONSE
      // =========================

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
      console.error(
        'Chat error:',
        error
      )

      setError(
        'Something went wrong while contacting the AI.'
      )
    }

    setSending(false)
  }

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <main className="chat-page">
        <p style={{ padding: '20px' }}>
          Loading chat...
        </p>
      </main>
    )
  }

  // =========================
  // ERROR WITHOUT CHARACTER
  // =========================

  if (error && !character) {
    return (
      <main className="chat-page">
        <p style={{ padding: '20px' }}>
          {error}
        </p>
      </main>
    )
  }

  // =========================
  // CHARACTER NOT FOUND
  // =========================

  if (!character) {
    return (
      <main className="chat-page">
        <p style={{ padding: '20px' }}>
          Character not found.
        </p>
      </main>
    )
  }

  // =========================
  // CHAT UI
  // =========================

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

      {memoryNotice && (
        <p className="auth-success">
          {memoryNotice}
        </p>
      )}

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
