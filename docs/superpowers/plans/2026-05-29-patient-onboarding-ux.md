# Patient Onboarding UI/UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the UI/UX of the patient onboarding flow to be more professional, user-friendly, and specifically tailored for the Philippines context.

**Architecture:** Frontend-only changes to existing React components and Next.js pages. We will refine input logic, add interactive UI elements (chips, sliders, BMI calculator), and redesign the final review step as a "Patient ID" card.

**Tech Stack:** Next.js, React, Tailwind CSS, Radix UI, React Hook Form, Zod, date-fns, react-day-picker.

---

### Task 1: Fix Birthdate Input Logic and Calendar Dropdowns

**Files:**
- Modify: `frontend/src/components/ui/birthdate-input.tsx`
- Modify: `frontend/src/components/ui/calendar.tsx`

- [ ] **Step 1: Update Calendar component to support dropdowns**
Modify `frontend/src/components/ui/calendar.tsx` to accept `fromYear` and `toYear` props and pass them to `DayPicker`.

```tsx
// frontend/src/components/ui/calendar.tsx
// ...
export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  fromYear?: number;
  toYear?: number;
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  fromYear,
  toYear,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      fromYear={fromYear}
      toYear={toYear}
      // ... rest remains same
```

- [ ] **Step 2: Fix padding logic and enable dropdowns in BirthdateInput**
Modify `frontend/src/components/ui/birthdate-input.tsx`:
1. Remove `handleDayBlur` padding logic (don't pad days with '0').
2. Keep `handleMonthBlur` padding logic.
3. Pass `captionLayout="dropdown"`, `fromYear={1900}`, and `toYear={new Date().getFullYear()}` to the `Calendar` component.

```tsx
// frontend/src/components/ui/birthdate-input.tsx
// ...
  const handleDayBlur = () => {
    // REMOVE padding logic here as requested
    updateValue(month, day, year)
  }
// ...
          <Calendar
            mode="single"
            selected={validParsedDate}
            onSelect={handleCalendarSelect}
            defaultMonth={validParsedDate}
            endMonth={new Date()}
            disabled={{ after: new Date() }}
            captionLayout="dropdown"
            fromYear={1900}
            toYear={new Date().getFullYear()}
            // ...
```

- [ ] **Step 3: Commit Task 1**

```bash
git add frontend/src/components/ui/birthdate-input.tsx frontend/src/components/ui/calendar.tsx
git commit -m "fix(onboarding): fix birthdate day padding and add calendar dropdowns"
```

### Task 2: Implement Strict Philippines Phone Number Input

**Files:**
- Modify: `frontend/src/app/onboarding/1/page.tsx`

- [ ] **Step 1: Create or Update Phone Input with fixed +63 prefix**
Update the contact number field in `frontend/src/app/onboarding/1/page.tsx` to have a permanent `+63` prefix and strictly enforce 10 digits after it (stripping leading 0).

```tsx
// In frontend/src/app/onboarding/1/page.tsx
// Replace the standard input with a prefixed one

<div className="relative flex items-center">
  <div className="absolute left-3 text-sm font-bold text-on-surface-variant pointer-events-none border-r border-outline-variant/50 pr-2">
    +63
  </div>
  <input
    type="tel"
    placeholder="917 123 4567"
    className={cn(inputClass, "pl-14")}
    {...register('contactDetails', {
      onChange: (e) => {
        let val = e.target.value.replace(/\D/g, "");
        if (val.startsWith("0")) val = val.slice(1);
        e.target.value = val.slice(0, 10);
      }
    })}
  />
</div>
```

- [ ] **Step 2: Commit Task 2**

```bash
git add frontend/src/app/onboarding/1/page.tsx
git commit -m "feat(onboarding): enforce strict +63 PH phone number format"
```

### Task 3: Improve Body Metrics with BMI Calculator (Step 2)

**Files:**
- Modify: `frontend/src/app/onboarding/2/page.tsx`

- [ ] **Step 1: Add BMI Calculation logic and Display**
Implement a real-time BMI calculator that shows a badge (Underweight, Normal, Overweight, Obese) as the user types.

```tsx
// Inside OnboardingStep2 component
const [bmi, setBmi] = useState<number | null>(null);

const calculateBMI = (w: number | undefined, h: number | undefined) => {
  if (w && h) {
    const hMeter = h / 100;
    const result = w / (hMeter * hMeter);
    setBmi(Math.round(result * 10) / 10);
  } else {
    setBmi(null);
  }
};

// ... update calculateBMI call in handleWeightChange and handleHeightChange
```

- [ ] **Step 2: Redesign Metrics Inputs**
Add subtle icons and a more tactile "island" for the unit toggles.

- [ ] **Step 3: Commit Task 3**

```bash
git add frontend/src/app/onboarding/2/page.tsx
git commit -m "feat(onboarding): add BMI calculator and improve metrics UI"
```

### Task 4: Add Quick Selection Chips for Medical History (Step 3)

**Files:**
- Modify: `frontend/src/app/onboarding/3/page.tsx`

- [ ] **Step 1: Implement Quick Selection Chips**
Add a set of common conditions and allergies as clickable chips that append text to the textareas.

```tsx
const COMMON_CONDITIONS = ["Hypertension", "Diabetes", "Asthma", "None"];
const COMMON_ALLERGIES = ["Penicillin", "Sulfa Drugs", "Peanuts", "None"];

// Helper to toggle selection
const toggleChip = (field: 'conditions' | 'allergies', value: string) => {
  const current = getValues(field) || "";
  if (value === "None") {
    setValue(field, "None", { shouldValidate: true });
    return;
  }
  const items = current === "None" ? [] : current.split(", ").filter(Boolean);
  if (items.includes(value)) {
    setValue(field, items.filter(i => i !== value).join(", "), { shouldValidate: true });
  } else {
    setValue(field, [...items, value].join(", "), { shouldValidate: true });
  }
};
```

- [ ] **Step 2: Commit Task 4**

```bash
git add frontend/src/app/onboarding/3/page.tsx
git commit -m "feat(onboarding): add common medical history chips"
```

### Task 5: Redesign Review Step as "Patient ID Card" (Step 5)

**Files:**
- Modify: `frontend/src/app/onboarding/5/page.tsx`

- [ ] **Step 1: Implement "Patient ID" Card Layout**
Replace the list of sections with a single, highly polished "Digital Health Record" card.

```tsx
<div className="bg-surface-white rounded-3xl border border-outline-variant/30 shadow-lifted overflow-hidden">
  <div className="bg-gradient-to-br from-primary to-primary-container p-6 text-white">
     {/* Photo, Name, and basic ID-style header */}
  </div>
  <div className="p-8 grid grid-cols-2 gap-8">
     {/* Grid of data points */}
  </div>
</div>
```

- [ ] **Step 2: Commit Task 5**

```bash
git add frontend/src/app/onboarding/5/page.tsx
git commit -m "feat(onboarding): redesign review step as a patient ID card"
```
