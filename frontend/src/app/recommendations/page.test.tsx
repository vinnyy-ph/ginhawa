import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecommendationsPage from "./page";

const mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: null }),
}));

vi.mock("@/hooks/use-speech-recognition", () => ({
  useSpeechRecognition: () => ({
    isRecording: false,
    isProcessing: false,
    isSupported: false,
    error: null,
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
  }),
}));

const apiRequest = vi.fn();
vi.mock("@/lib/api-client", () => ({
  apiRequest: (...args: unknown[]) => apiRequest(...args),
}));

describe("RecommendationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.delete("symptoms");
  });

  it("renders the welcome step initially", () => {
    render(<RecommendationsPage />);
    expect(
      screen.getByRole("heading", { name: /How can we help/i }),
    ).toBeInTheDocument();
  });

  it("advances to the input step on start", async () => {
    const user = userEvent.setup();
    render(<RecommendationsPage />);
    await user.click(screen.getByRole("button", { name: /Start/i }));
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("fetches matches and renders ranked doctor cards", async () => {
    apiRequest.mockResolvedValue({
      explanation: "A dentist suits your request.",
      criteria: { specialization: "Dentistry", city: "Manila", region: null, minYears: 5, minRating: null },
      emergency: false,
      doctors: [
        {
          id: "doc-1",
          fullName: "Jane Cruz",
          professionalTitle: "Dr.",
          specialization: "Dentistry",
          isVerified: true,
          yearsOfExperience: 8,
          avgRating: 4.6,
          reviewCount: 12,
          matchScore: 1,
          matchReason: "Dentistry · Manila · 8 yrs (≥5 ✓)",
        },
      ],
    });

    const user = userEvent.setup();
    render(<RecommendationsPage />);
    await user.click(screen.getByRole("button", { name: /Start/i }));
    await user.type(screen.getByRole("textbox"), "dentist in Manila with 5 years");
    await user.click(screen.getByRole("button", { name: /Find My Specialist/i }));

    await waitFor(() => expect(screen.getByText(/Jane Cruz/)).toBeInTheDocument());
    expect(apiRequest).toHaveBeenCalledWith(
      "/recommendations/match",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
