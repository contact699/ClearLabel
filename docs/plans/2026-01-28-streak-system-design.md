# Streak System & Notifications Design

**Date:** 2026-01-28
**Status:** Approved
**Goal:** Increase user retention through daily engagement mechanics

---

## Overview

ClearLabel has strong features but lacks daily engagement hooks. This design adds:
1. A streak system rewarding consecutive daily scans
2. Milestone achievements for long-term motivation
3. Active push notifications (currently configured but inactive)

---

## 1. Streak System — Core Mechanics

### What Counts as a Streak
- At least **1 product scan per day** (barcode or OCR)
- Day resets at **midnight local time**
- Viewing history or other features does NOT count

### Streak Freeze Mechanic
- Users get **1 free freeze per week** (resets Sunday midnight)
- Maximum **2 freezes banked** at any time
- Auto-applied if user misses a day and has a freeze available
- Notification sent when freeze is used

### Milestones

| Days | Badge ID | Badge Name | Icon |
|------|----------|-----------|------|
| 3 | `streak_3` | Getting Started | 🌱 |
| 7 | `streak_7` | One Week Strong | 🔥 |
| 14 | `streak_14` | Two Week Warrior | ⚡ |
| 30 | `streak_30` | Monthly Master | 🏆 |
| 60 | `streak_60` | Dedicated Scanner | 💎 |
| 100 | `streak_100` | Century Club | 👑 |

---

## 2. Data Model

### New Store: `streakStore.ts`

```typescript
interface StreakState {
  // Data
  currentStreak: number;
  longestStreak: number;
  lastScanDate: string | null;      // 'YYYY-MM-DD' format
  streakFreezes: number;            // 0-2
  freezeUsedThisWeek: boolean;
  weekStartDate: string | null;     // For tracking weekly freeze reset
  milestones: string[];             // Array of achieved milestone IDs

  // Actions
  recordScan: () => void;           // Called after successful scan
  checkAndUpdateStreak: () => void; // Called on app open
  useFreeze: () => void;
  resetWeeklyFreeze: () => void;
  getMilestoneProgress: () => MilestoneProgress[];
}

interface MilestoneProgress {
  id: string;
  name: string;
  icon: string;
  daysRequired: number;
  achieved: boolean;
  achievedDate?: string;
}
```

### Persistence
- Use Zustand `persist` middleware with AsyncStorage
- Same pattern as existing stores (userStore, historyStore)

---

## 3. UI/UX Design

### Home Screen — Streak Card

New card appears below greeting, above quick-scan button:

```
┌─────────────────────────────────────────┐
│  🔥 12 Day Streak                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  [🌱] [🔥] [⚡] [ ] [ ] [ ]              │
│                                         │
│  ❄️ 1 freeze available                  │
│  Scan today to keep it going!    ✓ Done │
└─────────────────────────────────────────┘
```

### Visual States

| State | Appearance |
|-------|------------|
| Not scanned today | Pulsing animation, "Scan today to keep it going!" |
| Scanned today | Checkmark, green tint, "You're all set for today!" |
| Streak lost | Muted colors, "Start a new streak today" |
| New user (0 streak) | Encouraging, "Start your first streak!" |

### Animations

| Trigger | Animation |
|---------|-----------|
| Scan completed | Fire icon scale-up bounce + haptic feedback |
| Milestone achieved | Confetti burst + celebration modal |
| Freeze used | Snowflake animation + toast notification |
| Streak lost | Subtle shake + sad state transition |

### Profile Screen — Achievements Section

New section in Profile tab:
- Current streak with fire icon
- Longest streak (personal best)
- Grid of milestone badges (grayed out if unearned)
- Streak freezes remaining with snowflake icon

---

## 4. Notification System

### Current State
Notification preferences exist in `userStore.notificationPreferences` but are not wired to send actual notifications.

### Notifications to Implement

#### 4.1 Streak Reminder
- **Trigger:** 7 PM local time if user hasn't scanned today
- **Condition:** `currentStreak > 0` AND `dailyReminder` enabled
- **Message:** "🔥 Don't lose your [X]-day streak! Scan something before midnight."

#### 4.2 Streak Lost
- **Trigger:** Morning after missed day (no freeze available)
- **Message:** "Your streak ended at [X] days. Start fresh today!"

#### 4.3 Milestone Achieved
- **Trigger:** Immediately when milestone reached (if app backgrounded)
- **Message:** "🏆 Amazing! You just hit a [X]-day streak!"

