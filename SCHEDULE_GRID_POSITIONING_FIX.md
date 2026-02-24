# Schedule Grid Positioning Fix

## Problem
Slots at non-hour times (like 11:30-12:30) are currently filling entire hour cells (11a-12p) instead of spanning correctly across the grid based on their actual start/end times.

## Solution Required

### iOS Admin App

**Files to Update:**
1. `AllTrainersDayView.swift` - All trainers day grid
2. `DayScheduleView.swift` - Single trainer day view  
3. `TrainerWeekView.swift` - Week view grid

**Changes Needed:**
- Calculate slot Y position based on: `(hour - firstHour) * rowHeight + (minute / 60.0) * rowHeight`
- Calculate slot height based on: `(duration in minutes / 60.0) * rowHeight`
- Use absolute positioning with ZStack and`.offset(y:)` instead of placing in hourly cells
- Apply to all slot types: availability (green), bookings (blue), classes (purple), unavailability (gray)

### Web Admin Portal  

**Files to Update:**
1. `components/admin/schedule/WeekScheduleGrid.tsx`
2. `components/admin/schedule/AllTrainersDayGrid.tsx`

**Changes Needed:**
- Already has 30-min grid intervals
- Need to ensure slots render with:
  - `top` position calculated from actual start time minutes
  - `height` calculated from actual duration minutes
- Current implementation may be snapping to hour boundaries

## Implementation Plan

1. **Create SlotPositionCalculator helper** (iOS)
   - Function to calculate Y offset from time
   - Function to calculate height from duration
   
2. **Update AllTrainersDayView** (iOS)
   - Render all slots for each trainer in a ZStack
   - Position absolutely using calculated offsets
   
3. **Update Web Grids**
   - Verify slot rendering uses minuteFraction for positioning
   - Ensure height calculation respects exact duration

4. **Test Cases**
   - 11:30-12:30 slot should span from 11:30 line to 12:30 line
   - 9:45-10:15 slot (30 min) should span correctly
   - Hourly slots (9:00-10:00) should still work
   - Multi-hour slots (9:30-12:30) should span correctly

