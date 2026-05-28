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
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    setIsSupported(typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia);
    
    return () => {
      isMountedRef.current = false;
      // Stop stream tracks if component unmounts while recording
      if (mediaRecorderRef.current?.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    // Prevent consecutive calls from creating multiple streams
    if (isRecording || mediaRecorderRef.current?.state === 'recording') {
      return;
    }

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
      if (isMountedRef.current) {
        setIsRecording(true);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError('Microphone access denied or unavailable.');
      }
    }
  };

  const stopRecording = (onTranscript: (text: string) => void) => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;

    mediaRecorderRef.current.onstop = async () => {
      if (isMountedRef.current) {
        setIsRecording(false);
        setIsProcessing(true);
        setError(null);
      }

      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      audioChunksRef.current = [];

      // Stop tracks to release mic
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());

      try {
        const result = await apiUpload<{ text: string }>('/speech/transcribe', 'audio', audioBlob, token);
        if (result.text && isMountedRef.current) {
          onTranscript(result.text);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError('Failed to transcribe audio.');
        }
      } finally {
        if (isMountedRef.current) {
          setIsProcessing(false);
        }
      }
    };

    mediaRecorderRef.current.stop();
  };

  return { isRecording, isProcessing, isSupported, error, startRecording, stopRecording };
}
