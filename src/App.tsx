import { useEffect, useMemo, useState } from 'react'
import './App.css'
import starryNightImage from './assets/starry-night.jpg'

type Artwork = {
  title: string
  imageUrl: string
  painterAliases: string[]
}

const artworks: Artwork[] = [
  {
    title: 'The Starry Night',
    imageUrl: starryNightImage,
    painterAliases: ['vincent van gogh', 'van gogh'],
  },
  {
    title: 'Mona Lisa',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/6/6a/Mona_Lisa.jpg',
    painterAliases: ['leonardo da vinci', 'da vinci', 'leonardo'],
  },
  {
    title: 'The Persistence of Memory',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/en/d/dd/The_Persistence_of_Memory.jpg',
    painterAliases: ['salvador dali', 'dali'],
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
const selectionFeedbackDelayMs = 160

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
  const [attemptsUsed, setAttemptsUsed] = useState(0)
  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState(() =>
    isPremiumSuccessInUrl()
      ? 'Premium unlocked! Unlimited artwork limit is now active.'
      : '',
  )
  const [isResolvingSelection, setIsResolvingSelection] = useState(false)
  const [blastVisible, setBlastVisible] = useState(false)
  const [blastMessage, setBlastMessage] = useState('🎉 You guessed it! 🎉')
  const [showRevealOverlay, setShowRevealOverlay] = useState(false)
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

  const revealText = useMemo(() => {
    if (!currentArtwork) return ''

    return `Painter: ${currentArtwork.painterAliases[0]}`
  }, [currentArtwork])

  useEffect(() => {
    if (!isPremiumSuccessInUrl()) return

    window.localStorage.setItem(premiumStorageKey, 'true')

    const cleanUrl = `${window.location.pathname}${window.location.hash}`
    window.history.replaceState({}, document.title, cleanUrl)
  }, [])

  const resetRoundInputs = () => {
    setPainterAnswer('')
    setAttemptsUsed(0)
    setIsResolvingSelection(false)
    setShowRevealOverlay(false)
  }

  const moveToNextArtwork = () => {
    const nextIndex = currentIndex + 1
    if (nextIndex >= artworks.length) {
      restartQuiz()
      return
    }

    setCurrentIndex(nextIndex)
    setFeedback('')
    resetRoundInputs()
  }

  const triggerSuccessBlast = () => {
    setBlastMessage('🎉 You guessed it! 🎉')
    setBlastVisible(true)
    setFeedback('You guessed it!')

    window.setTimeout(() => {
      setBlastVisible(false)
      moveToNextArtwork()
    }, 1500)
  }

  const submitPainterAnswer = (selectedPainter: string) => {
    if (!currentArtwork || blastVisible || quizFinished || isResolvingSelection) return

    setPainterAnswer(selectedPainter)
    setIsResolvingSelection(true)

    const normalizedPainter = normalize(selectedPainter)

    const painterCorrect = currentArtwork.painterAliases
      .map(normalize)
      .includes(normalizedPainter)

    if (painterCorrect) {
      window.setTimeout(() => {
        setIsResolvingSelection(false)
        setScore((previousScore) => previousScore + 1)
        triggerSuccessBlast()
      }, selectionFeedbackDelayMs)
      return
    }

    if (attemptsUsed === 0) {
      window.setTimeout(() => {
        setIsResolvingSelection(false)
        setAttemptsUsed(1)
        setFeedback('Not quite — one more try.')
      }, selectionFeedbackDelayMs)
      return
    }

    window.setTimeout(() => {
      setIsResolvingSelection(false)
      setFeedback(`Incorrect. ${revealText}`)
      setShowRevealOverlay(true)
    }, selectionFeedbackDelayMs)
  }

  const restartQuiz = () => {
    setCurrentIndex(0)
    setPainterAnswer('')
    setAttemptsUsed(0)
    setScore(0)
    setFeedback('')
    setIsResolvingSelection(false)
    setBlastVisible(false)
    setBlastMessage('🎉 You guessed it! 🎉')
    setShowRevealOverlay(false)
    setQuizFinished(false)
  }

  const handleContinue = () => {
    setBlastVisible(false)
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
            {!blastMessage.includes('guessed it') && (
              <div className="blast-actions">
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

      <section className="quiz-card">
        <header className="quiz-header">
          <h1>ArtMinds Quiz</h1>
          <p className="quiz-progress-text">
            Artwork {currentIndex + 1} / {artworks.length} · Score: {score}
          </p>
          {isPremium && <p className="upgrade-note">Premium unlocked: unlimited artwork limit active.</p>}
        </header>

        <div className="quiz-body">
          <div className="art-panel">
            <details className="upgrade-disclosure upgrade-disclosure-inline">
              <summary className="upgrade-summary">
                Unlimited artwork option
              </summary>
              <div className="upgrade-box">
                <p className="upgrade-title">Unlimited artwork limit</p>
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
            </details>

            <img
              className="art-image"
              src={currentArtwork.imageUrl}
              alt={`Artwork: ${currentArtwork.title}`}
            />
          </div>

          <div className="quiz-form">
            <div className="quiz-title-row">
              <h2>Who painted this work of art?</h2>
              <p className="attempts-text">
                Attempts left: {attemptsLeft}
              </p>
            </div>
            <p className="legal-link-row legal-link-inline">
              <a href="/terms.html" target="_blank" rel="noopener noreferrer">
                Terms of Use
              </a>
            </p>
            <p className="selection-help">Choose 1 from 10 painter options.</p>

            <div className="selection-options" role="group" aria-label="Painter choices">
              {painterSelectionOptions.map((option) => {
                const isSelected = normalize(option) === normalize(painterAnswer)

                return (
                  <button
                    key={option}
                    type="button"
                    className={`secondary-button selection-option-button${isSelected ? ' selection-option-button-active' : ''}`}
                    aria-pressed={isSelected}
                    onClick={() => submitPainterAnswer(option)}
                    disabled={blastVisible || isResolvingSelection}
                  >
                    {option}
                  </button>
                )
              })}
            </div>

            {painterAnswer && (
              <p className="selected-answer-text">
                {`Selected painter: ${painterAnswer}`}
              </p>
            )}

            {feedback && (
              <div className="status-box" aria-live="polite">
                <p className="status-text">{feedback}</p>
              </div>
            )}
          </div>
        </div>

      </section>
    </main>
  )
}

export default App
