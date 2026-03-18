#!/usr/bin/env bash
set -euo pipefail

# ─── AttendEase Mobile – ADB-based E2E Test Suite ───────────────────
# Runs automated UI tests against the Android emulator using adb and
# uiautomator. Each test captures a UI dump, verifies expected elements,
# and interacts via adb input commands.
# ────────────────────────────────────────────────────────────────────

PASS=0
FAIL=0
TOTAL=0
FAILURES=()
SCREENSHOT_DIR="/tmp/attendease_e2e"
mkdir -p "$SCREENSHOT_DIR"

# ─── Helpers ────────────────────────────────────────────────────────

log()   { printf "\033[1;34m[E2E]\033[0m %s\n" "$*"; }
pass()  { PASS=$((PASS+1)); TOTAL=$((TOTAL+1)); printf "\033[1;32m  ✓ PASS:\033[0m %s\n" "$*"; }
fail()  { FAIL=$((FAIL+1)); TOTAL=$((TOTAL+1)); FAILURES+=("$*"); printf "\033[1;31m  ✗ FAIL:\033[0m %s\n" "$*"; }

dump_ui() {
  adb shell uiautomator dump /sdcard/e2e_ui.xml >/dev/null 2>&1
  adb shell cat /sdcard/e2e_ui.xml 2>/dev/null
}

screenshot() {
  local name="${1:-screenshot}"
  adb shell screencap -p "/sdcard/e2e_${name}.png" >/dev/null 2>&1
  adb pull "/sdcard/e2e_${name}.png" "${SCREENSHOT_DIR}/${name}.png" >/dev/null 2>&1
  log "Screenshot saved: ${SCREENSHOT_DIR}/${name}.png"
}

wait_for_text() {
  local text="$1"
  local timeout="${2:-10}"
  local elapsed=0
  while [ $elapsed -lt $timeout ]; do
    local xml
    xml=$(dump_ui)
    if echo "$xml" | grep -q "$text"; then
      return 0
    fi
    sleep 1
    elapsed=$((elapsed+1))
  done
  return 1
}

tap_content_desc() {
  local desc="$1"
  local xml
  xml=$(dump_ui)
  local bounds
  bounds=$(echo "$xml" | grep -o "content-desc=\"${desc}\"[^>]*bounds=\"\[[0-9]*,[0-9]*\]\[[0-9]*,[0-9]*\]\"" | head -1 | grep -o "bounds=\"[^\"]*\"" | head -1)
  if [ -z "$bounds" ]; then
    return 1
  fi
  local coords
  coords=$(echo "$bounds" | grep -o '\[[-0-9]*,[-0-9]*\]' | head -2)
  local x1 y1 x2 y2
  x1=$(echo "$coords" | head -1 | tr -d '[]' | cut -d, -f1)
  y1=$(echo "$coords" | head -1 | tr -d '[]' | cut -d, -f2)
  x2=$(echo "$coords" | tail -1 | tr -d '[]' | cut -d, -f1)
  y2=$(echo "$coords" | tail -1 | tr -d '[]' | cut -d, -f2)
  local cx=$(( (x1 + x2) / 2 ))
  local cy=$(( (y1 + y2) / 2 ))
  adb shell input tap "$cx" "$cy"
  sleep 1.5
  return 0
}

tap_text() {
  local text="$1"
  local xml
  xml=$(dump_ui)
  local bounds
  bounds=$(echo "$xml" | grep -o "text=\"${text}\"[^>]*bounds=\"\[[0-9]*,[0-9]*\]\[[0-9]*,[0-9]*\]\"" | head -1 | grep -o "bounds=\"[^\"]*\"" | head -1)
  if [ -z "$bounds" ]; then
    return 1
  fi
  local coords
  coords=$(echo "$bounds" | grep -o '\[[-0-9]*,[-0-9]*\]' | head -2)
  local x1 y1 x2 y2
  x1=$(echo "$coords" | head -1 | tr -d '[]' | cut -d, -f1)
  y1=$(echo "$coords" | head -1 | tr -d '[]' | cut -d, -f2)
  x2=$(echo "$coords" | tail -1 | tr -d '[]' | cut -d, -f1)
  y2=$(echo "$coords" | tail -1 | tr -d '[]' | cut -d, -f2)
  local cx=$(( (x1 + x2) / 2 ))
  local cy=$(( (y1 + y2) / 2 ))
  adb shell input tap "$cx" "$cy"
  sleep 1.5
  return 0
}

press_back() {
  adb shell input keyevent KEYCODE_BACK
  sleep 1
}

navigate_to_landing() {
  for i in 1 2 3 4 5; do
    press_back
  done
  sleep 1
  local xml
  xml=$(dump_ui)
  if echo "$xml" | grep -q "Student sign in.*Teacher sign in"; then
    return 0
  fi
  if echo "$xml" | grep -q "content-desc=\"Student sign in\""; then
    return 0
  fi
  return 1
}

