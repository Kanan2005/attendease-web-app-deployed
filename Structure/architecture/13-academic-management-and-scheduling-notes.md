# Academic Management and Scheduling Notes

This companion note keeps implementation-layout and verification details for the academic management architecture.

## UI Architecture

### Teacher Mobile

Should support:

- quick classroom creation
- calendar view
- one-off and recurring schedule edits
- lecture list

### Teacher Web

Should support:

- richer semester and classroom CRUD
- larger calendar UI
- import and schedule admin workflows

## Code Layout

```text
apps/api/src/modules/academic/
  semesters.controller.ts
  semesters.service.ts
  classrooms.controller.ts
  classrooms.service.ts

apps/api/src/modules/scheduling/
  scheduling.controller.ts
  scheduling.service.ts
  lecture-planner.service.ts

apps/web/src/features/teacher-web/semesters/
apps/web/src/features/teacher-web/classrooms/
apps/web/src/features/teacher-web/schedule/
apps/mobile/src/features/teacher/scheduling/
```

## Testing Strategy

Must include:

- CRUD tests for semesters and classrooms
- schedule recurrence and exception tests
- lecture linking tests
- save-and-notify outbox tests

## Implementation Outcome

When this architecture is complete:

- semesters, classrooms, and lectures are first-class objects
- teachers can manage recurring and one-off class schedules
- attendance sessions fit cleanly into the academic calendar instead of floating independently
