# React Aria Date & Time Picker Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every app date/time input with React Aria Components primitives that keep the existing `"YYYY-MM-DD"` / `"HH:mm"` string interface, so no zod/RHF/context changes are needed.

**Architecture:** Three new/rewritten primitives in `frontend/src/components/ui/` — a styled `PickerCalendar` (RAC `Calendar`), a string-interfaced `DatePicker` (RAC `DatePicker` = typeable `DateField` + calendar popover), and a string-interfaced `TimeField` (RAC `TimeField`). Internal adapters convert string ⇄ `@internationalized/date` types. All 9 consumer surfaces swap to these. `react-day-picker` and `birthdate-input.tsx` are removed.

**Tech Stack:** Next.js (client components), React Aria Components, `@internationalized/date`, Tailwind v4 (styling via RAC `data-[...]` variants), existing design tokens (`primary`, `surface`, `surface-white`, `surface-container`, `outline-variant`, `on-surface-variant`, `text-primary`).

**Verification:** No frontend test runner exists. Each task verifies with `npx tsc --noEmit` (run from `frontend/`). Final task runs `npm run build` + `npm run lint`. The build passing is the proof the string interface held — every consumer still type-checks against `value: string` / `onChange(string)`.

**Note on Next.js:** `frontend/AGENTS.md` warns this Next.js version may differ from training data. RAC components are client components; ensure every new file starts with `'use client'`.

---

### Task 1: Install dependencies

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Add the two runtime deps**

Run (from `frontend/`):

```bash
npm install react-aria-components @internationalized/date
```

Expected: both added to `dependencies`, lockfile updated, install succeeds.

- [ ] **Step 2: Verify install + types resolve**

Run (from `frontend/`):

```bash
node -e "require('react-aria-components'); require('@internationalized/date'); console.log('ok')"
```

Expected: prints `ok`.

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "build(deps): add react-aria-components + @internationalized/date"
```

---

### Task 2: Styled calendar primitive

**Files:**
- Create/Rewrite: `frontend/src/components/ui/calendar.tsx`

This exports a presentational `PickerCalendar` with no value/onChange props — when nested inside RAC `DatePicker` it reads selection/min/max from context.

- [ ] **Step 1: Write `calendar.tsx`**

```tsx
'use client'

import {
  Calendar,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  CalendarCell,
  Heading,
  Button,
} from 'react-aria-components'
import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons'
import { cn } from '@/lib/utils'

// Presentational calendar for use inside <DatePicker>. Reads value/min/max from RAC context.
export function PickerCalendar() {
  return (
    <Calendar className="w-fit">
      <header className="flex items-center justify-between px-1 pb-3">
        <Button
          slot="previous"
          className="flex h-7 w-7 items-center justify-center rounded-md text-on-surface-variant outline-none hover:bg-surface-container data-[disabled]:opacity-30"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        <Heading className="text-sm font-semibold text-text-primary" />
        <Button
          slot="next"
          className="flex h-7 w-7 items-center justify-center rounded-md text-on-surface-variant outline-none hover:bg-surface-container data-[disabled]:opacity-30"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </header>
      <CalendarGrid className="border-collapse">
        <CalendarGridHeader>
          {(day) => (
            <CalendarHeaderCell className="w-9 pb-1 text-[0.7rem] font-normal text-on-surface-variant">
              {day}
            </CalendarHeaderCell>
          )}
        </CalendarGridHeader>
        <CalendarGridBody>
          {(date) => (
            <CalendarCell
              date={date}
              className={cn(
                'flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-sm outline-none transition-colors',
                'data-[hovered]:bg-primary/10 data-[hovered]:text-primary',
                'data-[selected]:bg-primary data-[selected]:text-white data-[selected]:hover:bg-primary',
                'data-[focus-visible]:ring-2 data-[focus-visible]:ring-primary',
                'data-[disabled]:cursor-default data-[disabled]:text-on-surface-variant/30 data-[disabled]:hover:bg-transparent',
                'data-[unavailable]:cursor-default data-[unavailable]:text-on-surface-variant/30',
                'data-[outside-month]:text-on-surface-variant/30',
              )}
            />
          )}
        </CalendarGridBody>
      </CalendarGrid>
    </Calendar>
  )
}
```

- [ ] **Step 2: Typecheck**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: no errors. (Old `Calendar` export is gone; consumers are fixed in later tasks — if tsc reports errors only in `birthdate-input.tsx`/`date-picker.tsx`, that is expected and resolved in Tasks 3–4. To keep tsc green here, proceed to Task 3 before relying on a clean run, or temporarily accept those two files' errors.)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/calendar.tsx
git commit -m "feat(ui): styled React Aria PickerCalendar"
```

