# Groq STT Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate from the browser Web Speech API to Groq's Whisper API using a "record then transcribe" UX pattern via a new NestJS backend endpoint.

**Architecture:** The frontend captures audio via `MediaRecorder` into a `Blob`, then sends it as `multipart/form-data` to a new `POST /speech/transcribe` endpoint in NestJS. The backend uses `multer` to accept the file and forwards it to Groq's `whisper-large-v3` model for transcription.

**Tech Stack:** Next.js 14 App Router, NestJS, `groq-sdk`, `@types/multer`

---

### Task 1: Backend Dependencies

**Files:**
- Modify: `backend/package.json`

- [ ] **Step 1: Install Groq SDK and Multer Types**

```bash
cd backend && npm install groq-sdk && npm install -D @types/multer
```
Expected output: successful installation.

- [ ] **Step 2: Commit**

```bash
git add backend/package.json backend/package-lock.json
git commit -m "chore: add groq-sdk and @types/multer"
```

---

### Task 2: Backend Speech Module Tests

**Files:**
- Create: `backend/src/speech/speech.service.spec.ts`
- Create: `backend/src/speech/speech.controller.spec.ts`

- [ ] **Step 1: Write failing service test**

Create `backend/src/speech/speech.service.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { SpeechService } from './speech.service';
import { InternalServerErrorException } from '@nestjs/common';

const mockCreateTranscription = jest.fn();

jest.mock('groq-sdk', () => {
  return jest.fn().mockImplementation(() => ({
    audio: {
      transcriptions: {
        create: mockCreateTranscription,
      },
    },
  }));
});

describe('SpeechService', () => {
  let service: SpeechService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SpeechService],
    }).compile();

    service = module.get<SpeechService>(SpeechService);
    jest.clearAllMocks();
  });

  it('transcribes audio using Groq', async () => {
    mockCreateTranscription.mockResolvedValue({ text: 'Hello world' });
    const mockFile = { buffer: Buffer.from('audio'), originalname: 'audio.webm' } as Express.Multer.File;

    const result = await service.transcribeAudio(mockFile);
    expect(result).toEqual({ text: 'Hello world' });
    expect(mockCreateTranscription).toHaveBeenCalledWith({
      file: expect.any(File), // The service maps the buffer to a File object
      model: 'whisper-large-v3',
    });
  });

  it('throws InternalServerErrorException on Groq failure', async () => {
    mockCreateTranscription.mockRejectedValue(new Error('Groq Error'));
    const mockFile = { buffer: Buffer.from('audio'), originalname: 'audio.webm' } as Express.Multer.File;

    await expect(service.transcribeAudio(mockFile)).rejects.toThrow(InternalServerErrorException);
  });
});
```

- [ ] **Step 2: Write failing controller test**

Create `backend/src/speech/speech.controller.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { SpeechController } from './speech.controller';
import { SpeechService } from './speech.service';
import { BadRequestException } from '@nestjs/common';

describe('SpeechController', () => {
  let controller: SpeechController;
  const mockSpeechService = {
    transcribeAudio: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SpeechController],
      providers: [{ provide: SpeechService, useValue: mockSpeechService }],
    }).compile();

    controller = module.get<SpeechController>(SpeechController);
    jest.clearAllMocks();
  });

  it('calls service with file', async () => {
    mockSpeechService.transcribeAudio.mockResolvedValue({ text: 'Test' });
    const mockFile = { buffer: Buffer.from('audio') } as Express.Multer.File;

    const result = await controller.transcribe(mockFile);
    expect(result).toEqual({ text: 'Test' });
    expect(mockSpeechService.transcribeAudio).toHaveBeenCalledWith(mockFile);
  });

  it('throws BadRequestException if no file provided', async () => {
    await expect(controller.transcribe(undefined)).rejects.toThrow(BadRequestException);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run `cd backend && npm test -- src/speech`
Expected: Failures due to missing module/service files.

- [ ] **Step 4: Commit**

```bash
git add backend/src/speech/
git commit -m "test: add failing tests for speech module"
```

---

### Task 3: Backend Speech Module Implementation

**Files:**
- Create: `backend/src/speech/speech.service.ts`
- Create: `backend/src/speech/speech.controller.ts`
- Create: `backend/src/speech/speech.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Write SpeechService**

Create `backend/src/speech/speech.service.ts`:
```typescript
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import Groq from 'groq-sdk';

@Injectable()
export class SpeechService {
  private groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy' });

  async transcribeAudio(file: Express.Multer.File): Promise<{ text: string }> {
    try {
      // Groq SDK expects a global File or a stream. We can construct a File from the buffer.
      const audioFile = new File([file.buffer], file.originalname || 'audio.webm', {
        type: file.mimetype || 'audio/webm',
      });

      const transcription = await this.groq.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-large-v3',
      });

      return { text: transcription.text };
    } catch (error) {
      throw new InternalServerErrorException('Speech transcription failed');
    }
  }
}
```

- [ ] **Step 2: Write SpeechController**

Create `backend/src/speech/speech.controller.ts`:
```typescript
import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SpeechService } from './speech.service';

@Controller('speech')
export class SpeechController {
  constructor(private readonly speechService: SpeechService) {}

  @Post('transcribe')
  @UseInterceptors(FileInterceptor('audio'))
  async transcribe(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No audio file provided');
    }
    return this.speechService.transcribeAudio(file);
  }
}
```

- [ ] **Step 3: Write SpeechModule**

