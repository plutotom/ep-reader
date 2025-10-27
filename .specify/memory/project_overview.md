# EP-Reader Implementation Plan

## Overview

Transform the template app into an EPUB reader that parses books into sections (by h1/h2/h3 headers), releases them on custom schedules, and tracks reading progress by paragraph. Mobile-first design with localStorage-based user identification.

## Database Schema

Update `src/server/db/schema.ts` to replace the posts table with:

**Books Table**

- id (uuid), userId (text), title, author, filePath, coverImage
- totalChapters, totalSections, status (processing/ready/active/completed)
- timestamps

**Book Sections Table**

- id (uuid), bookId (fk), chapterNumber, sectionNumber
- title, content (text/html), wordCount, estimatedReadTime
- orderIndex, headerLevel (1-3 for h1/h2/h3)
- timestamps

**Release Schedules Table**

- id (uuid), bookId (fk), scheduleType (daily/weekly/custom)
- daysOfWeek (integer array: [1,2,3,4,5]), releaseTime (time)
- sectionsPerRelease (1-3), isActive (boolean)
- timestamps

**Releases Table**

- id (uuid), bookId (fk), sectionIds (uuid array)
- scheduledFor, releasedAt, status (scheduled/released)
- timestamps

**Reading Progress Table**

- id (uuid), userId (text), bookId (fk), sectionId (fk), releaseId (fk)
- progressPercentage (decimal), lastParagraphIndex (integer)
- isRead (boolean), readAt
- timestamps

**User Settings Table**

- id (uuid), userId (text - from localStorage)
- timezone (default: auto-detected), readingFontSize, readingTheme
- timestamps

Add indexes on: bookId, userId, sectionId, scheduledFor, status fields

## EPUB Parsing

**Install Dependencies**

```bash
pnpm add @ridi/epub-parser
pnpm add -D @types/node
```

**Create Parser Service** (`src/server/services/epub-parser.ts`)

- Parse EPUB file from `/uploads` directory
- Extract metadata (title, author, cover image)
- Parse content by h1/h2/h3 tags hierarchically
- Split long sections (>2000 words) by next header level
- Calculate word count and estimated read time (200 words/min)
- Clean content: remove nav elements, resize images for mobile
- Return structured data: chapters array with nested sections

**Algorithm**

1. Parse EPUB structure and get spine items
2. For each spine item, extract HTML content
3. Find all h1/h2/h3 tags in order
4. Create sections between headers
5. If section >2000 words, look for next header level to split
6. Store header level (1-3) for each section
7. Generate orderIndex for sequential reading

## File Upload

**Create Upload API Route** (`src/app/api/upload/route.ts`)

- Accept EPUB file upload (multipart/form-data)
- Validate file type (.epub only)
- Save to `/uploads/{userId}/{timestamp}-{filename}.epub`
- Create uploads directory if not exists
- Return file path for processing

**Create tRPC Router** (`src/server/api/routers/book.ts`)

- `uploadBook`: Accepts filePath, triggers parsing
- `parseBook`: Calls epub-parser service, creates book + sections in DB
- `getBooks`: List all books for userId
- `getBook`: Get single book with sections
- `deleteBook`: Remove book, sections, schedules, and file

## Release Scheduling

**Create Schedule Router** (`src/server/api/routers/schedule.ts`)

- `createSchedule`: Create release schedule for book
- `updateSchedule`: Modify existing schedule
- `getSchedule`: Get schedule for book
- `deleteSchedule`: Remove schedule

**Create Release Service** (`src/server/services/release-service.ts`)

- `checkAndCreateReleases`: Called on page load
  - Query all active schedules
  - Check if release is due based on schedule + timezone
  - Check last 2 releases - if unread, skip creating new ones
  - Create release with next N sections
  - Mark as "released" with timestamp
- `getAvailableReleases`: Get releases for userId where status="released"
- `markReleaseRead`: Update release status and reading progress

## Reading Progress

**Create Progress Router** (`src/server/api/routers/progress.ts`)

- `updateProgress`: Save paragraph index + percentage for section
  - Calculate percentage from paragraph position
  - Update every time user scrolls to new paragraph
