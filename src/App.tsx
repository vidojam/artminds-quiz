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

const normalize = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')

const stripePaymentLink =
  import.meta.env.VITE_STRIPE_PAYMENT_LINK?.toString().trim() ?? ''
const premiumStorageKey = 'artminds-premium-unlocked'
const premiumPeriodCorrectStorageKey = 'artminds-premium-period-correct'

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
  const [feedback, setFeedback] = useState('')
  const [blastVisible, setBlastVisible] = useState(false)
  const [blastMessage, setBlastMessage] = useState('🎉 You guessed it! 🎉')
  const [showPartialPrompt, setShowPartialPrompt] = useState(false)
  const [quizFinished, setQuizFinished] = useState(false)
  const [isPremium, setIsPremium] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(premiumStorageKey) === 'true'
  })
  const [premiumPeriodCorrect, setPremiumPeriodCorrect] = useState(() => {
    if (typeof window === 'undefined') return 0
    const savedValue = Number(window.localStorage.getItem(premiumPeriodCorrectStorageKey) ?? '0')
    return Number.isFinite(savedValue) ? Math.max(0, savedValue) : 0
  })

  const currentArtwork = artworks[currentIndex]
  const attemptsLeft = 2 - attemptsUsed

  const revealText = useMemo(() => {
    if (!currentArtwork) return ''

    return `Painter: ${currentArtwork.painterAliases[0]} | Period: ${currentArtwork.periodAliases[0]}`
  }, [currentArtwork])

  useEffect(() => {
    if (!isPremiumSuccessInUrl()) return

    setIsPremium(true)
    window.localStorage.setItem(premiumStorageKey, 'true')
    setFeedback('Premium unlocked! Unlimited artwork limit is now active.')

    const cleanUrl = `${window.location.pathname}${window.location.hash}`
    window.history.replaceState({}, document.title, cleanUrl)
  }, [])

  useEffect(() => {
    if (!isPremium) return
    const savedValue = Number(window.localStorage.getItem(premiumPeriodCorrectStorageKey) ?? '0')
    const normalizedValue = Number.isFinite(savedValue) ? Math.max(0, savedValue) : 0
    setPremiumPeriodCorrect(normalizedValue)
  }, [isPremium])

  useEffect(() => {
    if (!isPremium) return
    window.localStorage.setItem(
      premiumPeriodCorrectStorageKey,
      premiumPeriodCorrect.toString(),
    )
  }, [isPremium, premiumPeriodCorrect])

  const resetRoundInputs = () => {
    setPainterAnswer('')
    setPeriodAnswer('')
    setAttemptsUsed(0)
  }

  const moveToNextArtwork = () => {
    const nextIndex = currentIndex + 1
    if (nextIndex >= artworks.length) {
      setQuizFinished(true)
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
      if (isPremium) {
        setPremiumPeriodCorrect((previousValue) => previousValue + 1)
      }
      triggerSuccessBlast()
      return
    }

    if (painterCorrect !== periodCorrect) {
      const partialMessage = painterCorrect
        ? 'Painter matches only, try again or continue'
        : 'Period matches only, try again or continue'

      setBlastMessage(partialMessage)
      setBlastVisible(true)
      setShowPartialPrompt(true)
      setFeedback(partialMessage)
      return
    }

    if (attemptsUsed === 0) {
      setAttemptsUsed(1)
      setFeedback('Not quite — one more try.')
      return
    }

    setFeedback(`Incorrect. ${revealText}`)
    window.setTimeout(() => {
      moveToNextArtwork()
    }, 1700)
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
    setQuizFinished(false)
  }

  const handleTryAgain = () => {
    setBlastVisible(false)
    setShowPartialPrompt(false)
    setAttemptsUsed((value) => Math.min(value + 1, 1))
    setFeedback('Try again with your updated answer.')
  }

  const handleContinue = () => {
    setBlastVisible(false)
    setShowPartialPrompt(false)
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
          {isPremium && (
            <p className="summary-text">
              Saved correct answers this play period: {premiumPeriodCorrect}
            </p>
          )}
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
      {blastVisible && (
        <div className="blast-overlay" aria-live="polite">
          <div className="blast-panel">
            <p className="blast-text">{blastMessage}</p>
            {showPartialPrompt && (
              <div className="blast-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleTryAgain}
                >
                  Try again
                </button>
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
          <p>
            Artwork {currentIndex + 1} / {artworks.length} · Score: {score}
          </p>
          {isPremium && <p className="upgrade-note">Premium unlocked: unlimited artwork limit active.</p>}
          {isPremium && (
            <p className="upgrade-note">
              Saved correct answers this play period: {premiumPeriodCorrect}
            </p>
          )}
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
            <input
              type="text"
              value={painterAnswer}
              onChange={(event) => setPainterAnswer(event.target.value)}
              placeholder="Enter painter"
              required
            />
          </label>

          <label>
            Period
            <input
              type="text"
              value={periodAnswer}
              onChange={(event) => setPeriodAnswer(event.target.value)}
              placeholder="Enter art period"
              required
            />
          </label>

          <button type="submit" className="primary-button" disabled={blastVisible}>
            Submit
          </button>
        </form>

        <p className="status-text" aria-live="polite">
          {feedback || `You have ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left.`}
        </p>

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
