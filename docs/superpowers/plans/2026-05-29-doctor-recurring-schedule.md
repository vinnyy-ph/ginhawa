# Doctor Recurring Weekly Schedule Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a doctor generate a full set of bookable availability slots from a weekly template (weekdays + daily time range + slot length + optional break + week horizon) in one submit.

**Architecture:** Frontend computes the concrete slot instants (owns Asia/Manila → UTC math, matching the existing single-add) and posts them to a new thin `POST /doctors/slots/bulk` endpoint. The backend validates, skips slots that overlap existing or in-batch slots, batch-inserts the survivors, and returns `{ created, skipped }`. Single-add stays unchanged.

**Tech Stack:** NestJS + Prisma 7 + class-validator (backend, jest tests); Next.js + React + TypeScript (frontend, no test runner — verified via `build`/`lint`).

> **Note on testing:** The frontend project has no test runner (no jest/vitest, no FE test files). Per project simplicity rules we do NOT add one. `generateSlots` is written as a pure exported function and verified through `npm run build` + `npm run lint` and the manual verification in Task 6. Backend keeps full TDD with jest.

> **Note for the engineer:** `frontend/AGENTS.md` warns this Next.js version has breaking changes — consult `node_modules/next/dist/docs/` before writing framework-level code. The frontend tasks here only touch a client component, shared UI primitives, and a pure helper, so no new framework APIs are introduced.

---

## File Structure

**Backend**
- Create: `backend/src/slots/dto/create-bulk-slots.dto.ts` — request DTO for the batch.
- Modify: `backend/src/slots/slots.service.ts` — add `createBulk(userId, slots)`.
- Modify: `backend/src/slots/slots.controller.ts` — add `POST /doctors/slots/bulk`.
- Create: `backend/src/slots/slots.service.spec.ts` — unit tests for `createBulk`.

**Frontend**
- Create: `frontend/src/lib/generate-slots.ts` — pure `WeeklyTemplate` → slot-pairs helper.
- Modify: `frontend/src/app/doctor/schedule/page.tsx` — add "Set weekly schedule" panel + bulk submit.
- Modify: `frontend/src/types/api.ts` — add `BulkSlotsResult` type (optional, see Task 5).

---

## Task 1: Bulk slots DTO

**Files:**
- Create: `backend/src/slots/dto/create-bulk-slots.dto.ts`

- [ ] **Step 1: Write the DTO**

```ts
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';

export class SlotInputDto {
  @IsNotEmpty()
  @IsDateString()
  startTime: string;

  @IsNotEmpty()
  @IsDateString()
  endTime: string;
}

export class CreateBulkSlotsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => SlotInputDto)
  slots: SlotInputDto[];
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/slots/dto/create-bulk-slots.dto.ts
git commit -m "feat(slots): add CreateBulkSlotsDto for batch slot creation"
```

---

## Task 2: `SlotsService.createBulk` (TDD)