- `getProgress`: Get progress for specific section
- `markSectionRead`: Mark section as complete, move to next
- `getBookProgress`: Overall book progress stats

**Progress Tracking Logic**

- Wrap each `<p>` tag with data-paragraph-index attribute
- Use IntersectionObserver to detect visible paragraph
- Debounce updates (save every 3 seconds)
- On mount, scroll to lastParagraphIndex

## UI Components

**Mobile-First Layout** (`src/app/layout.tsx`)

- Bottom navigation: Library, Reading, Settings
- Responsive: 320px-768px optimized
- PWA manifest link

**Library Page** (`src/app/library/page.tsx`)

- Upload button (opens file picker)
- Book grid/list with covers
- Progress indicators per book
- Tap to view book details

**Book Detail Page** (`src/app/book/[id]/page.tsx`)

- Book metadata (title, author, cover)
- Section list with read status
- Schedule configuration
- Edit/Delete actions

**Schedule Config** (`src/app/book/[id]/schedule/page.tsx`)

- Schedule type selector (daily/weekly/custom)
- Day picker (checkboxes for Mon-Sun)
- Time picker
- Sections per release (1-3)
- Preview next 5 releases

**Reading Page** (`src/app/read/[releaseId]/page.tsx`)

- Full-screen reading view
- Section content with paragraph tracking
- Progress bar at bottom
- Mark as Read button
- Next section preview

**Settings Page** (`src/app/settings/page.tsx`)

- Timezone (auto-detected, editable)
- Font size (small/medium/large)
- Theme (light/dark/sepia)
- User ID display (for debugging)

## User Identification

**Create User Hook** (`src/hooks/use-user-id.ts`)

- Generate UUID on first visit
- Store in localStorage as "ep-reader-user-id"
- Return userId for all API calls
- Create user_settings record on first use

## PWA Configuration

**Update next.config.js**

- Uncomment and configure next-pwa wrapper
- Set dest: 'public', register: true, skipWaiting: true
- Disable in development

**Create manifest.json** (`public/manifest.json`)

- name: "EP-Reader"
- short_name: "EP-Reader"
- display: "standalone"
- orientation: "portrait"
- theme_color, background_color
- icons: 192x192, 512x512

**Update Service Worker** (`src/sw.js`)

- Cache book content for offline reading
- Cache uploaded files
- Update cache strategy for dynamic content

## Implementation Order

1. Database schema + migrations
2. User identification hook
3. EPUB parser service
4. File upload API + tRPC router
5. Book management (create/list/delete)
6. Schedule creation + release service
7. Reading progress tracking
8. UI: Library page
9. UI: Book detail + schedule config
10. UI: Reading interface with progress
11. PWA manifest + service worker updates
12. Mobile responsive polish

## Key Files to Create/Modify

**New Files**

- `src/server/services/epub-parser.ts`
- `src/server/services/release-service.ts`
- `src/server/api/routers/book.ts`
- `src/server/api/routers/schedule.ts`
- `src/server/api/routers/progress.ts`
- `src/app/api/upload/route.ts`
- `src/hooks/use-user-id.ts`
- `src/app/library/page.tsx`
- `src/app/book/[id]/page.tsx`
- `src/app/book/[id]/schedule/page.tsx`
- `src/app/read/[releaseId]/page.tsx`
- `src/app/settings/page.tsx`
- `public/manifest.json`

**Modified Files**

- `src/server/db/schema.ts` (replace posts with new tables)
- `src/server/api/root.ts` (add new routers)
- `src/app/layout.tsx` (add manifest, bottom nav)
- `src/app/page.tsx` (redirect to library)
- `next.config.js` (enable PWA)
- `drizzle.config.ts` (update table prefix)

## Notes

- Use Shadcn UI components throughout
- All times stored in UTC, converted using user timezone
- Release check runs on every page load (simple, no cron needed)
- Paragraph tracking uses IntersectionObserver API
- Images in EPUB resized to max 768px width
- Estimated read time: 200 words per minute
- Auto-split sections over 2000 words