Create `backend/src/speech/speech.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { SpeechController } from './speech.controller';
import { SpeechService } from './speech.service';

@Module({
  controllers: [SpeechController],
  providers: [SpeechService],
  exports: [SpeechService],
})
export class SpeechModule {}
```

- [ ] **Step 4: Register in AppModule**

Modify `backend/src/app.module.ts` to import `SpeechModule`. 
Add `import { SpeechModule } from './speech/speech.module';` at the top.
Add `SpeechModule` to the `imports` array in `@Module`.

- [ ] **Step 5: Run tests to verify they pass**

Run `cd backend && npm test -- src/speech`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/speech/ backend/src/app.module.ts
git commit -m "feat: implement Groq speech-to-text endpoint"
```

---

### Task 4: Frontend API Client Update

**Files:**
- Modify: `frontend/src/lib/api-client.ts`

- [ ] **Step 1: Make token optional in apiUpload and accept Blob**

Modify `frontend/src/lib/api-client.ts`:
Replace the `apiUpload` function with:

```typescript
/** Upload a file or blob via multipart/form-data */
export async function apiUpload<T>(
  path: string,
  fieldName: string,
  file: File | Blob,
  token?: string,
): Promise<T> {
  const formData = new FormData();
  formData.append(fieldName, file, 'upload.webm');

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (data as { message?: string })?.message ??
      `Upload failed with status ${response.status}`;
    throw new ApiError(response.status, message, data);
  }

  return data as T;
}
```

*Note: Fix any existing usages of `apiUpload` in the project if there are any. Currently, there are none or they need to be updated to pass `fieldName` ('file' originally).*

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/api-client.ts
git commit -m "refactor: update apiUpload to support blobs and optional auth"
```

---

### Task 5: Rewrite Frontend Hook

**Files:**
- Modify: `frontend/src/hooks/use-speech-recognition.ts`

- [ ] **Step 1: Rewrite Hook for MediaRecorder + API Upload**

Replace entire contents of `frontend/src/hooks/use-speech-recognition.ts` with:

```typescript
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
```

- [ ] **Step 2: Verify it compiles**

Run `cd frontend && npx tsc --noEmit`
Expected: Passes. Note that the hook signature changed, so the pages will fail compilation, which is expected before the next tasks.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/use-speech-recognition.ts
git commit -m "feat: replace Web Speech API with MediaRecorder + Groq STT"
```

---

### Task 6: Update Anonymous Recommendations Page

**Files:**
- Modify: `frontend/src/app/recommendations/page.tsx`

- [ ] **Step 1: Apply UI and Hook updates**

In `frontend/src/app/recommendations/page.tsx`:

1. Remove `useRef` import.
2. Replace the hook usage:
```typescript
const { isRecording, isProcessing, isSupported, error: micError, startRecording, stopRecording } = useSpeechRecognition();
```
3. Update `handleTranscript` to simply append:
```typescript
const handleTranscript = (text: string) => {
  setSymptoms((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
};
```
4. Pass new props to `SymptomsStep`:
```tsx
            <SymptomsStep
              // ... existing props
              isRecording={isRecording}
              isProcessing={isProcessing}
              isSupported={isSupported}
              micError={micError}
              onMicClick={() =>
                isRecording ? stopRecording(handleTranscript) : startRecording()
              }
            />
```
5. Inside the `SymptomsStep` component definition (usually in the same file or a component file), update the button UI to handle `isRecording` and `isProcessing`:

```tsx
// Inside SymptomsStep button:
                {isSupported && (
                  <button
                    type="button"
                    onClick={onMicClick}
                    disabled={isProcessing}
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                      isRecording
                        ? "bg-error text-white animate-pulse"
                        : isProcessing
                        ? "bg-surface-variant text-on-surface-variant opacity-70 cursor-not-allowed"
                        : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    {/* Insert Spinner icon if isProcessing, else existing SVG */}
                    {isProcessing ? "Transcribing..." : isRecording ? "Recording..." : "Speak"}
                  </button>
                )}
```
*Make sure to display `micError` below the textarea if it exists.*

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/recommendations/page.tsx
git commit -m "feat: update anonymous page for record-then-transcribe UX"
```

---

### Task 7: Update Dashboard Recommendations Page

**Files:**
- Modify: `frontend/src/app/dashboard/ai-recommendations/page.tsx`

- [ ] **Step 1: Apply UI and Hook updates**

In `frontend/src/app/dashboard/ai-recommendations/page.tsx`:

1. Remove `useRef` import.
2. Replace hook:
```typescript
const { isRecording, isProcessing, isSupported, error: micError, startRecording, stopRecording } = useSpeechRecognition(token);
```
3. Update `handleTranscript` to simply append:
```typescript
const handleTranscript = (text: string) => {
  setSymptoms((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
};
```
4. Update the mic button in the form:
```tsx
                {isSupported && (
                  <div className="flex items-center gap-2">
                    {micError && <span className="text-xs text-error">{micError}</span>}
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() =>
                        isRecording ? stopRecording(handleTranscript) : startRecording()
                      }
                      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                        isRecording
                          ? "bg-error text-white animate-pulse"
                          : isProcessing
                          ? "bg-surface-variant text-on-surface-variant opacity-70 cursor-not-allowed"
                          : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                      }`}
                    >
                      {/* existing SVG for mic */}
                      {isProcessing ? "Transcribing..." : isRecording ? "Recording..." : "Speak"}
                    </button>
                  </div>
                )}
```

- [ ] **Step 2: Verify full compilation**

Run `cd frontend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/dashboard/ai-recommendations/page.tsx
git commit -m "feat: update dashboard page for record-then-transcribe UX"
```