**Files:**
- Test: `backend/src/slots/slots.service.spec.ts`
- Modify: `backend/src/slots/slots.service.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/slots/slots.service.spec.ts`:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { SlotsService } from './slots.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('SlotsService.createBulk', () => {
  let service: SlotsService;

  const mockPrisma = {
    doctorProfile: { findUnique: jest.fn() },
    availabilitySlot: { findMany: jest.fn(), createMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlotsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<SlotsService>(SlotsService);
  });

  const candidates = [
    { startTime: '2026-06-01T01:00:00.000Z', endTime: '2026-06-01T02:00:00.000Z' },
    { startTime: '2026-06-01T02:00:00.000Z', endTime: '2026-06-01T03:00:00.000Z' },
  ];

  it('throws when the doctor profile is missing', async () => {
    mockPrisma.doctorProfile.findUnique.mockResolvedValue(null);
    await expect(service.createBulk('user-1', candidates)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('inserts all candidates when none overlap', async () => {
    mockPrisma.doctorProfile.findUnique.mockResolvedValue({ id: 'doctor-1' });
    mockPrisma.availabilitySlot.findMany.mockResolvedValue([]);
    mockPrisma.availabilitySlot.createMany.mockResolvedValue({ count: 2 });

    const result = await service.createBulk('user-1', candidates);

    expect(result).toEqual({ created: 2, skipped: 0 });
    expect(mockPrisma.availabilitySlot.createMany).toHaveBeenCalledWith({
      data: [
        { doctorId: 'doctor-1', startTime: new Date(candidates[0].startTime), endTime: new Date(candidates[0].endTime) },
        { doctorId: 'doctor-1', startTime: new Date(candidates[1].startTime), endTime: new Date(candidates[1].endTime) },
      ],
    });
  });

  it('skips candidates overlapping an existing slot', async () => {
    mockPrisma.doctorProfile.findUnique.mockResolvedValue({ id: 'doctor-1' });
    mockPrisma.availabilitySlot.findMany.mockResolvedValue([
      { startTime: new Date('2026-06-01T01:30:00.000Z'), endTime: new Date('2026-06-01T02:30:00.000Z') },
    ]);
    mockPrisma.availabilitySlot.createMany.mockResolvedValue({ count: 0 });

    const result = await service.createBulk('user-1', candidates);

    expect(result).toEqual({ created: 0, skipped: 2 });
  });

  it('skips a candidate overlapping an earlier accepted candidate in the same batch', async () => {
    mockPrisma.doctorProfile.findUnique.mockResolvedValue({ id: 'doctor-1' });
    mockPrisma.availabilitySlot.findMany.mockResolvedValue([]);
    mockPrisma.availabilitySlot.createMany.mockResolvedValue({ count: 1 });

    const dup = [
      { startTime: '2026-06-01T01:00:00.000Z', endTime: '2026-06-01T02:00:00.000Z' },
      { startTime: '2026-06-01T01:30:00.000Z', endTime: '2026-06-01T02:30:00.000Z' },
    ];
    const result = await service.createBulk('user-1', dup);

    expect(result).toEqual({ created: 1, skipped: 1 });
  });

  it('skips candidates with startTime >= endTime', async () => {
    mockPrisma.doctorProfile.findUnique.mockResolvedValue({ id: 'doctor-1' });
    mockPrisma.availabilitySlot.findMany.mockResolvedValue([]);
    mockPrisma.availabilitySlot.createMany.mockResolvedValue({ count: 0 });

    const bad = [
      { startTime: '2026-06-01T02:00:00.000Z', endTime: '2026-06-01T01:00:00.000Z' },
    ];
    const result = await service.createBulk('user-1', bad);

    expect(result).toEqual({ created: 0, skipped: 1 });
    expect(mockPrisma.availabilitySlot.createMany).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest slots.service`
Expected: FAIL — `service.createBulk is not a function`.

- [ ] **Step 3: Implement `createBulk`**

In `backend/src/slots/slots.service.ts`, add the import at top:

```ts
import { CreateBulkSlotsDto } from './dto/create-bulk-slots.dto';
```

Add this method inside the `SlotsService` class (after `create`):

```ts
async createBulk(userId: string, slots: CreateBulkSlotsDto['slots']) {
  const doctor = await this.prisma.doctorProfile.findUnique({
    where: { userId },
  });

  if (!doctor) {
    throw new NotFoundException('Doctor profile not found');
  }

  // Parse + drop invalid (start >= end).
  const parsed = slots
    .map((s) => ({ start: new Date(s.startTime), end: new Date(s.endTime) }))
    .filter((s) => s.start < s.end);

  if (parsed.length === 0) {
    return { created: 0, skipped: slots.length };
  }

  const min = new Date(Math.min(...parsed.map((s) => s.start.getTime())));
  const max = new Date(Math.max(...parsed.map((s) => s.end.getTime())));

  const existing = await this.prisma.availabilitySlot.findMany({
    where: {
      doctorId: doctor.id,
      AND: [{ startTime: { lt: max } }, { endTime: { gt: min } }],
    },
    select: { startTime: true, endTime: true },
  });

  const overlaps = (
    aStart: Date,
    aEnd: Date,
    bStart: Date,
    bEnd: Date,
  ) => aStart < bEnd && aEnd > bStart;

  const accepted: { doctorId: string; startTime: Date; endTime: Date }[] = [];

  for (const cand of parsed) {
    const clashesExisting = existing.some((e) =>
      overlaps(cand.start, cand.end, e.startTime, e.endTime),
    );
    const clashesBatch = accepted.some((a) =>
      overlaps(cand.start, cand.end, a.startTime, a.endTime),
    );
    if (clashesExisting || clashesBatch) continue;
    accepted.push({
      doctorId: doctor.id,
      startTime: cand.start,
      endTime: cand.end,
    });
  }

  if (accepted.length > 0) {
    await this.prisma.availabilitySlot.createMany({ data: accepted });
  }

  return { created: accepted.length, skipped: slots.length - accepted.length };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest slots.service`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/slots/slots.service.ts backend/src/slots/slots.service.spec.ts
git commit -m "feat(slots): add createBulk with overlap skip and batch dedupe"
```

---

## Task 3: Bulk endpoint on the controller

**Files:**
- Modify: `backend/src/slots/slots.controller.ts`

- [ ] **Step 1: Add the import**

Add to the existing import line for DTOs near the top:

```ts
import { CreateBulkSlotsDto } from './dto/create-bulk-slots.dto';
```

- [ ] **Step 2: Add the route**

Insert after the existing `create` handler (the `@Post('slots')` block):

```ts
@Post('slots/bulk')
@Roles('DOCTOR')
createBulk(
  @Request() req: { user: { id: string } },
  @Body() dto: CreateBulkSlotsDto,
) {
  return this.slotsService.createBulk(req.user.id, dto.slots);
}
```

- [ ] **Step 3: Verify build + full backend tests**

Run: `cd backend && npx tsc --noEmit && npx jest`
Expected: compiles, all suites pass.

- [ ] **Step 4: Commit**

```bash
git add backend/src/slots/slots.controller.ts
git commit -m "feat(slots): expose POST /doctors/slots/bulk endpoint"
```

---

## Task 4: `generateSlots` pure helper (frontend)

**Files:**
- Create: `frontend/src/lib/generate-slots.ts`

- [ ] **Step 1: Write the helper**

```ts
export interface WeeklyTemplate {
  /** 0 = Sunday … 6 = Saturday */
  weekdays: number[];
  /** 'YYYY-MM-DD' local start date */
  startDate: string;
  /** number of weeks to generate, 1–12 */
  weeks: number;
  /** 'HH:mm' daily window start */
  dayStart: string;
  /** 'HH:mm' daily window end */
  dayEnd: string;
  /** slot length in minutes (e.g. 30, 60) */
  slotMinutes: number;
  /** optional break window skipped during generation */
  breakWindow?: { start: string; end: string } | null;
}

export interface GeneratedSlot {
  startTime: string; // ISO
  endTime: string; // ISO
}

function parseHM(hm: string): { h: number; m: number } {
  const [h, m] = hm.split(':').map(Number);
  return { h, m };
}

/**
 * Expand a weekly template into concrete bookable slot instants.
 * Builds Date objects in local time (matching the single-add form), so the
 * resulting ISO strings carry the correct Asia/Manila → UTC offset.
 * Skips slots that fall in the past or overlap the break window. A trailing
 * partial slot (window not divisible by slotMinutes) is dropped.
 */
export function generateSlots(t: WeeklyTemplate): GeneratedSlot[] {
  const result: GeneratedSlot[] = [];
  if (t.weekdays.length === 0 || t.weeks < 1) return result;

  const { h: startH, m: startM } = parseHM(t.dayStart);
  const { h: endH, m: endM } = parseHM(t.dayEnd);
  const brk = t.breakWindow
    ? { s: parseHM(t.breakWindow.start), e: parseHM(t.breakWindow.end) }
    : null;

  const now = Date.now();
  const totalDays = t.weeks * 7;
  const base = new Date(`${t.startDate}T00:00:00`);

  for (let offset = 0; offset < totalDays; offset++) {
    const day = new Date(base);
    day.setDate(base.getDate() + offset);
    if (!t.weekdays.includes(day.getDay())) continue;

    const y = day.getFullYear();
    const mo = day.getMonth();
    const d = day.getDate();

    const dayEnd = new Date(y, mo, d, endH, endM, 0, 0);
    let cursor = new Date(y, mo, d, startH, startM, 0, 0);

    const breakStart = brk ? new Date(y, mo, d, brk.s.h, brk.s.m, 0, 0) : null;
    const breakEnd = brk ? new Date(y, mo, d, brk.e.h, brk.e.m, 0, 0) : null;

    while (true) {
      const slotEnd = new Date(cursor.getTime() + t.slotMinutes * 60000);
      if (slotEnd > dayEnd) break;

      const inPast = cursor.getTime() < now;
      const inBreak =
        breakStart !== null &&
        breakEnd !== null &&
        cursor < breakEnd &&
        slotEnd > breakStart;

      if (!inPast && !inBreak) {
        result.push({
          startTime: cursor.toISOString(),
          endTime: slotEnd.toISOString(),
        });
      }
      cursor = slotEnd;
    }
  }

  return result;
}
```

- [ ] **Step 2: Verify it compiles + lints**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/generate-slots.ts
git commit -m "feat(schedule): add generateSlots weekly-template helper"
```

---

## Task 5: Template builder panel + bulk submit

**Files:**
- Modify: `frontend/src/app/doctor/schedule/page.tsx`

- [ ] **Step 1: Add imports + bulk-result type**

At the top of `page.tsx`, add to the existing imports:

```ts
import { Chip } from "@/components/ui/chip";
import { generateSlots, type WeeklyTemplate } from "@/lib/generate-slots";
```

- [ ] **Step 2: Add template state**

Inside the component, alongside the existing single-add form state, add:

```ts
const [showTemplate, setShowTemplate] = useState(false);
const [tplWeekdays, setTplWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
const [tplStartDate, setTplStartDate] = useState("");
const [tplWeeks, setTplWeeks] = useState(4);
const [tplDayStart, setTplDayStart] = useState("09:00");
const [tplDayEnd, setTplDayEnd] = useState("17:00");
const [tplSlotMinutes, setTplSlotMinutes] = useState(60);
const [tplBreakOn, setTplBreakOn] = useState(false);
const [tplBreakStart, setTplBreakStart] = useState("12:00");
const [tplBreakEnd, setTplBreakEnd] = useState("13:00");
const [tplSubmitting, setTplSubmitting] = useState(false);
const [tplError, setTplError] = useState<string | null>(null);
```

- [ ] **Step 3: Add the template object + live preview + submit handler**

Add inside the component, before `return`:

```ts
const template: WeeklyTemplate = useMemo(
  () => ({
    weekdays: tplWeekdays,
    startDate: tplStartDate,
    weeks: tplWeeks,
    dayStart: tplDayStart,
    dayEnd: tplDayEnd,
    slotMinutes: tplSlotMinutes,
    breakWindow: tplBreakOn
      ? { start: tplBreakStart, end: tplBreakEnd }
      : null,
  }),
  [tplWeekdays, tplStartDate, tplWeeks, tplDayStart, tplDayEnd, tplSlotMinutes, tplBreakOn, tplBreakStart, tplBreakEnd],
);

const previewSlots = useMemo(
  () => (tplStartDate ? generateSlots(template) : []),
  [template, tplStartDate],
);

async function handleGenerate(e: React.FormEvent) {
  e.preventDefault();
  if (!token || !profile) return;
  setTplError(null);

  if (tplDayEnd <= tplDayStart) {
    setTplError("Day end time must be after start time");
    return;
  }
  if (tplBreakOn && tplBreakEnd <= tplBreakStart) {
    setTplError("Break end time must be after break start time");
    return;
  }
  if (previewSlots.length === 0) {
    setTplError("This template generates no slots. Check your inputs.");
    return;
  }

  try {
    setTplSubmitting(true);
    const result = await apiRequest<{ created: number; skipped: number }>(
      "/doctors/slots/bulk",
      { method: "POST", token, body: { slots: previewSlots } },
    );
    const msg =
      result.skipped > 0
        ? `${result.created} slots added, ${result.skipped} skipped`
        : `${result.created} slots added`;
    setToastMessage(msg);
    setShowTemplate(false);
    await fetchSlots(profile.id);
  } catch (err) {
    setTplError(err instanceof Error ? err.message : "Failed to generate slots");
  } finally {
    setTplSubmitting(false);
  }
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function toggleWeekday(d: number) {
  setTplWeekdays((prev) =>
    prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
  );
}
```

- [ ] **Step 4: Add the "Set weekly schedule" trigger button**

In the header action area (next to the existing `Add Availability Slot` button at `page.tsx:214`), add a second button:

```tsx
<Button
  variant="outline"
  onClick={() => setShowTemplate(!showTemplate)}
  className="shrink-0 gap-2"
>
  {showTemplate ? "Cancel" : <><ClockIcon className="w-4 h-4" /> Set weekly schedule</>}
</Button>
```

- [ ] **Step 5: Add the template panel**

Render this block directly after the existing single-add form block (after its closing `)}` around `page.tsx:257`):

```tsx
{showTemplate && (
  <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 overflow-hidden mb-8 animate-in slide-in-from-top-4 fade-in duration-300">
    <div className="bg-gradient-to-r from-[#48cab6]/10 to-[#31a795]/10 px-6 py-4 border-b border-outline-variant/30 flex items-center gap-2">
      <ClockIcon className="w-5 h-5 text-primary" />
      <h3 className="font-serif text-lg font-bold text-text-primary">Set Weekly Schedule</h3>
    </div>
    <form onSubmit={handleGenerate} className="p-6 space-y-6">
      <div>
        <label className="block text-sm font-semibold text-text-primary mb-2">Days of week</label>
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_LABELS.map((label, d) => (
            <Chip key={d} selected={tplWeekdays.includes(d)} onClick={() => toggleWeekday(d)}>
              {label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-1">Day start</label>
          <TimeField value={tplDayStart} onChange={setTplDayStart} aria-label="Day start time" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-1">Day end</label>
          <TimeField value={tplDayEnd} onChange={setTplDayEnd} aria-label="Day end time" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-1">Slot length</label>
          <select
            value={tplSlotMinutes}
            onChange={(e) => setTplSlotMinutes(Number(e.target.value))}
            className="w-full h-11 px-3 rounded-lg border border-outline-variant bg-surface-white text-text-primary"
          >
            <option value={30}>30 minutes</option>
            <option value={60}>60 minutes</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-1">Repeat for (weeks)</label>
          <input
            type="number"
            min={1}
            max={12}
            value={tplWeeks}
            onChange={(e) => setTplWeeks(Math.min(12, Math.max(1, Number(e.target.value))))}
            className="w-full h-11 px-3 rounded-lg border border-outline-variant bg-surface-white text-text-primary"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-text-primary mb-1">Start date</label>
        <DatePicker value={tplStartDate} onChange={setTplStartDate} minDate={localTodayISO()} />
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-text-primary mb-2">
          <input type="checkbox" checked={tplBreakOn} onChange={(e) => setTplBreakOn(e.target.checked)} />
          Add a daily break (skipped)
        </label>
        {tplBreakOn && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Break start</label>
              <TimeField value={tplBreakStart} onChange={setTplBreakStart} aria-label="Break start time" />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Break end</label>
              <TimeField value={tplBreakEnd} onChange={setTplBreakEnd} aria-label="Break end time" />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 pt-2 border-t border-outline-variant/30">
        <p className="text-sm text-on-surface-variant">
          {tplStartDate ? <>This will create <span className="font-semibold text-text-primary">{previewSlots.length}</span> slots.</> : "Pick a start date to preview."}
        </p>
        <Button type="submit" disabled={tplSubmitting || previewSlots.length === 0} className="min-w-[140px]">
          {tplSubmitting ? "Generating..." : "Generate slots"}
        </Button>
      </div>

      {tplError && <p className="text-error text-sm">{tplError}</p>}
    </form>
  </div>
)}
```

- [ ] **Step 6: Verify build + lint**

Run: `cd frontend && npx tsc --noEmit && npm run lint && npm run build`
Expected: compiles, lints clean, build succeeds.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/doctor/schedule/page.tsx
git commit -m "feat(schedule): add weekly-template bulk slot generator UI"
```

---

## Task 6: End-to-end manual verification

**Files:** none (verification only).

- [ ] **Step 1: Start backend + frontend**

Run backend and frontend dev servers per project conventions.

- [ ] **Step 2: Verify the happy path**

As a doctor, open `/doctor/schedule` → "Set weekly schedule" → Mon–Fri, 09:00–17:00, 60 min, break 12:00–13:00, start date = next Monday, 2 weeks.
- Preview shows `70` slots (Mon–Fri × 2 weeks × 7 slots/day, lunch 12–1 excluded).
- Click "Generate slots" → toast `70 slots added` → grid populates grouped by date, no slot spanning 12:00–13:00.

- [ ] **Step 3: Verify idempotency / skip-report**

Re-run the exact same template → toast `0 slots added, 70 skipped`; grid unchanged.

- [ ] **Step 4: Verify empty/guard states**

Deselect all weekdays → preview `0`, Generate disabled. Set day end before day start → inline error on submit.

---

## Self-Review Notes

- **Spec coverage:** bulk endpoint (T1–T3), FE generator (T4), template UI + preview + skip-report toast (T5), validation/edges (T5 guards + T2 invalid-skip test), manual E2E (T6). Backend overlap-skip + in-batch dedupe + ownership all covered by T2 tests.
- **Deviation from spec:** spec listed FE unit tests for `generateSlots`; the frontend has no test runner, so per project simplicity rules `generateSlots` is pure + verified via build/lint/manual (documented in header note). `createMany` is used directly instead of a `$transaction` wrapper — `createMany` is already a single atomic statement, so the wrapper added nothing.
- **Type consistency:** `WeeklyTemplate`/`GeneratedSlot` (T4) match the usage in T5; bulk response `{ created, skipped }` matches service return (T2) and FE `apiRequest` generic (T5).
