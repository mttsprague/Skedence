# Blog Posts Restoration

## Issue (March 24, 2026)

Blog posts were accidentally removed after being published to the wrong Firebase project. All blog posts were successfully restored to the correct project.

## Important Information

### Correct Firebase Project
- **Project ID:** `polyface-ae6d3`
- **Project Name:** Skedence (formerly Polyface)
- **Website:** https://skedence.com
- **Blog URL:** https://skedence.com/blog

### ⚠️ DO NOT Use These Projects for Skedence
- `volleyIQ` - Different project, NOT Skedence
- Any other Firebase project

## How to Verify Correct Project

### Check Firebase CLI Project
```bash
firebase use
# Should show: Active Project: polyface-ae6d3
```

### Check Environment Variables
See `.env.local` file:
```bash
NEXT_PUBLIC_FIREBASE_PROJECT_ID=polyface-ae6d3
```

## If Blog Posts Disappear Again

Run the restore script to re-publish all blog posts:

```bash
cd skedence-unified
./restore-blog-posts.sh
```

This will re-publish all 12 recent blog posts to `polyface-ae6d3`.

## Publishing New Blog Posts

All publishing scripts explicitly set the project ID:

```javascript
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'polyface-ae6d3'  // ALWAYS use this project
});
```

### Before Publishing
1. Verify Firebase CLI project: `firebase use`
2. Confirm output shows: `polyface-ae6d3`
3. Run publishing script: `node publish-your-post.js`

## Restored Blog Posts (March 24, 2026)

### Session 1: Lesson Structure & Client Posts (4 posts)
1. The Perfect Private Volleyball Lesson Plan
2. How to Get More Clients for Your Private Soccer Training Business
3. The Ideal Structure for a Private Basketball Training Session
4. How to Structure Effective Private Baseball Hitting Lessons

### Session 2: Business Startup Posts (4 posts)
1. How to Start a Private Volleyball Lesson Business
2. How Much Should You Charge for Private Soccer Training?
3. How Basketball Trainers Can Get More Clients Using Social Media
4. How to Start a Private Baseball Hitting Coach Business

### Session 3: Organization & Drills Posts (4 posts)
1. How to Organize Private Volleyball Lessons Without Scheduling Chaos
2. The Best Private Soccer Training Drills for Beginner Players
3. How to Run Successful Basketball Training Sessions
4. The Best Baseball Hitting Drills for Youth Players

**Total:** 12 blog posts restored

## Verification

After restoring, verify blog posts are visible:
- Visit: https://skedence.com/blog
- Check Firebase Console: https://console.firebase.google.com/project/polyface-ae6d3/firestore/databases/-default-/data/~2FblogPosts
- Verify `blogPosts` collection contains posts

## Need to Rebuild Website?

If blog posts still don't appear on the live site:

```bash
cd skedence-unified
npm run build
firebase deploy --only hosting
```

This updates the static website with the latest data.
