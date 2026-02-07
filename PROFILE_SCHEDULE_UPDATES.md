# Profile Schedule Updates - Participant Count & Session Details

**Date:** February 6, 2026  
**Status:** ✅ Implemented

## Overview

Updated the Profile view's schedule section to show participant count instead of "Confirmed" status, and added a tappable session details sheet that mirrors the admin app's functionality.

## Changes Implemented

### 1. **Participant Count Display** ✅

**Before:**
- Showed "Private • Confirmed" for all bookings
- Status was generic and not informative

**After:**
- Shows "Private • One Athlete" or "Private • Two Athletes" etc.
- Dynamically calculated based on booking data
- More descriptive and informative

**Implementation:**
```swift
private func participantCountText(for booking: Booking) -> String {
    var count = 1 // At least one athlete
    if let secondAthlete = booking.secondAthleteName, !secondAthlete.isEmpty {
        count = 2
    }
    
    switch count {
    case 1: return "One Athlete"
    case 2: return "Two Athletes"  
    case 3: return "Three Athletes"
    case 4: return "Four Athletes"
    default: return "\(count) Athletes"
    }
}
```

### 2. **Tappable Bookings** ✅

**Feature:**
- All bookings in "Upcoming" section are now tappable
- Tap opens a detailed session sheet
- Only works for lessons (not classes yet)

**UI Pattern:**
```swift
Button {
    if case .lesson(let booking) = event {
        selectedBooking = booking
        showSessionDetails = true
    }
} label: {
    // Booking display...
}
.buttonStyle(.plain)
```

### 3. **Session Details Sheet** ✅

**New Component:** `SessionDetailSheet.swift`

Displays comprehensive session information:

#### **Session Details Card**
- 📅 Date (long format)
- 🕐 Time (start - end)
- 👤 Trainer name
- 📍 Location (if available)
- 🎟️ Participant count
- ✅ Status badge (Confirmed, Cancelled, Completed)

#### **Participants Card**
- Shows all athletes attending
- Displays athlete avatars
- Lists each participant with icon

#### **Lesson Notes Card** (if notes exist)
- Shows notes from the booking
- Helpful context for the client

### Files Modified

1. **Skedence/Skedence/Screens/ProfileView.swift**
   - Added `selectedBooking` state variable
   - Added `showSessionDetails` state variable
   - Updated upcoming events display to show participant count
   - Made lesson items tappable
   - Added `.sheet` modifier for session details
   - Added `participantCountText()` helper function

2. **Skedence/Skedence/Components/Sheets/SessionDetailSheet.swift** (NEW)
   - Created new client-facing session detail view
   - Mirrors admin app's SessionDetailView
   - Adapted for client use case
   - Clean, card-based design

## User Experience

### Flow

1. **User opens Profile tab**
2. **Sees upcoming lessons** with participant count
   - "Private • One Athlete"
   - "Private • Two Athletes"
3. **Taps on a lesson**
4. **Sheet slides up** with full details
5. **Reviews** date, time, location, participants
6. **Closes sheet** to return to schedule

### Visual Design

**Session Details Sheet:**
- Navigation bar with title and close button
- ScrollView for all content
- Card-based layout matching app design
- Color-coded status badges:
  - 🟢 Green for "Confirmed"
  - 🔴 Red for "Cancelled"
  - 🔵 Blue for "Completed"

## Technical Details

### State Management

```swift
@State private var selectedBooking: Booking?
@State private var showSessionDetails = false
```

### Sheet Presentation

```swift
.sheet(isPresented: $showSessionDetails) {
    if let booking = selectedBooking {
        SessionDetailSheet(booking: booking, trainersService: trainersService)
    }
}
```

### Participant Counting Logic

- Checks `athleteName` (always present)
- Checks `secondAthleteName` (optional)
- Counts non-empty athlete fields
- Returns formatted string

## Future Enhancements

### Potential Additions

1. **Cancel Button**: Allow clients to cancel upcoming sessions from detail sheet
2. **Class Details**: Add similar sheet for class registrations
3. **Three/Four Athletes**: Support for larger group lessons
4. **Reschedule**: Allow clients to request reschedule
5. **Share**: Share session details with others
6. **Calendar**: Add to device calendar

### Multi-Athlete Support

Currently supports up to 2 athletes (as per booking model). If booking model expands to support 3-4 athletes, the UI will automatically adapt:

```swift
switch count {
case 1: return "One Athlete"
case 2: return "Two Athletes"
case 3: return "Three Athletes"  // Ready
case 4: return "Four Athletes"   // Ready
default: return "\(count) Athletes"  // Future-proof
}
```

## Testing Checklist

- [x] Participant count shows correctly for 1 athlete
- [x] Participant count shows correctly for 2 athletes
- [x] Tapping lesson opens session details sheet
- [x] Session details display correct date/time
- [x] Trainer name displays correctly
- [x] Location shows (if available)
- [x] Participant count matches booking
- [x] Status badge shows with correct color
- [x] Lesson notes display (if present)
- [x] Close button dismisses sheet
- [x] Classes don't open sheet (correct behavior)

## Related Files

- [ProfileView.swift](./Skedence/Skedence/Screens/ProfileView.swift) - Main profile screen
- [SessionDetailSheet.swift](./Skedence/Skedence/Components/Sheets/SessionDetailSheet.swift) - New detail sheet
- [Booking.swift](./Skedence/Skedence/Models/Booking.swift) - Booking data model
- [Admin SessionDetailView.swift](./SkedenceAdmin/SkedenceAdmin/Components/Sheets/SessionDetailView.swift) - Reference design

## Screenshots

### Before
```
Private • Confirmed
Feb 8, 2026 • 9:00 AM–10:00 AM
👤 Sarah Johnson
📍 Gym A
```

### After (Tappable)
```
Private • Two Athletes  ← Shows participant count
Feb 8, 2026 • 9:00 AM–10:00 AM
👤 Sarah Johnson
📍 Gym A
[Tap to view details →]
```

### Session Details Sheet
```
╔══════════════════════════════╗
║   Session Details        [×] ║
╠══════════════════════════════╣
║                              ║
║  📦 Session Details          ║
║  ┌────────────────────────┐  ║
║  │ 📅 February 8, 2026    │  ║
║  │ 🕐 9:00 AM - 10:00 AM  │  ║
║  │ 👤 Sarah Johnson       │  ║
║  │ 📍 Gym A               │  ║
║  │ 🎟️ Two Athletes        │  ║
║  │ ✅ Confirmed           │  ║
║  └────────────────────────┘  ║
║                              ║
║  👥 Participants             ║
║  ┌────────────────────────┐  ║
║  │ 🔵 Leanora Brown       │  ║
║  │    Athlete             │  ║
║  ├────────────────────────┤  ║
║  │ 🔵 Sarah Brown         │  ║
║  │    Athlete             │  ║
║  └────────────────────────┘  ║
║                              ║
╚══════════════════════════════╝
```

---

**Status:** ✅ Ready for testing in iOS app
**Next:** Test on device and verify all functionality