---

### Task 3: String-interfaced DatePicker

**Files:**
- Rewrite: `frontend/src/components/ui/date-picker.tsx`

Replaces the old Date-object `DatePicker` (date/setDate). New public interface is string-based.

- [ ] **Step 1: Write `date-picker.tsx`**

```tsx
'use client'

import {
  DatePicker as AriaDatePicker,
  Group,
  DateInput,
  DateSegment,
  Button,
  Popover,
  Dialog,
} from 'react-aria-components'
import { CalendarIcon } from '@radix-ui/react-icons'
import { parseDate, type CalendarDate } from '@internationalized/date'
import { cn } from '@/lib/utils'
import { PickerCalendar } from '@/components/ui/calendar'

interface DatePickerProps {
  value?: string // "YYYY-MM-DD"
  onChange: (value: string) => void
  minDate?: string // "YYYY-MM-DD"
  maxDate?: string // "YYYY-MM-DD"
  disabled?: boolean
  id?: string
  className?: string
  'aria-label'?: string
}

function toCalendarDate(v?: string): CalendarDate | null {
  if (!v) return null
  try {
    return parseDate(v)
  } catch {
    return null
  }
}

export function DatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  disabled,
  id,
  className,
  ...aria
}: DatePickerProps) {
  return (
    <AriaDatePicker
      aria-label={aria['aria-label'] ?? 'Date'}
      value={toCalendarDate(value)}
      onChange={(d) => onChange(d ? d.toString() : '')}
      minValue={toCalendarDate(minDate) ?? undefined}
      maxValue={toCalendarDate(maxDate) ?? undefined}
      isDisabled={disabled}
      shouldForceLeadingZeros
    >
      <Group
        id={id}
        className={cn(
          'flex h-10 w-full items-center rounded-md border border-outline-variant bg-surface px-3 text-sm transition-colors',
          'focus-within:ring-2 focus-within:ring-primary data-[disabled]:opacity-50',
          className,
        )}
      >
        <DateInput className="flex flex-1 items-center">
          {(segment) => (
            <DateSegment
              segment={segment}
              className={cn(
                'rounded px-0.5 tabular-nums outline-none',
                'data-[placeholder]:text-on-surface-variant/50',
                'data-[focused]:bg-primary data-[focused]:text-white',
                'data-[disabled]:text-on-surface-variant/40',
              )}
            />
          )}
        </DateInput>
        <Button className="ml-2 flex items-center text-primary outline-none data-[disabled]:opacity-50">
          <CalendarIcon className="h-4 w-4" />
        </Button>
      </Group>
      <Popover className="rounded-lg border border-outline-variant bg-surface-white p-3 shadow-lifted outline-none">
        <Dialog className="outline-none">
          <PickerCalendar />
        </Dialog>
      </Popover>
    </AriaDatePicker>
  )
}
```

- [ ] **Step 2: Typecheck**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: only remaining errors are in `birthdate-input.tsx` (old `Calendar` import) and `app/doctor/schedule/page.tsx` (old DatePicker signature) — both fixed in Tasks 5–6. No errors inside `date-picker.tsx` itself.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/date-picker.tsx
git commit -m "feat(ui): string-interfaced React Aria DatePicker"
```

---

### Task 4: TimeField primitive

**Files:**
- Create: `frontend/src/components/ui/time-field.tsx`

- [ ] **Step 1: Write `time-field.tsx`**

```tsx
'use client'

import { TimeField as AriaTimeField, DateInput, DateSegment } from 'react-aria-components'
import { parseTime, type Time } from '@internationalized/date'
import { cn } from '@/lib/utils'

interface TimeFieldProps {
  value?: string // "HH:mm" (24h)
  onChange: (value: string) => void
  disabled?: boolean
  id?: string
  className?: string
  'aria-label'?: string
}

