# Groq Whisper Speech-to-Text Migration Design

## 1. Overview
The current implementation using the browser-native Web Speech API has proven unreliable, often cutting out early or failing to capture continuous speech accurately. This design outlines the migration to Groq's Whisper API (`whisper-large-v3`) to provide fast, highly accurate, and reliable speech-to-text transcription.

## 2. User Experience Changes
Because Groq processes audio files rather than a live audio stream, the transcription user experience will shift from "real-time streaming" to a "record then transcribe" model.

- **Record Phase:** User clicks the mic button, which pulses red and says "Recording...". The browser captures audio.
- **Process Phase:** User clicks the mic button again to stop. The button shows a spinner and says "Transcribing...".
- **Result Phase:** The full transcript is appended to the symptom text area.

## 3. Architecture & Data Flow
The transcription process will involve both the Next.js frontend and the NestJS backend to ensure API keys remain secure and the architecture remains centralized.

1. **Frontend (Browser):** The `useSpeechRecognition` hook uses the `MediaRecorder` API to record microphone input into a `Blob` (typically `audio/webm`).
2. **Transmission:** The frontend packages the `Blob` into a `FormData` object and sends it via an HTTP POST request to the backend.
3. **Backend (NestJS):** A new endpoint (`POST /speech/transcribe`) receives the multipart form data.
4. **Groq Integration:** The backend uses the `groq-sdk` to send the audio buffer directly to Groq's transcription endpoint.
5. **Response:** The plain text transcript is returned to the frontend and appended to the UI.

## 4. Backend Implementation Details
- **Dependencies:** Install `groq-sdk` and `@types/multer`.
- **Module:** Create a new `SpeechModule` (or add to an existing utilities module) with a `SpeechController` and `SpeechService`.
- **Endpoint:** `POST /speech/transcribe`
- **Upload Handling:** Use NestJS's `@UseInterceptors(FileInterceptor('audio'))` to handle the incoming file upload in memory.
- **Service Logic:** Instantiate the Groq client. Call `groq.audio.transcriptions.create` passing the file buffer, specifying `model: 'whisper-large-v3'`.

## 5. Frontend Implementation Details
- **Hook Replacement:** Rewrite `frontend/src/hooks/use-speech-recognition.ts`.
  - Remove Web Speech API logic.
  - Implement `MediaRecorder` logic.
  - State: `isRecording` (boolean), `isProcessing` (boolean), `error` (string | null).
  - Expose functions: `startRecording`, `stopRecording`.
- **UI Updates:**
  - Update `recommendations/page.tsx` and `dashboard/ai-recommendations/page.tsx`.
  - Modify the mic button logic to handle the three states (Idle, Recording, Processing).
  - Revert the `baseSymptomsRef` text replacement logic back to a simple string append, as we will now receive the entire chunk of text at once rather than interim results.

## 6. Error Handling
- **Microphone Permissions:** If the user denies microphone access, the hook must catch the error and expose a clear message.
- **Backend Failures:** If the Groq API fails or times out, the backend should return a 500 error, which the frontend hook will catch and expose as a generic "Transcription failed" error.
- **Empty Audio:** If the recording is too short or empty, gracefully handle the error without crashing the UI.
