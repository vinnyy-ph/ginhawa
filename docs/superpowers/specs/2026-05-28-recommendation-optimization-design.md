# AI Recommendation Optimization Design

## Context
The AI recommendation system (`backend/src/recommendations/recommendations.service.ts`) currently uses `gemini-3.5-flash`. Users experience slow response times and occasional "AI recommendation service unavailable" errors. These errors occur when the Gemini API times out or returns malformed JSON that fails parsing.

## Goals
- **Speed:** Decrease average latency for common symptom queries without swapping the tech stack.
- **Reliability:** Eliminate JSON parsing crashes and handle transient network failures gracefully.

## Architecture & Flow

### 1. Database Exact-Match Caching
- Before calling the Gemini API, the system will query the `RecommendationLog` table for an exact, case-insensitive match of the `symptomInput`.
- **Match Found:** Instantly return the historically `matchedSpecialization` and `aiExplanation`.
- **No Match:** Proceed to the Gemini API call.
- *Trade-off:* This only covers exact symptom phrasing, but provides a 0ms AI latency for common repeated phrases (e.g., "headache").

### 2. Native JSON Mode
- Update the `GoogleGenerativeAI` model configuration to use `responseMimeType: 'application/json'`.
- Define a strict `responseSchema` for the expected JSON structure if supported by the SDK version, otherwise rely on prompt engineering combined with the MimeType.
- Remove the brittle regex/replace logic (`.replace(/```json\n?/g, '')`) which is error-prone.

### 3. Retry Mechanism
- Wrap the `getAIRecommendation` execution block in a retry loop.
- **Attempts:** Up to 2 retries (3 attempts total).
- **Behavior:** If `generateContent` throws an error or the resulting JSON parsing fails against validation, it will retry. If all 3 attempts fail, it throws the `InternalServerErrorException`.

## Error Handling
- Invalid specializations returned by the AI will now trigger a retry (if attempts remain) instead of an immediate crash.
- Exhausted retries return a standardized `AI recommendation service unavailable` to the client.

## Testing
- Unit tests in `recommendations.service.spec.ts` must be updated to mock the retry logic and verify that cached inputs do not trigger an AI generation call.
