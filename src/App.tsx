import { useEffect, useMemo, useState } from 'react'
import './App.css'
import starryNightImage from './assets/starry-night.jpg'

type Artwork = {
  title: string
  imageUrl: string
  painterAliases: string[]
  periodAliases: string[]
}

const artworks: Artwork[] = [
  {
    title: 'The Starry Night',
    imageUrl: starryNightImage,
    painterAliases: ['vincent van gogh', 'van gogh'],
    periodAliases: ['post-impressionism', 'post impressionism'],
  },
  {
    title: 'Mona Lisa',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/6/6a/Mona_Lisa.jpg',
    painterAliases: ['leonardo da vinci', 'da vinci', 'leonardo'],
    periodAliases: ['renaissance', 'high renaissance'],
  },
  {
    title: 'The Persistence of Memory',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/en/d/dd/The_Persistence_of_Memory.jpg',
    painterAliases: ['salvador dali', 'dali'],
    periodAliases: ['surrealism', 'surrealist'],
  },
]

const painterChoicesPool = [
  'Claude Monet',
  'Pablo Picasso',
  'Rembrandt',
  'Frida Kahlo',
  'Johannes Vermeer',
  'Michelangelo',
  'Caravaggio',
  'Sandro Botticelli',
  'Paul Cezanne',
  'Edgar Degas',
  'Henri Matisse',
  'Gustav Klimt',
  'Jackson Pollock',
  'Georgia O Keeffe',
  'Edvard Munch',
  'Pierre-Auguste Renoir',
  'Raphael',
  'Titian',
  'Diego Velazquez',
  'Jan van Eyck',
]

const periodChoicesPool = [
  'Baroque',
  'Romanticism',
  'Neoclassicism',
  'Impressionism',
  'Expressionism',
  'Cubism',
  'Abstract Expressionism',
  'Realism',
  'Rococo',
  'Symbolism',
  'Fauvism',
  'Minimalism',
  'Pop Art',
  'Northern Renaissance',
  'Mannerism',
]

const shuffleList = <T,>(items: T[]) => {
  const result = [...items]

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }

  return result
}

const toDisplayLabel = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')

const normalize = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')

const stripePaymentLink =
  import.meta.env.VITE_STRIPE_PAYMENT_LINK?.toString().trim() ?? ''
const premiumStorageKey = 'artminds-premium-unlocked'

const isPremiumSuccessInUrl = () => {
  const searchParams = new URLSearchParams(window.location.search)
  const premium = searchParams.get('premium')
  const checkout = searchParams.get('checkout')
  const payment = searchParams.get('payment')

  return (
    premium === '1' ||
    premium === 'true' ||
    premium === 'success' ||
    checkout === 'success' ||
    payment === 'success'
  )
}

