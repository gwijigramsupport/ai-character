import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabase'

function Memories() {
  const { id } = useParams()

  const [character, setCharacter] = useState(null)
  const [memories, setMemories] = useState([])

  const [newMemory, setNewMemory] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    async function loadMemories() {
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
        setError('You must be logged in.')
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
      // GET MEMORIES
      // =========================

      const {
        data: memoryData,
        error: memoryError,
      } = await supabase
        .from('memories')
        .select('*')
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

        setError('Could not load memories.')
        setLoading(false)
        return
      }

      setMemories(memoryData || [])

      setLoading(false)
    }

    loadMemories()
  }, [id])

  // =========================
  // ADD MEMORY
  // =========================

  async function handleAddMemory(event) {
    event.preventDefault()

    const trimmedMemory = newMemory.trim()

    if (!trimmedMemory || saving) {
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    // =========================
    // GET USER
    // =========================

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setError('You must be logged in.')
      setSaving(false)
      return
    }

    // =========================
    // SAVE MEMORY
    // =========================

    const {
      data: savedMemory,
      error: memoryError,
    } = await supabase
      .from('memories')
      .insert({
        user_id: user.id,
        character_id: id,
        content: trimmedMemory,
      })
      .select()
      .single()

    if (memoryError) {
      console.error(
        'Add memory error:',
        memoryError
      )

      setError('Could not save memory.')
      setSaving(false)
      return
    }

    setMemories((currentMemories) => [
      ...currentMemories,
      savedMemory,
    ])

    setNewMemory('')
    setSuccess('Memory added successfully! 🧠')

    setTimeout(() => {
      setSuccess('')
    }, 2500)

    setSaving(false)
  }

  // =========================
  // DELETE MEMORY
  // =========================

  async function handleDeleteMemory(memoryId) {
    const confirmed = window.confirm(
      'Delete this memory?'
    )

    if (!confirmed) {
      return
    }

    setError('')

    const { error: deleteError } =
      await supabase
        .from('memories')
        .delete()
        .eq('id', memoryId)

    if (deleteError) {
      console.error(
        'Delete memory error:',
        deleteError
      )

      setError('Could not delete memory.')
      return
    }

    setMemories((currentMemories) =>
      currentMemories.filter(
        (memory) => memory.id !== memoryId
      )
    )
  }

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <main className="memories-page">
        <p>Loading memories...</p>
      </main>
    )
  }

  // =========================
  // ERROR
  // =========================

  if (error && !character) {
    return (
      <main className="memories-page">
        <p className="auth-error">
          {error}
        </p>
      </main>
    )
  }

  return (
    <main className="memories-page">

      {/* =========================
          HEADER
      ========================= */}

      <header className="memories-header">

        <Link
          to={`/character/${id}`}
          className="back-button"
        >
          ←
        </Link>

        <div>
          <h1>🧠 Memories</h1>

          <p>
            What {character.name} remembers about you
          </p>
        </div>

      </header>

      {/* =========================
          ADD MEMORY
      ========================= */}

      <section className="memory-add-card">

        <h2>Add a memory</h2>

        <p>
          Tell {character.name} something you want
          remembered.
        </p>

        <form onSubmit={handleAddMemory}>

          <textarea
            placeholder="Example: I love building AI applications."
            value={newMemory}
            onChange={(event) =>
              setNewMemory(event.target.value)
            }
            rows="3"
            disabled={saving}
          />

          <button
            type="submit"
            disabled={saving}
          >
            {saving
              ? 'Saving...'
              : '🧠 Save Memory'}
          </button>

        </form>

      </section>

      {/* =========================
          SUCCESS
      ========================= */}

      {success && (
        <p className="auth-success">
          {success}
        </p>
      )}

      {/* =========================
          ERROR
      ========================= */}

      {error && (
        <p className="auth-error">
          {error}
        </p>
      )}

      {/* =========================
          MEMORY LIST
      ========================= */}

      <section className="memory-list">

        <h2>
          Your memories
        </h2>

        {memories.length === 0 ? (
          <div className="empty-memories">

            <div className="empty-icon">
              🧠
            </div>

            <h3>No memories yet</h3>

            <p>
              Add something about yourself that
              you want {character.name} to remember.
            </p>

          </div>
        ) : (
          memories.map((memory) => (
            <article
              key={memory.id}
              className="memory-card"
            >

              <div className="memory-content">

                <span className="memory-icon">
                  🧠
                </span>

                <p>
                  {memory.content}
                </p>

              </div>

              <button
                type="button"
                className="delete-memory"
                onClick={() =>
                  handleDeleteMemory(memory.id)
                }
              >
                🗑️
              </button>

            </article>
          ))
        )}

      </section>

    </main>
  )
}

export default Memories