function toTime(v?: string): Time | null {
  if (!v) return null
  try {
    return parseTime(v)
  } catch {
    return null
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

export function TimeField({ value, onChange, disabled, id, className, ...aria }: TimeFieldProps) {
  return (
    <AriaTimeField
      aria-label={aria['aria-label'] ?? 'Time'}
      value={toTime(value)}
      onChange={(t) => onChange(t ? `${pad(t.hour)}:${pad(t.minute)}` : '')}
      hourCycle={24}
      isDisabled={disabled}
      shouldForceLeadingZeros
    >
      <DateInput
        id={id}
        className={cn(
          'flex h-10 w-full items-center rounded-md border border-outline-variant bg-surface px-3 text-sm',
          'focus-within:ring-2 focus-within:ring-primary data-[disabled]:opacity-50',
          className,
        )}
      >
        {(segment) => (
          <DateSegment
            segment={segment}
            className={cn(
              'rounded px-0.5 tabular-nums outline-none',
              'data-[placeholder]:text-on-surface-variant/50',
              'data-[focused]:bg-primary data-[focused]:text-white',
            )}
          />
        )}
      </DateInput>
    </AriaTimeField>
  )
}
```

- [ ] **Step 2: Typecheck**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: no errors in `time-field.tsx`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/time-field.tsx
git commit -m "feat(ui): string-interfaced React Aria TimeField"
```

---

### Task 5: Migrate date consumers (6 surfaces)

**Files:**
- Modify: `frontend/src/app/onboarding/1/page.tsx`
- Modify: `frontend/src/app/onboarding/doctor/2/page.tsx`
- Modify: `frontend/src/app/onboarding/6/page.tsx`
- Modify: `frontend/src/app/onboarding/doctor/5/page.tsx`
- Modify: `frontend/src/app/dashboard/profile/page.tsx`
- Modify: `frontend/src/app/doctor/profile/page.tsx`

- [ ] **Step 1: `onboarding/1/page.tsx` — birthday**

Remove the `BirthdateInput` import; add:

```tsx
import { DatePicker } from '@/components/ui/date-picker';
import { localTodayISO } from '@/lib/schemas/onboarding.schemas';
```

Replace the `BirthdateInput` Controller render with:

```tsx
<Controller
  control={control}
  name="birthdate"
  render={({ field }) => (
    <DatePicker
      id="ob1-birthdate"
      value={field.value}
      onChange={field.onChange}
      maxDate={localTodayISO()}
    />
  )}
/>
```

- [ ] **Step 2: `onboarding/doctor/2/page.tsx` — PRC expiry**

Add imports:

```tsx
import { Controller } from 'react-hook-form';
import { DatePicker } from '@/components/ui/date-picker';
```

Add `control` to the `useForm` destructure (it currently destructures `register, handleSubmit, setValue, formState`):

```tsx
const {
  register,
  control,
  handleSubmit,
  setValue,
  formState: { errors },
} = useForm<DoctorCredentialsSchema>({ /* unchanged */ });
```

Replace the native expiry input (`<input id="prcLicenseExpiry" type="date" ... />`) with:

```tsx
<Controller
  control={control}
  name="prcLicenseExpiry"
  render={({ field }) => (
    <DatePicker
      id="prcLicenseExpiry"
      value={field.value}
      onChange={field.onChange}
      minDate={today}
    />
  )}
/>
```

(`today` is already defined as `localTodayISO()` at the top of this component.)

- [ ] **Step 3: `onboarding/6/page.tsx` — review-edit birthday**

Add imports:

```tsx
import { DatePicker } from '@/components/ui/date-picker';
import { localTodayISO } from '@/lib/schemas/onboarding.schemas';
```

Replace the birthdate `EditableRow` render (`<input type="date" className={editInputClass} value={d.birthdate} ... />`) with:

```tsx
render={(d, set) => (
  <DatePicker value={d.birthdate} onChange={(v) => set('birthdate', v)} maxDate={localTodayISO()} />
)}
```

- [ ] **Step 4: `onboarding/doctor/5/page.tsx` — review-edit expiry**

Add imports:

```tsx
import { DatePicker } from '@/components/ui/date-picker';
import { localTodayISO } from '@/lib/schemas/onboarding.schemas';
```

Replace the PRC Expiry `EditableRow` render (`<input type="date" className={editInputClass} value={d.prcLicenseExpiry} ... />`) with:

```tsx
render={(d, set) => (
  <DatePicker value={d.prcLicenseExpiry} onChange={(v) => set('prcLicenseExpiry', v)} minDate={localTodayISO()} />
)}
```

- [ ] **Step 5: `dashboard/profile/page.tsx` — birthday**

Add imports:

```tsx
import { DatePicker } from '@/components/ui/date-picker';
import { localTodayISO } from '@/lib/schemas/onboarding.schemas';
```

Replace `<input id="p-birthdate" type="date" ... />` with:

```tsx
<DatePicker id="p-birthdate" value={birthdate} onChange={setBirthdate} maxDate={localTodayISO()} />
```

- [ ] **Step 6: `doctor/profile/page.tsx` — PRC expiry**

Add imports:

```tsx
import { DatePicker } from '@/components/ui/date-picker';
import { localTodayISO } from '@/lib/schemas/onboarding.schemas';
```

Replace `<input id="d-prcExpiry" type="date" ... />` with:

```tsx
<DatePicker id="d-prcExpiry" value={prcLicenseExpiry} onChange={setPrcLicenseExpiry} minDate={localTodayISO()} />
```

- [ ] **Step 7: Typecheck**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: only remaining error is in `app/doctor/schedule/page.tsx` (old DatePicker signature) — fixed in Task 6.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/onboarding/1/page.tsx frontend/src/app/onboarding/doctor/2/page.tsx \
  frontend/src/app/onboarding/6/page.tsx frontend/src/app/onboarding/doctor/5/page.tsx \
  frontend/src/app/dashboard/profile/page.tsx frontend/src/app/doctor/profile/page.tsx
git commit -m "feat(pickers): migrate all date inputs to React Aria DatePicker"
```

---

### Task 6: Migrate schedule (date + 2 time inputs) and remove dead code

**Files:**
- Modify: `frontend/src/app/doctor/schedule/page.tsx`
- Delete: `frontend/src/components/ui/birthdate-input.tsx`
- Modify: `frontend/package.json` (drop `react-day-picker`)

- [ ] **Step 1: `doctor/schedule/page.tsx` — imports**

The old import `import { DatePicker } from "@/components/ui/date-picker";` stays (same path, new component). Add:

```tsx
import { TimeField } from "@/components/ui/time-field";
import { localTodayISO } from "@/lib/schemas/onboarding.schemas";
```

Remove the now-unused `date-fns` imports used only by the old picker. The current line is:

```tsx
import { format, parseISO } from "date-fns";
```

`format` and `parseISO` are used only in the old DatePicker wiring (Step 2). After Step 2 they are unused — delete this import line. (If tsc/lint later reports either is still referenced elsewhere, keep only the referenced one.)

- [ ] **Step 2: Replace the add-slot Date field**

Replace:

```tsx
<DatePicker
  date={formDate ? parseISO(formDate) : undefined}
  setDate={(date) => setFormDate(date ? format(date, "yyyy-MM-dd") : "")}
  placeholder="Pick a date"
  fromDate={new Date()} // Cannot be in the past
/>
```

with:

```tsx
<DatePicker
  value={formDate}
  onChange={setFormDate}
  minDate={localTodayISO()}
/>
```

- [ ] **Step 3: Replace the two time inputs**

Replace the Start Time `<input type="time" ... value={formStartTime} ... />` with:

```tsx
<TimeField value={formStartTime} onChange={setFormStartTime} aria-label="Start time" />
```

Replace the End Time `<input type="time" ... value={formEndTime} ... />` with:

```tsx
<TimeField value={formEndTime} onChange={setFormEndTime} aria-label="End time" />
```

(`handleAddSlot` already builds `new Date(\`${formDate}T${formStartTime}:00\`)` from these strings — no logic change.)

- [ ] **Step 4: Delete the obsolete component**

```bash
git rm frontend/src/components/ui/birthdate-input.tsx
```

- [ ] **Step 5: Remove `react-day-picker` dependency**

Run (from `frontend/`):

```bash
npm uninstall react-day-picker
```

Expected: removed from `dependencies`, lockfile updated.

- [ ] **Step 6: Confirm no stale references**

Run (from `frontend/`):

```bash
grep -rn "react-day-picker\|birthdate-input\|BirthdateInput" src && echo "FOUND - fix before continuing" || echo "clean"
```

Expected: `clean`.

- [ ] **Step 7: Typecheck**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/doctor/schedule/page.tsx frontend/package.json frontend/package-lock.json
git commit -m "feat(pickers): React Aria date/time in schedule; remove react-day-picker + birthdate-input"
```

---

### Task 7: Full build, lint, and manual smoke

**Files:** none (verification only)

- [ ] **Step 1: Production build**

Run (from `frontend/`): `npm run build`
Expected: build succeeds, 0 TypeScript errors, all routes compile.

- [ ] **Step 2: Lint**

Run (from `frontend/`): `npm run lint`
Expected: no errors. Fix any unused-import warnings the migration introduced (e.g. leftover `date-fns` imports in the schedule page).

- [ ] **Step 3: Manual smoke (record results)**

Start the app and verify:
- Birthday (`/onboarding/1`): type a year (e.g. `1990`) directly into the segmented field; open the calendar; confirm dates after today are disabled/unselectable.
- Expiry (`/onboarding/doctor/2`): confirm dates before today are disabled.
- Schedule (`/doctor/schedule`): open "Add Availability Slot" — pick a date (past dates blocked), set start/end via the time field, submit; confirm the slot appears and end-after-start validation still fires when end ≤ start.

- [ ] **Step 4: Commit (if any lint fixes were needed)**

```bash
git add -A
git commit -m "chore(pickers): build/lint cleanup after React Aria migration"
```
