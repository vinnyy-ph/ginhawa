'use client';

import { useState, useEffect, useRef } from 'react';

// Inline types for Web Speech API (not in all TS dom libs)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

interface ISpeechRecognitionConstructor {
  new (): ISpeechRecognition;
}

type WindowWithSpeechRecognition = Window & {
  SpeechRecognition?: ISpeechRecognitionConstructor;
  webkitSpeechRecognition?: ISpeechRecognitionConstructor;
};

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  isSupported: boolean;
  startListening: (onTranscript: (text: string) => void) => void;
  stopListening: () => void;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);

  useEffect(() => {
    const win = window as WindowWithSpeechRecognition;
    setIsSupported(!!(win.SpeechRecognition || win.webkitSpeechRecognition));
  }, []);

  const startListening = (onTranscript: (text: string) => void) => {
    const win = window as WindowWithSpeechRecognition;
    const SpeechRecognitionAPI = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    // Stop any existing recognition session
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    let gotResult = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Find the latest final result
      for (let i = event.results.length - 1; i >= 0; i--) {
        if (event.results[i].isFinal) {
          const transcript = event.results[i][0].transcript;
          onTranscript(transcript);
          gotResult = true;
          // Auto-stop after capturing speech
          recognition.stop();
          return;
        }
      }
    };

    recognition.onerror = (event: Event) => {
      const errorEvent = event as Event & { error?: string };
      // Ignore 'no-speech' — user just hasn't spoken yet; keep listening
      if (errorEvent.error === 'no-speech') return;
      // Abort on real errors (not-allowed, network, etc.)
      setIsListening(false);
    };

    recognition.onend = () => {
      if (gotResult) {
        // Normal completion — we got speech and stopped
        setIsListening(false);
      } else if (recognitionRef.current === recognition) {
        // Chrome fires 'onend' prematurely (e.g., after no-speech timeout).
        // Restart if the user hasn't clicked stop.
        try {
          recognition.start();
        } catch {
          // start() can throw if recognition was aborted — just stop
          setIsListening(false);
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onend = null; // Prevent restart loop
      recognition.stop();
    }
    recognitionRef.current = null;
    setIsListening(false);
  };

  return { isListening, isSupported, startListening, stopListening };
}
