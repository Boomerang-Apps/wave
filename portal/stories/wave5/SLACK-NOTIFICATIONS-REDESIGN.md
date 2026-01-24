# Slack Notifications Tab Redesign

**Story ID:** WAVE5-SLACK-001
**Priority:** High
**Status:** Ready for Implementation
**Date:** 2026-01-24

---

## Overview

Redesign the Notifications tab (Tab 8) to match the Infrastructure tab's proven UX pattern, providing consistent user experience across all validation and configuration tabs.

---

## Current State vs Target State

### Current Notifications Tab (Before)

```
┌─────────────────────────────────────────────────────────────────┐
│ NOTIFICATIONS    Slack & Dozzle Testing                         │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🔔 Slack Notifications              [Webhook Configured]    │ │
│ │    Test different notification types                        │ │
│ │                                                             │ │
│ │  ┌──────────────┐  ┌──────────────┐                        │ │
│ │  │ 1. Ping Test │  │ 2. Story     │                        │ │
│ │  │ [Send Ping]  │  │ [Test Story] │                        │ │
│ │  └──────────────┘  └──────────────┘                        │ │
│ │  (6 test buttons total)                                     │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 👁 Dozzle Log Viewer                                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 📜 Recent Notifications (history list)                       │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Problems:**
- No info box explaining purpose and importance
- No validation progress indicator
- No download guide for troubleshooting
- Inconsistent with other tabs
- Missing channel routing configuration
- No notification delivery statistics

---

### Target Notifications Tab (After)

```
┌─────────────────────────────────────────────────────────────────┐
│ NOTIFICATIONS    Slack Feedback Loop                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌─ INFO BOX (Subtle gray bg, purple icon only) ────────────────┐│
│ │ 🔔 Slack Feedback Loop                                        ││
│ │ Real-time notifications keep your team informed about WAVE   ││
│ │ automation progress. Configure webhooks for different        ││
│ │ channels: #wave-updates (info), #wave-alerts (critical),     ││
│ │ #wave-budget (cost alerts).                                  ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│ ┌─ VALIDATION CTA (White bg, black buttons) ───────────────────┐│
│ │ ✅ Notifications Ready      [Download Guide]  [■ Validate]   ││
│ │    All notification channels configured        (outline)  (black) ││
│ │    Last validated: 12:50:42 PM                               ││
│ │                                                              ││
│ │    Progress  ████████████████░░░░  83%    5✓  0✗  1⚠        ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│ ┌─ CHANNEL ROUTING ────────────────────────────────────────────┐│
│ │ 📢 Channel Routing                                            ││
│ │                                                              ││
│ │  Channel          Status              Action                 ││
│ │  ─────────────────────────────────────────────────────────  ││
│ │  #wave-updates    [● Active]          [Test]  ← outline btn ││
│ │  #wave-alerts     [● Active]          [Test]                ││
│ │  #wave-budget     [○ Not Set]         [Setup] ← outline btn ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│ ┌─ TEST NOTIFICATIONS ─────────────────────────────────────────┐│
│ │ 🧪 Test Notifications                                         ││
│ │                                                              ││
│ │  INFO                        ALERTS                          ││
│ │  ┌───────────────────┐      ┌───────────────────┐           ││
│ │  │ 📋 Story Started  │      │ 🚨 Escalation     │           ││
│ │  │ [■ Send Test]     │      │ [■ Send Test]     │  ← black  ││
│ │  └───────────────────┘      └───────────────────┘           ││
│ │  ┌───────────────────┐      ┌───────────────────┐           ││
│ │  │ ✅ Gate Passed    │      │ 💰 Budget Warning │           ││
│ │  │ [■ Send Test]     │      │ [■ Send Test]     │           ││
│ │  └───────────────────┘      └───────────────────┘           ││
│ │  ┌───────────────────┐      ┌───────────────────┐           ││
│ │  │ 🎉 Story Complete │      │ 🛑 E-STOP         │           ││
│ │  │ [■ Send Test]     │      │ [■ Send Test]     │           ││
│ │  └───────────────────┘      └───────────────────┘           ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│ ┌─ DELIVERY STATS ─────────────────────────────────────────────┐│
│ │ 📊 Last 24 Hours                                              ││
│ │                                                              ││
│ │   47 Sent    98% Success    230ms Avg                        ││
│ │   ───────────────────────────────────                        ││
│ │   Story (23)  Gate (12)  Alert (8)  Budget (4)              ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│ ┌─ RECENT NOTIFICATIONS ───────────────────────────────────────┐│
│ │ 📜 History                               [Clear] ← ghost btn ││
│ │                                                              ││
│ │  ✅  Story Started   STORY-001   12:50 PM   #updates        ││
│ │  ✅  Gate Passed     Gate 3      12:48 PM   #updates        ││
│ │  ⚠️  Budget Warning  85%         12:45 PM   #budget         ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│ ┌─ DOZZLE (Secondary section) ─────────────────────────────────┐│
│ │ 👁 Container Logs     [Check Status]  [Open Dozzle ↗]        ││
│ │                        (outline)       (outline)             ││
│ └──────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘

BUTTON LEGEND:
[■ Text]  = Black button (bg-zinc-900)
[Text]    = Outline button (border-zinc-200)
[Text]    = Ghost button (text only, hover effect)
```

---

## Design Pattern Components

### Color Philosophy

**Minimal color usage:**
- Colors ONLY on icons and status badges
- All buttons: Black (primary) or outline (secondary)
- Backgrounds: White or subtle zinc tones
- Text: Zinc-900 (headings), Zinc-600 (body), Zinc-400 (muted)

### 1. Info Box (Subtle design)

```tsx
<div className="p-5 bg-zinc-50 border border-zinc-200 rounded-2xl mb-6">
  <div className="flex items-start gap-4">
    {/* Icon gets the color */}
    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
      <Bell className="h-5 w-5 text-purple-600" />
    </div>
    <div>
      {/* Text stays neutral */}
      <h3 className="font-semibold text-zinc-900 mb-1">Slack Feedback Loop</h3>
      <p className="text-sm text-zinc-600 leading-relaxed">
        Real-time notifications keep your team informed about WAVE automation progress...
      </p>
      <p className="text-xs text-zinc-500 mt-2">
        Test each notification type below to verify delivery works correctly.
      </p>
    </div>
  </div>
</div>
```

### 2. Validation CTA with Progress

```tsx
<div className="p-6 border border-zinc-200 rounded-2xl mb-6 bg-white">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-4">
      {/* Only the icon gets color */}
      <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center">
        <CheckCircle2 className="h-6 w-6 text-green-600" /> {/* Status color on icon only */}
      </div>
      <div>
        <h3 className="font-semibold text-lg text-zinc-900">{statusTitle}</h3>
        <p className="text-sm text-zinc-500">{statusDescription}</p>
        <p className="text-xs text-zinc-400 mt-1">Last validated: {timestamp}</p>
      </div>
    </div>
    <div className="flex items-center gap-3">
      {/* Secondary button - outline style */}
      <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:text-zinc-900 border border-zinc-200 hover:border-zinc-300 rounded-xl transition-colors">
        <Download className="h-4 w-4" />
        Download Guide (.md)
      </button>
      {/* Primary button - black */}
      <button className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-medium transition-colors">
        <Play className="h-4 w-4" />
        {validated ? 'Re-validate' : 'Validate'}
      </button>
    </div>
  </div>

  {/* Progress Bar - subtle colors */}
  <div className="mt-6 pt-6 border-t border-zinc-100">
    <ProgressBar passed={5} failed={0} warnings={1} />
  </div>
</div>
```

### 3. Button Styles

```tsx
// Primary Button - Black
<button className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-sm font-medium transition-colors">
  Action
</button>

// Secondary Button - Outline
<button className="px-4 py-2.5 border border-zinc-200 hover:border-zinc-300 text-zinc-600 hover:text-zinc-900 rounded-xl text-sm font-medium transition-colors">
  Secondary
</button>

// Ghost Button - Text only
<button className="px-4 py-2.5 text-zinc-500 hover:text-zinc-900 text-sm font-medium transition-colors">
  Tertiary
</button>
```

### 4. Status Badges (Only place for color)

```tsx
// Success badge
<span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
  Active
</span>

// Warning badge
<span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
  Warning
</span>

// Error badge
<span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
  Failed
</span>

// Neutral badge
<span className="px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">
  Pending