#### 4.4 Streak Freeze Used
- **Trigger:** When freeze auto-applied
- **Message:** "❄️ Your streak was saved! You have [X] freezes left."

#### 4.5 Weekly Digest (existing preference)
- **Trigger:** Sunday 9 AM
- **Message:** "This week: [X] scans, [Y] safe products. Your streak: [Z] days 🔥"

### Technical Implementation

```typescript
// src/lib/services/notifications.ts

import * as Notifications from 'expo-notifications';

export async function scheduleStreakReminder(currentStreak: number): Promise<void>;
export async function cancelStreakReminder(): Promise<void>;
export async function sendMilestoneNotification(milestone: string): Promise<void>;
export async function sendStreakLostNotification(finalStreak: number): Promise<void>;
export async function scheduleWeeklyDigest(): Promise<void>;
export async function requestNotificationPermissions(): Promise<boolean>;
```

### Permission Flow
1. Do NOT prompt during onboarding (too early, low conversion)
2. Prompt after first successful scan with context: "Want reminders to keep your streak going?"
3. If declined, show subtle banner on home: "Enable notifications to protect your streak"
4. Re-prompt option in Profile → Settings

---

## 5. Integration Points

| File | Integration |
|------|-------------|
| `src/lib/stores/streakStore.ts` | New store (create) |
| `src/lib/stores/index.ts` | Export new store |
| `src/lib/services/notifications.ts` | New service (create) |
| `src/app/(tabs)/scan.tsx` | Call `recordScan()` after successful scan |
| `src/app/(tabs)/index.tsx` | Add StreakCard component |
| `src/app/(tabs)/profile.tsx` | Add Achievements section |
| `src/app/_layout.tsx` | Call `checkAndUpdateStreak()` on mount |
| `src/components/StreakCard.tsx` | New component (create) |
| `src/components/MilestoneModal.tsx` | New component (create) |
| `src/components/AchievementsSection.tsx` | New component (create) |

---

## 6. Streak Logic Flowchart

```
App Opens
    │
    ▼
checkAndUpdateStreak()
    │
    ├─ Get today's date (YYYY-MM-DD)
    │
    ├─ Is lastScanDate === today?
    │   └─ YES → Do nothing (already scanned today)
    │
    ├─ Is lastScanDate === yesterday?
    │   └─ YES → Streak continues (awaiting today's scan)
    │
    ├─ Is lastScanDate older than yesterday?
    │   │
    │   ├─ Has freeze available?
    │   │   ├─ YES → Use freeze, keep streak, notify user
    │   │   └─ NO → Reset streak to 0, notify user
    │
    └─ Check week rollover → Reset freezeUsedThisWeek, grant freeze if < 2

User Scans Product
    │
    ▼
recordScan()
    │
    ├─ Update lastScanDate to today
    │
    ├─ Is this first scan today?
    │   └─ YES → Increment currentStreak
    │
    ├─ Is currentStreak > longestStreak?
    │   └─ YES → Update longestStreak
    │
    ├─ Check milestone thresholds
    │   └─ New milestone? → Add to milestones[], trigger celebration
    │
    └─ Cancel today's streak reminder notification
```

---

## 7. File Structure

```
src/
├── lib/
│   ├── stores/
│   │   ├── streakStore.ts      ← NEW
│   │   └── index.ts            ← UPDATE (export streakStore)
│   └── services/
│       └── notifications.ts    ← NEW
├── components/
│   ├── StreakCard.tsx          ← NEW
│   ├── MilestoneModal.tsx      ← NEW
│   └── AchievementsSection.tsx ← NEW
└── app/
    ├── _layout.tsx             ← UPDATE (init streak check)
    └── (tabs)/
        ├── index.tsx           ← UPDATE (add StreakCard)
        ├── scan.tsx            ← UPDATE (call recordScan)
        └── profile.tsx         ← UPDATE (add Achievements)
```

---

## 8. Success Metrics

| Metric | Target |
|--------|--------|
| Daily Active Users | +30% within 30 days |
| 7-day retention | +20% |
| Average streak length | 5+ days |
| Notification opt-in rate | 60%+ |

---

## 9. Future Enhancements (Out of Scope)

- Streak leaderboards (friends/global)
- Streak recovery via watching ad
- Premium streak features (longer freeze bank)
- Streak sharing to social media
- Weekly challenges layered on top

---

## Approved By

- User: 2026-01-28