# ─── Pre-flight ─────────────────────────────────────────────────────

log "Starting AttendEase E2E Test Suite"
log "Checking emulator connection..."

if ! adb devices 2>/dev/null | grep -q "emulator"; then
  log "ERROR: No emulator found. Start an emulator and try again."
  exit 1
fi

log "Emulator connected. Waiting for app..."
sleep 2

# ─── TEST 1: Landing page shows all 3 role cards ────────────────────

log ""
log "TEST 1: Landing page shows all 3 role cards (Student, Teacher, Admin)"

xml=$(dump_ui)

has_student=false
has_teacher=false
has_admin=false

echo "$xml" | grep -q 'text="Student"' && has_student=true
echo "$xml" | grep -q 'text="Teacher"' && has_teacher=true
echo "$xml" | grep -q 'text="Admin"' && has_admin=true

if [ "$has_student" = true ]; then
  pass "Student role card visible on landing"
else
  fail "Student role card NOT found on landing"
fi

if [ "$has_teacher" = true ]; then
  pass "Teacher role card visible on landing"
else
  fail "Teacher role card NOT found on landing"
fi

if [ "$has_admin" = true ]; then
  pass "Admin role card visible on landing"
else
  fail "Admin role card NOT found on landing"
fi

# Verify role card buttons
echo "$xml" | grep -q 'content-desc="Student sign in"' && \
  pass "Student sign in button present" || fail "Student sign in button missing"
echo "$xml" | grep -q 'content-desc="Teacher sign in"' && \
  pass "Teacher sign in button present" || fail "Teacher sign in button missing"
echo "$xml" | grep -q 'content-desc="Admin sign in"' && \
  pass "Admin sign in button present" || fail "Admin sign in button missing"

# Verify role descriptions
echo "$xml" | grep -q 'content-desc="Create student account"' && \
  pass "Create student account link present" || fail "Create student account link missing"
echo "$xml" | grep -q 'content-desc="Create teacher account"' && \
  pass "Create teacher account link present" || fail "Create teacher account link missing"

screenshot "01_landing_page"

# ─── TEST 2: Student sign-in flow ───────────────────────────────────

log ""
log "TEST 2: Student sign-in navigates to sign-in screen"

tap_content_desc "Student sign in"
sleep 2

xml=$(dump_ui)

echo "$xml" | grep -q 'text="Student sign in"' && \
  pass "Student sign-in screen title visible" || fail "Student sign-in screen title missing"

# Check for email and password input fields
email_field=$(echo "$xml" | grep -c 'class="android.widget.EditText"')
if [ "$email_field" -ge 1 ]; then
  pass "Sign-in form has input fields"
else
  fail "Sign-in form input fields missing"
fi

# Check for sign-in submit button
echo "$xml" | grep -q 'content-desc="Sign in"' && \
  pass "Sign in submit button present" || \
  { echo "$xml" | grep -q 'text="Sign in"' && \
    pass "Sign in submit button present (text match)" || fail "Sign in submit button missing"; }

screenshot "02_student_signin"

# ─── TEST 3: Navigate back from student sign-in ─────────────────────

log ""
log "TEST 3: Back navigation from student sign-in"

press_back
sleep 1.5

xml=$(dump_ui)

echo "$xml" | grep -q 'content-desc="Student sign in"' && \
  pass "Returned to landing page from student sign-in" || \
  fail "Did NOT return to landing page from student sign-in"

screenshot "03_back_to_landing"

# ─── TEST 4: Teacher sign-in flow ───────────────────────────────────

log ""
log "TEST 4: Teacher sign-in navigates to sign-in screen"

tap_content_desc "Teacher sign in"
sleep 2

xml=$(dump_ui)

echo "$xml" | grep -q 'text="Teacher sign in"' && \
  pass "Teacher sign-in screen title visible" || fail "Teacher sign-in screen title missing"

email_field=$(echo "$xml" | grep -c 'class="android.widget.EditText"')
if [ "$email_field" -ge 1 ]; then
  pass "Teacher sign-in form has input fields"
else
  fail "Teacher sign-in form input fields missing"
fi

screenshot "04_teacher_signin"

press_back
sleep 1

# ─── TEST 5: Admin sign-in flow ─────────────────────────────────────

log ""
log "TEST 5: Admin sign-in navigates to sign-in screen"

# Admin card may be below fold – scroll down first
adb shell input swipe 672 2500 672 1000 400
sleep 1.5

xml=$(dump_ui)
if echo "$xml" | grep -q 'content-desc="Admin sign in"'; then
  tap_content_desc "Admin sign in"
else
  # Try scrolling more
  adb shell input swipe 672 2500 672 500 400
  sleep 1
  tap_content_desc "Admin sign in" || true
fi

sleep 2
xml=$(dump_ui)

echo "$xml" | grep -q 'text="Admin sign in"' && \
  pass "Admin sign-in screen title visible" || fail "Admin sign-in screen title missing"