function App() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [painterAnswer, setPainterAnswer] = useState('')
  const [periodAnswer, setPeriodAnswer] = useState('')
  const [attemptsUsed, setAttemptsUsed] = useState(0)
  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState(() =>
    isPremiumSuccessInUrl()
      ? 'Premium unlocked! Unlimited artwork limit is now active.'
      : '',
  )
  const [blastVisible, setBlastVisible] = useState(false)
  const [blastMessage, setBlastMessage] = useState('🎉 You guessed it! 🎉')
  const [showPartialPrompt, setShowPartialPrompt] = useState(false)
  const [painterMatchOnly, setPainterMatchOnly] = useState(false)
  const [showRevealOverlay, setShowRevealOverlay] = useState(false)
  const [painterDialogOpen, setPainterDialogOpen] = useState(false)
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false)
  const [quizFinished, setQuizFinished] = useState(false)
  const [isPremium] = useState(() => {
    if (typeof window === 'undefined') return false
    return (
      window.localStorage.getItem(premiumStorageKey) === 'true' ||
      isPremiumSuccessInUrl()
    )
  })
  const currentArtwork = artworks[currentIndex]
  const attemptsLeft = 2 - attemptsUsed
  const painterSelectionOptions = useMemo(() => {
    if (!currentArtwork) return []

    const correctPainter = toDisplayLabel(currentArtwork.painterAliases[0])
    const quizPainters = artworks.map((artwork) => toDisplayLabel(artwork.painterAliases[0]))
    const candidateSet = new Set<string>([...painterChoicesPool, ...quizPainters])
    const decoyPainters = Array.from(candidateSet).filter(
      (name) => normalize(name) !== normalize(correctPainter),
    )
    const selectedDecoys = shuffleList(decoyPainters).slice(0, 9)

    return shuffleList([correctPainter, ...selectedDecoys])
  }, [currentArtwork])
  const periodSelectionOptions = useMemo(() => {
    if (!currentArtwork) return []

    const correctPeriod = currentArtwork.periodAliases[0]
    const quizPeriods = artworks.map((artwork) => artwork.periodAliases[0])
    const candidateSet = new Set<string>([...periodChoicesPool, ...quizPeriods])
    const decoyPeriods = Array.from(candidateSet).filter(
      (period) => normalize(period) !== normalize(correctPeriod),
    )
    const selectedDecoys = shuffleList(decoyPeriods).slice(0, 2)

    return shuffleList([correctPeriod, ...selectedDecoys])
  }, [currentArtwork])

  const revealText = useMemo(() => {
    if (!currentArtwork) return ''

    return `Painter: ${currentArtwork.painterAliases[0]} | Period: ${currentArtwork.periodAliases[0]}`
  }, [currentArtwork])

  useEffect(() => {
    if (!isPremiumSuccessInUrl()) return

    window.localStorage.setItem(premiumStorageKey, 'true')

    const cleanUrl = `${window.location.pathname}${window.location.hash}`
    window.history.replaceState({}, document.title, cleanUrl)
  }, [])

  const resetRoundInputs = () => {
    setPainterAnswer('')
    setPeriodAnswer('')
    setAttemptsUsed(0)
    setShowRevealOverlay(false)
    setPainterDialogOpen(false)
    setPeriodDialogOpen(false)
  }

  const moveToNextArtwork = () => {
    const nextIndex = currentIndex + 1
    if (nextIndex >= artworks.length) {
      restartQuiz()
      return
    }

    setCurrentIndex(nextIndex)
    setFeedback('')
    setShowPartialPrompt(false)
    resetRoundInputs()
  }

  const triggerSuccessBlast = () => {
    setBlastMessage('🎉 You guessed it! 🎉')
    setBlastVisible(true)
    setShowPartialPrompt(false)
    setFeedback('You guessed it!')

    window.setTimeout(() => {
      setBlastVisible(false)
      moveToNextArtwork()
    }, 1500)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!currentArtwork || blastVisible || quizFinished) return

    const normalizedPainter = normalize(painterAnswer)
    const normalizedPeriod = normalize(periodAnswer)

    const painterCorrect = currentArtwork.painterAliases
      .map(normalize)
      .includes(normalizedPainter)
    const periodCorrect = currentArtwork.periodAliases
      .map(normalize)
      .includes(normalizedPeriod)

    const isCorrect = painterCorrect && periodCorrect

    if (isCorrect) {
      setScore((previousScore) => previousScore + 1)
      triggerSuccessBlast()
      return
    }

    if (painterCorrect !== periodCorrect) {
      const partialMessage = painterCorrect
        ? 'Painter matches only, continue.'
        : 'Period matches only, continue.'

      setBlastMessage(partialMessage)
      setBlastVisible(true)
      setShowPartialPrompt(true)
      setPainterMatchOnly(painterCorrect || !periodCorrect)
      setFeedback(partialMessage)
      return
    }

    if (attemptsUsed === 0) {
      setAttemptsUsed(1)
      setFeedback('Not quite — one more try.')
      return
    }

    setFeedback(`Incorrect. ${revealText}`)
    setShowRevealOverlay(true)
  }

  const restartQuiz = () => {
    setCurrentIndex(0)
    setPainterAnswer('')
    setPeriodAnswer('')
    setAttemptsUsed(0)
    setScore(0)
    setFeedback('')
    setBlastVisible(false)
    setBlastMessage('🎉 You guessed it! 🎉')
    setShowPartialPrompt(false)
    setPainterMatchOnly(false)
    setShowRevealOverlay(false)
    setPainterDialogOpen(false)
    setPeriodDialogOpen(false)
    setQuizFinished(false)
  }

  const handleTryAgain = () => {
    setBlastVisible(false)
    setShowPartialPrompt(false)
    setPainterMatchOnly(false)
    setAttemptsUsed((value) => Math.min(value + 1, 1))
    setFeedback('Try again with your updated answer.')
  }

  const handleContinue = () => {
    setBlastVisible(false)
    setShowPartialPrompt(false)
    const wasPeriodMatchOnly = !painterMatchOnly && showPartialPrompt
    setPainterMatchOnly(false)
    if (wasPeriodMatchOnly) {
      setAttemptsUsed((value) => Math.min(value + 1, 2))
    }
    setFeedback(`Incorrect. ${revealText}`)
    window.setTimeout(() => {
      moveToNextArtwork()
    }, 1300)
  }

  const handleUpgradeClick = () => {
    if (!stripePaymentLink) return
    window.location.href = stripePaymentLink
  }

  if (quizFinished) {
    return (
      <main className="quiz-shell">
        <section className="quiz-card">
          <h1>ArtMinds Quiz</h1>
          <p className="summary-text">Quiz complete.</p>
          <p className="summary-text">
            Your score: {score} / {artworks.length}
          </p>
          <div className="upgrade-box upgrade-box-right">
            <p className="upgrade-title">Unlock unlimited artwork limit</p>
            <p className="upgrade-price">$9.99 per year</p>
            {isPremium ? (
              <p className="upgrade-note">Premium unlocked. Unlimited artwork limit is active.</p>
            ) : (
              <button
                type="button"
                className="primary-button"
                onClick={handleUpgradeClick}
                disabled={!stripePaymentLink}
              >
                Pay with Stripe
              </button>
            )}
            {!isPremium && !stripePaymentLink && (
              <p className="upgrade-note">
                Add VITE_STRIPE_PAYMENT_LINK in your .env file to enable checkout.
              </p>
            )}
          </div>
          <button type="button" className="primary-button play-again-button" onClick={restartQuiz}>
            Play again
          </button>
        </section>
        <p className="legal-link-row">
          <a href="/terms.html" target="_blank" rel="noopener noreferrer">
            Terms of Use
          </a>
        </p>
      </main>
    )
  }

  return (
    <main className="quiz-shell">
      {showRevealOverlay && currentArtwork && (
        <div className="reveal-overlay" aria-live="assertive">
          <div className="reveal-panel">
            <p className="reveal-label">The answer was</p>
            <p className="reveal-answer">{toDisplayLabel(currentArtwork.painterAliases[0])}</p>
            <p className="reveal-period">{toDisplayLabel(currentArtwork.periodAliases[0])}</p>
            <button
              type="button"
              className="primary-button reveal-continue-button"
              onClick={() => {
                setShowRevealOverlay(false)
                moveToNextArtwork()
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {blastVisible && (
        <div className="blast-overlay" aria-live="polite">
          <div className="blast-panel">
            <p className="blast-text">{blastMessage}</p>
            {showPartialPrompt && (
              <div className="blast-actions">
                {!painterMatchOnly && (
                  <button
                    type="button"
                    className="primary-button"
                    onClick={handleTryAgain}
                  >
                    Try again
                  </button>
                )}
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleContinue}
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {painterDialogOpen && (
        <div
          className="selection-dialog-backdrop"
          role="presentation"
          onClick={() => setPainterDialogOpen(false)}
        >
          <div
            className="selection-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="painter-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="painter-dialog-title">Select a painter</h3>
            <p className="selection-help">Choose 1 from 10 painter options.</p>
            <div className="selection-options">
              {painterSelectionOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="secondary-button selection-option-button"
                  onClick={() => {
                    setPainterAnswer(option)
                    setPainterDialogOpen(false)
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="secondary-button selection-close-button"
              onClick={() => setPainterDialogOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {periodDialogOpen && (
        <div
          className="selection-dialog-backdrop"
          role="presentation"
          onClick={() => setPeriodDialogOpen(false)}
        >
          <div
            className="selection-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="period-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="period-dialog-title">Select an art period</h3>
            <p className="selection-help">Choose 1 from 3 period options.</p>
            <div className="selection-options period-selection-options">
              {periodSelectionOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="secondary-button selection-option-button"
                  onClick={() => {
                    setPeriodAnswer(option)
                    setPeriodDialogOpen(false)
                  }}
                >
                  {toDisplayLabel(option)}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="secondary-button selection-close-button"
              onClick={() => setPeriodDialogOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <section className="quiz-card">
        <header className="quiz-header">
          <h1>ArtMinds Quiz</h1>
          <p>
            Artwork {currentIndex + 1} / {artworks.length} · Score: {score}
          </p>
          {isPremium && <p className="upgrade-note">Premium unlocked: unlimited artwork limit active.</p>}
        </header>

        <img
          className="art-image"
          src={currentArtwork.imageUrl}
          alt={`Artwork: ${currentArtwork.title}`}
        />

        <form className="quiz-form" onSubmit={handleSubmit}>
          <h2>Who painted this work of art, and what period is it from?</h2>

          <label>
            Painter
            <div className="selection-field">
              <button
                type="button"
                className="secondary-button field-action-button"
                onClick={() => setPainterDialogOpen(true)}
                disabled={blastVisible}
              >
                {painterAnswer ? `Painter: ${painterAnswer}` : 'Choose Painter'}
              </button>
            </div>
          </label>

          <label>
            Period
            <div className="selection-field">
              <button
                type="button"
                className="secondary-button field-action-button"
                onClick={() => setPeriodDialogOpen(true)}
                disabled={blastVisible}
              >
                {periodAnswer ? `Period: ${toDisplayLabel(periodAnswer)}` : 'Choose Period'}
              </button>
            </div>
          </label>

          <button
            type="submit"
            className="primary-button submit-answer-button"
            disabled={blastVisible || !painterAnswer || !periodAnswer}
          >
            Submit Answer
          </button>
        </form>

        <div className="status-box" aria-live="polite">
          <p className="attempts-text">
            Attempts left: {attemptsLeft}
          </p>
          <p className="status-text">
            {feedback || 'Select Painter and Period, then press Submit Answer.'}
          </p>
        </div>

        <div className="upgrade-box upgrade-box-right">
          <p className="upgrade-title">Alternative: unlimited artwork limit</p>
          <p className="upgrade-price">$9.99 per year</p>
          {isPremium ? (
            <p className="upgrade-note">Premium unlocked. Unlimited artwork limit is active.</p>
          ) : (
            <button
              type="button"
              className="primary-button"
              onClick={handleUpgradeClick}
              disabled={!stripePaymentLink}
            >
              Pay with Stripe
            </button>
          )}
          {!isPremium && !stripePaymentLink && (
            <p className="upgrade-note">
              Add VITE_STRIPE_PAYMENT_LINK in your .env file to enable checkout.
            </p>
          )}
        </div>
      </section>
      <p className="legal-link-row">
        <a href="/terms.html" target="_blank" rel="noopener noreferrer">
          Terms of Use
        </a>
      </p>
    </main>
  )
}

export default App
