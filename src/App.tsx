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
  {
    title: 'Girl with a Pearl Earring',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/0/0f/1665_Girl_with_a_Pearl_Earring.jpg',
    painterAliases: ['johannes vermeer', 'vermeer'],
  },
  {
    title: 'The Scream',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/c/c5/Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg',
    painterAliases: ['edvard munch', 'munch'],
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
const questionAccentColors = [
  '255, 247, 216',
  '255, 214, 90',
  '255, 80, 80',
  '80, 210, 255',
  '186, 120, 255',
  '120, 255, 190',
  '255, 179, 71',
  '255, 160, 122',
  '255, 196, 160',
]

type Language = 'en' | 'fr' | 'es'

const translations = {
  en: {
    title: 'ArtMinds Quiz',
    quizComplete: 'Quiz complete.',
    yourScore: (score: number, total: number) => `Your score: ${score} / ${total}`,
    unlockUnlimited: 'Unlock unlimited artwork limit',
    pricePerYear: '$9.99 per year',
    premiumUnlocked: 'Premium unlocked. Unlimited artwork limit is active.',
    premiumActive: 'Premium unlocked: unlimited artwork limit active.',
    premiumBanner: 'Premium unlocked! Unlimited artwork limit is now active.',
    payWithStripe: 'Pay with Stripe',
    stripeNote: 'Add VITE_STRIPE_PAYMENT_LINK in your .env file to enable checkout.',
    playAgain: 'Play again',
    termsOfUse: 'Terms of Use',
    theAnswerWas: 'The answer was',
    continue: 'Continue',
    artworkProgress: (current: number, total: number) =>
      `${current} / ${total}`,
    unlimitedOption: 'Unlimited artwork option',
    unlimitedLimit: 'Unlimited artwork limit',
    whoP: 'Who painted this work of art?',
    attemptsLeft: (n: number) => `Attempts left: ${n}`,
    selectionHelp: 'Choose 1 from 5 painter options.',
    selectedPainter: (name: string) => `Selected painter: ${name}`,
    painterChoices: 'Painter choices',
    artworkAlt: (title: string) => `Artwork: ${title}`,
    youGuessedIt: '🎉 You guessed it! 🎉',
    youGuessedFeedback: 'You guessed it!',
    notQuite: 'Not quite — one more try.',
    incorrect: (painter: string) => `Incorrect. Painter: ${painter}`,
    revealText: (painter: string) => `Painter: ${painter}`,
    languageLabel: 'Language',
  },
  fr: {
    title: 'Quiz ArtMinds',
    quizComplete: 'Quiz terminé.',
    yourScore: (score: number, total: number) => `Votre score : ${score} / ${total}`,
    unlockUnlimited: "Débloquer la limite illimitée d'œuvres",
    pricePerYear: '9,99 $ par an',
    premiumUnlocked: "Premium débloqué. La limite illimitée d'œuvres est active.",
    premiumActive: "Premium débloqué : limite illimitée d'œuvres active.",
    premiumBanner: "Premium débloqué ! La limite illimitée d'œuvres est maintenant active.",
    payWithStripe: 'Payer avec Stripe',
    stripeNote: 'Ajoutez VITE_STRIPE_PAYMENT_LINK dans votre fichier .env pour activer le paiement.',
    playAgain: 'Rejouer',
    termsOfUse: "Conditions d'utilisation",
    theAnswerWas: 'La réponse était',
    continue: 'Continuer',
    artworkProgress: (current: number, total: number) =>
      `${current} / ${total}`,
    unlimitedOption: "Option illimitée d'œuvres",
    unlimitedLimit: "Limite illimitée d'œuvres",
    whoP: "Qui a peint cette \u0153uvre d\u2019art\u00a0?",
    attemptsLeft: (n: number) => `Tentatives restantes : ${n}`,
    selectionHelp: 'Choisissez 1 parmi 5 peintres.',
    selectedPainter: (name: string) => `Peintre sélectionné : ${name}`,
    painterChoices: 'Choix de peintres',
    artworkAlt: (title: string) => `Œuvre : ${title}`,
    youGuessedIt: '🎉 Vous avez deviné ! 🎉',
    youGuessedFeedback: 'Vous avez deviné !',
    notQuite: "Pas tout à fait — encore un essai.",
    incorrect: (painter: string) => `Incorrect. Peintre : ${painter}`,
    revealText: (painter: string) => `Peintre : ${painter}`,
    languageLabel: 'Langue',
  },
  es: {
    title: 'Concurso ArtMinds',
    quizComplete: 'Quiz terminado.',
    yourScore: (score: number, total: number) => `Tu puntuación: ${score} / ${total}`,
    unlockUnlimited: 'Desbloquear obras ilimitadas',
    pricePerYear: '$9.99 por año',
    premiumUnlocked: 'Premium desbloqueado. El límite ilimitado de obras está activo.',
    premiumActive: 'Premium desbloqueado: límite ilimitado de obras activo.',
    premiumBanner: '¡Premium desbloqueado! El límite ilimitado de obras está activo.',
    payWithStripe: 'Pagar con Stripe',
    stripeNote: 'Agrega VITE_STRIPE_PAYMENT_LINK en tu archivo .env para activar el pago.',
    playAgain: 'Jugar de nuevo',
    termsOfUse: 'Términos de uso',
    theAnswerWas: 'La respuesta era',
    continue: 'Continuar',
    artworkProgress: (current: number, total: number) =>
      `${current} / ${total}`,
    unlimitedOption: 'Opción ilimitada de obras',
    unlimitedLimit: 'Límite ilimitado de obras',
    whoP: '¿Quién pintó esta obra de arte?',
    attemptsLeft: (n: number) => `Intentos restantes: ${n}`,
    selectionHelp: 'Elige 1 de 5 opciones de pintores.',
    selectedPainter: (name: string) => `Pintor seleccionado: ${name}`,
    painterChoices: 'Opciones de pintor',
    artworkAlt: (title: string) => `Obra: ${title}`,
    youGuessedIt: '🎉 ¡Lo adivinaste! 🎉',
    youGuessedFeedback: '¡Lo adivinaste!',
    notQuite: 'No exactamente — un intento más.',
    incorrect: (painter: string) => `Incorrecto. Pintor: ${painter}`,
    revealText: (painter: string) => `Pintor: ${painter}`,
    languageLabel: 'Idioma',
  },
}

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
      ? translations['en'].premiumBanner
      : '',
  )
  const [questionAccent, setQuestionAccent] = useState(questionAccentColors[0])
  const [isResolvingSelection, setIsResolvingSelection] = useState(false)
  const [blastVisible, setBlastVisible] = useState(false)
  const [blastMessage, setBlastMessage] = useState('')
  const [isSuccessBlast, setIsSuccessBlast] = useState(false)
  const [showRevealOverlay, setShowRevealOverlay] = useState(false)
  const [quizFinished, setQuizFinished] = useState(false)
  const [language, setLanguage] = useState<Language>('en')
  const t = translations[language]
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
    const selectedDecoys = shuffleList(decoyPainters).slice(0, 4)

    return shuffleList([correctPainter, ...selectedDecoys])
  }, [currentArtwork])

  useEffect(() => {
    if (!isPremiumSuccessInUrl()) return

    window.localStorage.setItem(premiumStorageKey, 'true')

    const cleanUrl = `${window.location.pathname}${window.location.hash}`
    window.history.replaceState({}, document.title, cleanUrl)
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const randomIndex = Math.floor(Math.random() * questionAccentColors.length)
      setQuestionAccent(questionAccentColors[randomIndex])
    }, 650)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  const resetRoundInputs = () => {
    setPainterAnswer('')
    setAttemptsUsed(0)
    setIsResolvingSelection(false)
    setBlastVisible(false)
    setBlastMessage('')
    setIsSuccessBlast(false)
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
    setBlastMessage(t.youGuessedIt)
    setIsSuccessBlast(true)
    setBlastVisible(true)
    setFeedback(t.youGuessedFeedback)

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
        setFeedback(t.notQuite)
      }, selectionFeedbackDelayMs)
      return
    }

    window.setTimeout(() => {
      setIsResolvingSelection(false)
      setFeedback(t.incorrect(toDisplayLabel(currentArtwork.painterAliases[0])))
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
    setBlastMessage('')
    setIsSuccessBlast(false)
    setShowRevealOverlay(false)
    setQuizFinished(false)
  }

  const handleContinue = () => {
    setBlastVisible(false)
    setFeedback(t.incorrect(toDisplayLabel(currentArtwork?.painterAliases[0] ?? '')))
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
          <header className="quiz-header">
            <h1>{t.title}</h1>
            <div className="language-selector">
              <label htmlFor="lang-select-end" className="language-label">{t.languageLabel}</label>
              <select
                id="lang-select-end"
                className="language-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
              >
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
              </select>
            </div>
          </header>
          <p className="summary-text">{t.quizComplete}</p>
          <p className="summary-text">{t.yourScore(score, artworks.length)}</p>
          <div className="upgrade-box upgrade-box-right">
            <p className="upgrade-title">{t.unlockUnlimited}</p>
            <p className="upgrade-price">{t.pricePerYear}</p>
            {isPremium ? (
              <p className="upgrade-note">{t.premiumUnlocked}</p>
            ) : (
              <button
                type="button"
                className="primary-button"
                onClick={handleUpgradeClick}
                disabled={!stripePaymentLink}
              >
                {t.payWithStripe}
              </button>
            )}
            {!isPremium && !stripePaymentLink && (
              <p className="upgrade-note">{t.stripeNote}</p>
            )}
          </div>
          <button type="button" className="primary-button play-again-button" onClick={restartQuiz}>
            {t.playAgain}
          </button>
        </section>
        <p className="legal-link-row">
          <a href="/terms.html" target="_blank" rel="noopener noreferrer">
            {t.termsOfUse}
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
            <p className="reveal-label">{t.theAnswerWas}</p>
            <p className="reveal-answer">{toDisplayLabel(currentArtwork.painterAliases[0])}</p>
            <button
              type="button"
              className="primary-button reveal-continue-button"
              onClick={() => {
                setShowRevealOverlay(false)
                moveToNextArtwork()
              }}
            >
              {t.continue}
            </button>
          </div>
        </div>
      )}

      {blastVisible && (
        <div className="blast-overlay" aria-live="polite">
          <div className="blast-panel">
            <p className="blast-text">{blastMessage}</p>
            {!isSuccessBlast && (
              <div className="blast-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleContinue}
                >
                  {t.continue}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <section className="quiz-card">
        <header className="quiz-header">
          <h1>{t.title}</h1>
          <div className="language-selector">
            <label htmlFor="lang-select" className="language-label">{t.languageLabel}</label>
            <select
              id="lang-select"
              className="language-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
            </select>
          </div>
          <p className="quiz-progress-text">
            {t.artworkProgress(currentIndex + 1, artworks.length)}
          </p>
          {isPremium && <p className="upgrade-note">{t.premiumActive}</p>}
        </header>

        <div className="quiz-body">
          <div className="art-panel">
            <img
              className="art-image"
              src={currentArtwork.imageUrl}
              alt={t.artworkAlt(currentArtwork.title)}
            />
          </div>

          <div className="quiz-form">
            <div className="quiz-title-row">
              <h2
                className="question-title"
                style={{ '--question-accent': questionAccent } as React.CSSProperties}
              >
                {t.whoP}
              </h2>
              <p className="attempts-text">
                {t.attemptsLeft(attemptsLeft)}
              </p>
            </div>
            <p className="selection-help">{t.selectionHelp}</p>

            <div className="selection-options" role="group" aria-label={t.painterChoices}>
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
                {t.selectedPainter(painterAnswer)}
              </p>
            )}

            {feedback && (
              <div className="status-box" aria-live="polite">
                <p className="status-text">{feedback}</p>
              </div>
            )}

            <div className="upgrade-terms-row">
              <details className="upgrade-disclosure upgrade-disclosure-inline">
                <summary className="upgrade-summary">
                  {t.unlimitedOption}
                </summary>
                <div className="upgrade-box">
                  <p className="upgrade-title">{t.unlimitedLimit}</p>
                  <p className="upgrade-price">{t.pricePerYear}</p>
                  {isPremium ? (
                    <p className="upgrade-note">{t.premiumUnlocked}</p>
                  ) : (
                    <button
                      type="button"
                      className="primary-button"
                      onClick={handleUpgradeClick}
                      disabled={!stripePaymentLink}
                    >
                      {t.payWithStripe}
                    </button>
                  )}
                  {!isPremium && !stripePaymentLink && (
                    <p className="upgrade-note">{t.stripeNote}</p>
                  )}
                </div>
              </details>
              <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="terms-link">
                {t.termsOfUse}
              </a>
            </div>
          </div>
        </div>

      </section>
    </main>
  )
}

export default App
