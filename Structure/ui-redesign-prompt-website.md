# AttendEase Website UI Rectification Instructions

## Design Principles

- One primary action per screen
- Maximum 3–4 cards per section
- Avoid nested panels
- Avoid instructional paragraphs
- Prefer visual hierarchy instead of explanations
- Remove enterprise dashboard clutter

**UI style inspiration:** Linear — airy spacing, large cards, blue accent color, minimal filters.

> Reference style: Screenshots attached for visual reference.

---

## 1. Remove the Left Sidebar Profile Section

### Problem

The current UI places the teacher profile card inside the left sidebar:

- Prof. Anurag Agarwal
- teacher@attendease.dev
- Teacher role

This consumes sidebar space and creates visual clutter.

### Fix

Remove this entire profile card from the sidebar.

### New Placement

Move profile to the **top navigation bar** (top-right corner).

**Top Navigation Layout:**

| Left side | Right side |
|-----------|------------|
| AttendEase Logo — Dashboard | Notification icon (optional) — Profile icon — Logout |

**Profile Interaction:** When user clicks profile icon, show dropdown:

- Profile Name
- Email
- Role
- Settings
- Logout

This keeps the sidebar clean and functional.

---

## 2. Remove the Left Sidebar Navigation

### Current Sidebar Problems

The sidebar contains:

- Dashboard
- Classrooms
- Attendance Sessions
- Reports
- Exports
- Analytics
- Email Automation

Each item also has descriptive paragraphs, which is unnecessary.

### Fix

Remove the left sidebar completely.

- Dashboard is visible when a teacher logs in.
- It shows classroom cards with an option to delete or edit each one.
- Each course is visible as a classroom card; cards are clickable to open.

---

## 3. Classrooms Section Improvements

After entering a classroom card, the user should see:

- All **lecture session cards** up to now
- A button/option to **create a new lecture**
- After adding a lecture, for up to **2 hours**, the user can start attendance by clicking on it

On the course details page, the teacher can also view:

- **Students tab** — list of enrolled students
- **Announcements tab**
- **Schedule tab**

---

## 4. Lecture Session Structure

When clicking **View Details** on a lecture session:

1. Show **attendance records**
2. Show **Start Attendance** button
3. On clicking Start Attendance → dialog box to set GPS checking radius
4. After clicking Start → display a **full-page big QR code**
   - QR changes every **2 seconds**
   - Visible **countdown timer**
   - **Stop Attendance** button

---

## 5. Attendance Sessions Page (Major Fix)

### Problems

The current page has too many panels:

- Refine
- Review
- Watch
- Compare
- Go To
- Sessions In View
- Session Review
- Filters
- Correction State
- Internal server error boxes
- Keep in mind instructions

This creates extreme cognitive overload.

### Remove Completely

Delete the following elements:

- Refine
- Review
- Watch
- Compare
- Go To section
- Sessions in View
- Correction State
- Current Filter Scope
- Keep in Mind
- Instruction paragraphs
- All red error banners

---

## 6. Attendance Records

On a particular lecture session page:

- All student attendance records visible as a **list**
- Each row has an **Unmark** button on the right
- A **Mark Manual Attendance** button available
- **Search bar** at the top to search for any student

---

## 9. Attendance Flow Simplification

Teachers must be able to start attendance quickly:

1. **Classroom Page** (dashboard with classroom cards)
2. → **Course Details Page** (lecture sessions + tabs)
3. → **Lecture Session Page** (attendance records + start attendance)

---

## 10. Reports Page

Reports tab inside the **Course Details Page**. Contains:

**Top cards:**

- Average Attendance
- Students above 75% threshold
- Students below threshold

**Chart:** Attendance vs lecture sessions

**Export:** Button on course details page — exports attendance records to Excel.