</span>
```

### 3. Download Guide Function

```tsx
const downloadNotificationGuide = () => {
  const guide = `# Slack Notification Troubleshooting Guide
Generated: ${new Date().toISOString()}
Project: ${project?.name}

## Configuration Status
${notificationChecks.map(c => `- [${c.status === 'pass' ? 'x' : ' '}] ${c.name}: ${c.message}`).join('\n')}

## Webhook Setup
1. Go to https://api.slack.com/apps
2. Create new app or select existing
3. Enable Incoming Webhooks
4. Add webhook to workspace
5. Copy webhook URL to Portal Configurations tab

## Channel Routing
| Event Type | Recommended Channel |
|------------|---------------------|
| Info (story start/complete) | #wave-updates |
| Alerts (escalation, safety) | #wave-alerts |
| Budget warnings | #wave-budget |

## Common Issues
${issues.map(i => `### ${i.name}\n${i.solution}`).join('\n\n')}
`

  const blob = new Blob([guide], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `notification-guide-${project?.name}-${new Date().toISOString().split('T')[0]}.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
```

---

## Validation Checks to Implement

| Check | Category | Pass Criteria |
|-------|----------|---------------|
| Webhook URL configured | Configuration | `SLACK_WEBHOOK_URL` is set |
| Webhook URL valid | Configuration | URL starts with `https://hooks.slack.com/` |
| Ping test passes | Connectivity | Webhook responds with 200 |
| Bot token configured | Configuration | `SLACK_BOT_TOKEN` is set (optional) |
| Channel routing defined | Configuration | At least one channel webhook set |
| Recent delivery success | Delivery | Last 5 notifications succeeded |

---

## New State Variables

```tsx
// Add to component state
const [notificationStatus, setNotificationStatus] = useState<'idle' | 'validating' | 'ready' | 'blocked'>('idle')
const [notificationChecks, setNotificationChecks] = useState<NotificationCheck[]>([])
const [notificationLastChecked, setNotificationLastChecked] = useState<string | null>(null)
const [deliveryStats, setDeliveryStats] = useState<DeliveryStats | null>(null)

interface NotificationCheck {
  id: string
  name: string
  category: 'Configuration' | 'Connectivity' | 'Delivery'
  status: 'pass' | 'fail' | 'warn' | 'pending'
  message: string
  recommendation?: string
  command?: string
}

interface DeliveryStats {
  total: number
  success: number
  failed: number
  avgLatencyMs: number
  byType: Record<string, number>
}
```

---

## Implementation Steps

### Step 1: Add Info Box
Add the purple info box explaining Slack Feedback Loop purpose.

### Step 2: Add Validation CTA
Replace simple header with full validation CTA pattern:
- Status icon (dynamic)
- Status title and description
- Last validated timestamp
- Download Guide button
- Validate/Re-validate button

### Step 3: Add Progress Bar
Show configuration progress with:
- Percentage bar
- Pass/Fail/Warning counts

### Step 4: Add Channel Routing Section
New section showing:
- Configured channels with status
- Per-channel test buttons
- Setup links for missing channels

### Step 5: Reorganize Test Buttons
Group tests by type:
- Info notifications (left column)
- Alert notifications (right column)

### Step 6: Add Delivery Statistics
New section showing:
- Total sent (24h)
- Success rate
- Average latency
- By-type breakdown

### Step 7: Enhance History Section
Show more details:
- Channel routing
- Thread ID (for thread-per-story)
- Delivery latency

### Step 8: Move Dozzle to Bottom
Dozzle is secondary - move below Slack sections.

---

## Tabs to Apply Same Pattern

| Tab | Icon Color | Icon | Validation Type |
|-----|------------|------|-----------------|
| Infrastructure | Blue | Server | Foundation checks |
| Notifications | Purple | Bell | Slack configuration |
| Agent Dispatch | Amber | Bot | Agent readiness |
| Audit Log | Zinc | FileText | Compliance status |

**Note:** Info boxes use `bg-zinc-50` (subtle gray) for all tabs. Only the icon inside gets the accent color. All buttons are black (primary) or outline (secondary).

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/ProjectChecklist.tsx` | Lines 6838-7132 (Notifications tab) |
| `server/index.js` | Add `/api/notifications/validate` endpoint |
| `server/slack-notifier.js` | Add validation methods |

---

## Acceptance Criteria

- [ ] Info box explains Slack Feedback Loop purpose
- [ ] Validation CTA shows configuration status
- [ ] Progress bar shows pass/fail/warn counts
- [ ] Download Guide generates troubleshooting .md
- [ ] Channel routing section shows all channels
- [ ] Test buttons grouped by notification type
- [ ] Delivery statistics displayed (if available)
- [ ] History shows channel and thread info
- [ ] Pattern matches Infrastructure tab exactly
- [ ] All 6 notification tests work correctly

---

## Visual Reference

### Color-Minimal Design System

```
BACKGROUNDS:
- Info box:       bg-zinc-50 border-zinc-200
- Cards:          bg-white border-zinc-200
- Progress bar:   bg-zinc-200

ICONS ONLY (accent colors):
- Info:           text-blue-600 bg-blue-100
- Notifications:  text-purple-600 bg-purple-100
- Success:        text-green-600 bg-green-100
- Warning:        text-amber-600 bg-amber-100
- Error:          text-red-600 bg-red-100

BUTTONS:
- Primary:        bg-zinc-900 text-white hover:bg-zinc-800
- Secondary:      border-zinc-200 text-zinc-600 hover:border-zinc-300
- Ghost:          text-zinc-500 hover:text-zinc-900

TEXT:
- Headings:       text-zinc-900
- Body:           text-zinc-600
- Muted:          text-zinc-400

BADGES (only place for colored backgrounds):
- Success:        bg-green-100 text-green-700
- Warning:        bg-amber-100 text-amber-700
- Error:          bg-red-100 text-red-700
- Neutral:        bg-zinc-100 text-zinc-600
```

### Why Minimal Colors?

1. **Professional** - Less visual noise, focus on content
2. **Accessible** - High contrast text, clear hierarchy
3. **Consistent** - Same pattern works for all tabs
4. **Scannable** - Colors only highlight status (icons/badges)
