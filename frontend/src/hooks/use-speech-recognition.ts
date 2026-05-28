'use client';

import { useState, useRef, useEffect } from 'react';
import { apiUpload } from '@/lib/api-client';

interface UseSpeechRecognitionReturn {
  isRecording: boolean;
  isProcessing: boolean;
  isSupported: boolean;
  error: string | null;
  startRecording: () => void;
  stopRecording: (onTranscript: (text: string) => void) => void;
}

export function useSpeechRecognition(token?: string): UseSpeechRecognitionReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    setIsSupported(typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia);
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError('Microphone access denied or unavailable.');
    }
  };

  const stopRecording = (onTranscript: (text: string) => void) => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;

    mediaRecorderRef.current.onstop = async () => {
      setIsRecording(false);
      setIsProcessing(true);
      setError(null);

      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      audioChunksRef.current = [];

      // Stop tracks to release mic
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());

      try {
        const result = await apiUpload<{ text: string }>('/speech/transcribe', 'audio', audioBlob, token);
        if (result.text) {
          onTranscript(result.text);
        }
      } catch (err) {
        setError('Failed to transcribe audio.');
      } finally {
        setIsProcessing(false);
      }
    };

    mediaRecorderRef.current.stop();
  };

  return { isRecording, isProcessing, isSupported, error, startRecording, stopRecording };
}
