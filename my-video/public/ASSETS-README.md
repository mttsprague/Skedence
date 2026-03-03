# Skedence Video - Assets Required

To complete the Skedence marketing video, please add the following assets to the `/public` folder:

## Required Assets

### 1. Screenshots (PNG or JPEG format)
Place these in the `/public` folder:

- **`scheduling-dashboard.png`** - Screenshot of the scheduling calendar/time slot view
  - Used in Act 2 (The Shift)
  - Should show the clean, organized scheduling interface
  - Recommended size: 1920x1080 or higher resolution

- **`revenue-report.png`** - Screenshot of the revenue/financial report
  - Used in Act 2 (The Shift)
  - Should display revenue metrics and payment information
  - Recommended size: 1920x1080 or higher resolution

- **`packages-or-trainers.png`** - Screenshot of Packages/Passes or Trainers page
  - Used in Act 3 (The Power)
  - Shows structured business management features
  - Recommended size: 1920x1080 or higher resolution

### 2. Logo (Optional)
- **`skedence-logo.png`** - High-resolution Skedence logo
  - Used in Act 4 (The Identity Shift)
  - Currently using text placeholder "Skedence"
  - Recommended: Transparent PNG, white or light colored logo
  - If you have a logo, uncomment the Img component in [Act4Identity.tsx](../src/remotion/Skedence/Act4Identity.tsx#L120)

### 3. Background Music (Optional)
- **`background-music.mp3`** - Minimal ambient tech audio track
  - Should be subtle, no vocals, no hype drops
  - Recommended: 45 seconds duration or loop-able
  - If you have audio, uncomment the Audio component in [Main.tsx](../src/remotion/Skedence/Main.tsx#L21)

## Video Specifications

- **Duration**: 45 seconds
- **Resolution**: 1920x1080 (Full HD)
- **Frame Rate**: 30 FPS
- **Aspect Ratio**: 16:9

## How to Preview

1. Make sure you have the assets in the `/public` folder
2. Run the development server:
   ```bash
   npm run dev
   ```
3. Navigate to the Remotion Studio (usually opens automatically)
4. Select the "Skedence" composition from the dropdown
5. Preview and adjust timing as needed

## Notes

- All screenshots should have a clean, professional appearance
- Ensure text in screenshots is readable at video resolution
- Screenshots will be displayed with rounded corners and soft shadows
- The video uses a dark theme (#0f1115 background) with blue accents (#3b82f6)

## Customization

To adjust timing for each act, edit the constants in [constants.ts](../types/constants.ts):
- `ACT1_DURATION` - Currently 10 seconds
- `ACT2_DURATION` - Currently 12 seconds
- `ACT3_DURATION` - Currently 10 seconds
- `ACT4_DURATION` - Currently 13 seconds
