import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResultsStep } from "./results-step";
import type { MatchResult } from "@/types/api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function buildResult(over: Partial<MatchResult> = {}): MatchResult {
  return {
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
    ...over,
  };
}

describe("ResultsStep", () => {
  it("renders the explanation and a ranked doctor card with its match reason", () => {
    render(<ResultsStep result={buildResult()} onRestart={vi.fn()} isAnalyzing={false} />);
    expect(screen.getByText("A dentist suits your request.")).toBeInTheDocument();
    expect(screen.getByText(/Jane Cruz/)).toBeInTheDocument();
    expect(screen.getByText(/Manila · 8 yrs/)).toBeInTheDocument();
  });

  it("shows an empty-state message when no doctors match", () => {
    render(
      <ResultsStep result={buildResult({ doctors: [] })} onRestart={vi.fn()} isAnalyzing={false} />,
    );
    expect(screen.getByText(/no matching doctors/i)).toBeInTheDocument();
  });

  it("renders the emergency screen when emergency is true", () => {
    render(
      <ResultsStep
        result={buildResult({ emergency: true, doctors: [] })}
        onRestart={vi.fn()}
        isAnalyzing={false}
      />,
    );
    expect(screen.getByRole("heading", { name: /Emergency Detected/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /911/i })).toBeInTheDocument();
  });
});
