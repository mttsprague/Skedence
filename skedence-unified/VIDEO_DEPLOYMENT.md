# Video Deployment Guide

## Current Setup
The product video (`skedence-demo.mp4`) has been added to:
1. **Home Page** - "See Skedence In Action" section (after hero)
2. **Support Page** - "How Skedence Works" section (before FAQ)

## Local Development
- Video location: `/public/videos/skedence-demo.mp4`
- Access URL: `http://localhost:3000/videos/skedence-demo.mp4`
- **Note:** Video is in `.gitignore` to avoid committing 17MB file to Git

## Production Deployment Options

### Option A: Firebase Storage (CDN) - RECOMMENDED ✅

**Benefits:**
- Faster global delivery via CDN
- No impact on build/deployment size
- Better for large files

**Steps:**
1. Upload video to Firebase Storage using Firebase Console:
   - Go to: https://console.firebase.google.com/project/polyface-ae6d3/storage
   - Navigate to or create: `marketing/videos/`
   - Upload: `skedence-demo.mp4`
   - Make public: Right-click → "Get download URL"

2. Update video URLs in code:
   - Replace `/videos/skedence-demo.mp4` with Firebase Storage URL
   - Files to update:
     - `src/app/page.tsx` (line ~170-175)
     - `public/support.html` (line ~190-195)

**Example URLs:**
```
https://firebasestorage.googleapis.com/v0/b/polyface-ae6d3.appspot.com/o/marketing%2Fvideos%2Fskedence-demo.mp4?alt=media
```

### Option B: Keep in Public Folder

**For testing only:**
```bash
# Remove from .gitignore temporarily
# (Not recommended for production due to file size)
```

## Video Specs
- **File:** skedence-demo.mp4
- **Size:** ~17MB
- **Format:** MP4 (H.264)
- **Aspect Ratio:** 16:9
- **Implementation:** Click-to-play with controls

## Video Features
- ✅ Click-to-play (not autoplay - better UX)
- ✅ Native HTML5 video controls
- ✅ Responsive (full width on mobile)
- ✅ Poster frame support
- ✅ Metadata preload (fast initial load)

## Testing Checklist
- [ ] Video plays on desktop Chrome
- [ ] Video plays on mobile Safari
- [ ] Video loads within 3 seconds
- [ ] Controls work (play/pause/seek)
- [ ] Fullscreen mode works
- [ ] Page layout responsive with video
- [ ] CTA button visible below video

## Future Enhancements
- [ ] Add video caption/subtitles (WebVTT)
- [ ] Multiple quality versions (720p, 1080p)
- [ ] Video thumbnail image (separate from video file)
- [ ] Analytics tracking (play/complete events)
- [ ] Lazy loading for below-fold videos
