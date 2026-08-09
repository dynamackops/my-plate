import { useEffect, useRef, useState } from 'react'

export type DictationTarget = 'title' | 'description'

interface SpeechResultEvent {
  results: ArrayLike<{ 0: { transcript: string } }>
}

interface SpeechErrorEvent {
  error: string
}

interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  onstart: (() => void) | null
  onend: (() => void) | null
  onresult: ((event: SpeechResultEvent) => void) | null
  onerror: ((event: SpeechErrorEvent) => void) | null
  start: () => void
  abort: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

function getSpeechRecognition(): SpeechRecognitionConstructor | undefined {
  const speechWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
}

export function useDictation(onTranscript: (target: DictationTarget, transcript: string) => void) {
  const [listeningTarget, setListeningTarget] = useState<DictationTarget | null>(null)
  const [feedback, setFeedback] = useState<{ target: DictationTarget; text: string } | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const supported = typeof window !== 'undefined' && Boolean(getSpeechRecognition())

  useEffect(() => () => recognitionRef.current?.abort(), [])

  const start = (target: DictationTarget) => {
    const Recognition = getSpeechRecognition()
    if (!Recognition) {
      setFeedback({ target, text: 'Browser dictation is not available here. Wispr Flow can still type into this field.' })
      return
    }

    recognitionRef.current?.abort()
    const recognition = new Recognition()
    recognitionRef.current = recognition
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = navigator.language || 'en-US'
    recognition.onstart = () => {
      setListeningTarget(target)
      setFeedback({ target, text: 'Listening… speak naturally.' })
    }
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim()
      if (transcript) onTranscript(target, transcript)
      setFeedback({ target, text: transcript ? 'Dictation added.' : 'No speech was recognized. Try again when you’re ready.' })
    }
    recognition.onerror = (event) => {
      const text = event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? 'Microphone permission wasn’t granted. You can type or use Wispr Flow instead.'
        : 'Dictation didn’t come through. You can try again or keep typing.'
      setFeedback({ target, text })
    }
    recognition.onend = () => setListeningTarget(null)

    try {
      recognition.start()
    } catch {
      setListeningTarget(null)
      setFeedback({ target, text: 'Dictation couldn’t start. You can try again or use Wispr Flow.' })
    }
  }

  const prepareWispr = (target: DictationTarget, focusField: () => void) => {
    recognitionRef.current?.abort()
    focusField()
    setFeedback({ target, text: `Ready for Wispr Flow. Use your Flow shortcut and speak into the focused ${target} field.` })
  }

  return { supported, listeningTarget, feedback, start, prepareWispr }
}