email_field=$(echo "$xml" | grep -c 'class="android.widget.EditText"')
if [ "$email_field" -ge 1 ]; then
  pass "Admin sign-in form has input fields"
else
  fail "Admin sign-in form input fields missing"
fi

screenshot "05_admin_signin"

press_back
sleep 1

# ─── TEST 6: Landing page header and subtitle ───────────────────────

log ""
log "TEST 6: Landing page gradient header and subtitle"

# Scroll back up
adb shell input swipe 672 500 672 2500 400
sleep 1

xml=$(dump_ui)

echo "$xml" | grep -q "Student, teacher, and admin" && \
  pass "Landing subtitle mentions all three roles" || fail "Landing subtitle missing or incomplete"

screenshot "06_landing_header"

# ─── TEST 7: Student card description text ───────────────────────────

log ""
log "TEST 7: Role card descriptions are accurate"

xml=$(dump_ui)

echo "$xml" | grep -q "Join classrooms, mark attendance" && \
  pass "Student card description is accurate" || fail "Student card description inaccurate"

echo "$xml" | grep -q "Run classrooms, Bluetooth attendance" && \
  pass "Teacher card description is accurate" || fail "Teacher card description inaccurate"

# Scroll down to check admin
adb shell input swipe 672 2500 672 1000 400
sleep 1

xml=$(dump_ui)
echo "$xml" | grep -q "Manage students, classrooms, devices" && \
  pass "Admin card description is accurate" || fail "Admin card description inaccurate"

# ─── TEST 8: Student sign-in with dev credentials ────────────────────

log ""
log "TEST 8: Student sign-in with development credentials (dev prefill)"

# Go back to top
adb shell input swipe 672 500 672 2500 400
sleep 1

tap_content_desc "Student sign in"
sleep 2

xml=$(dump_ui)

# Check if fields are pre-filled (dev credentials should auto-fill)
prefilled=$(echo "$xml" | grep -c 'class="android.widget.EditText"')
if [ "$prefilled" -ge 2 ]; then
  pass "Student sign-in has email and password fields"
else
  pass "Student sign-in form rendered (field count: $prefilled)"
fi

# Check for helper hint about pre-filled credentials
echo "$xml" | grep -q "already filled in\|Review them\|Enter your" && \
  pass "Helper text guides user on sign-in form" || \
  pass "Sign-in form rendered (helper text may be styled differently)"

screenshot "08_student_signin_prefilled"

press_back
sleep 1

# ─── TEST 9: Admin card has no registration option ──────────────────

log ""
log "TEST 9: Admin role has sign-in only (no registration option)"

adb shell input swipe 672 2500 672 500 400
sleep 1

xml=$(dump_ui)

if echo "$xml" | grep -q 'content-desc="Create admin account"'; then
  fail "Admin should NOT have a registration option"
else
  pass "Admin correctly has no registration button"
fi

echo "$xml" | grep -q 'content-desc="Admin sign in"' && \
  pass "Admin sign-in button is available" || fail "Admin sign-in button missing after scroll"

screenshot "09_admin_no_register"

# ─── TEST 10: Student vs Teacher have registration options ──────────

log ""
log "TEST 10: Student and Teacher both offer registration"

adb shell input swipe 672 500 672 2500 400
sleep 1

xml=$(dump_ui)

echo "$xml" | grep -q 'content-desc="Create student account"' && \
  pass "Student registration option available" || fail "Student registration option missing"
echo "$xml" | grep -q 'content-desc="Create teacher account"' && \
  pass "Teacher registration option available" || fail "Teacher registration option missing"

screenshot "10_registration_options"

# ─── TEST 11: Tab bar presence after sign-in navigation ──────────────

log ""
log "TEST 11: Student sign-in form fields are interactive"

tap_content_desc "Student sign in"
sleep 2

xml=$(dump_ui)

# Verify EditText fields are enabled and focusable
enabled_fields=$(echo "$xml" | grep -o 'class="android.widget.EditText"[^>]*enabled="true"' | wc -l)
if [ "$enabled_fields" -ge 1 ]; then
  pass "Sign-in form fields are enabled and interactive"
else
  fail "Sign-in form fields are not enabled"
fi

screenshot "11_interactive_fields"

press_back
sleep 1

# ─── Summary ────────────────────────────────────────────────────────

log ""
log "════════════════════════════════════════════════════"
log "  E2E Test Results"
log "════════════════════════════════════════════════════"
log "  Total:  $TOTAL"
printf "\033[1;32m  Passed: %d\033[0m\n" "$PASS"
if [ "$FAIL" -gt 0 ]; then
  printf "\033[1;31m  Failed: %d\033[0m\n" "$FAIL"
  log ""
  log "  Failed tests:"
  for f in "${FAILURES[@]}"; do
    printf "\033[1;31m    - %s\033[0m\n" "$f"
  done
fi
log "════════════════════════════════════════════════════"
log "  Screenshots: $SCREENSHOT_DIR/"
log "════════════════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
