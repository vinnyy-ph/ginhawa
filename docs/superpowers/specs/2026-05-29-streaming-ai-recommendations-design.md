# Streaming AI Recommendations Design

## Problem Statement
The AI symptom analysis currently takes 20-40 seconds to complete and occasionally throws 500 Internal Server Errors. This is caused by:
1. The backend blocking synchronously until the entire AI response completes.
2. Unreliable JSON parsing logic causing the backend to retry the AI request up to 3 times before failing.

## Goals
- Provide an instantaneous, "light speed" experience for the user.
- Show the AI's explanation typing out in real-time.
- Eliminate 500 errors caused by JSON parsing and validation failures.

## Architecture

### Backend (NestJS)
- **Streaming Endpoint:** The `/recommendations` POST endpoint will be updated to support streaming using the NestJS `@Res()` decorator and standard Node.js streaming, or Server-Sent Events (SSE). It will use the `@google/generative-ai` SDK's `generateContentStream` method.
- **Structured Outputs:** The Gemini API call will be updated to use the `responseSchema` configuration. This strictly enforces the JSON structure and the `VALID_SPECIALIZATIONS` enum at the API level, completely eliminating the need for the 3-retry loop and manual string replacement.
- **Background Persistence:** As the stream is piped to the client, the backend will accumulate the chunks. Once the stream is finished, the backend will asynchronously save the complete `RecommendationLog` to the PostgreSQL database.

### Frontend (Next.js)
- **Streaming Fetch:** The client-side form submission will read the response body as a stream instead of awaiting the full JSON response.
- **Partial JSON Parsing:** A lightweight parser or parsing strategy will process the incoming stream chunks to safely extract the `explanation` text as it grows.
- **Real-time UI:** 
  - Upon submission, the UI immediately transitions to the result view.
  - The `explanation` is typed out on the screen in real-time.
  - A skeleton/placeholder is shown for the `specialization` until the stream finishes, at which point the final specialization and action buttons are revealed.

## Data Flow
1. User submits symptoms on the frontend.
2. Frontend opens a streaming fetch request to the backend.
3. Backend calls Gemini with `generateContentStream` and `responseSchema`.
4. Backend streams chunks to the frontend.
5. Frontend parses partial JSON and updates the UI typing effect.
6. Stream ends. Frontend reveals the final specialization and buttons.
7. Backend saves the log to the database.

## Error Handling
- If the AI stream fails midway, the frontend will show a graceful error message and prompt the user to try again.
- Database save failures will be logged but will not interrupt the user's experience since they occur asynchronously after the stream finishes.
