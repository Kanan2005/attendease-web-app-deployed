import { mkdir } from "node:fs/promises"
import path from "node:path"

import { chromium } from "playwright-core"

import { getWebCapturePlan } from "./full-product-audit-lib.mjs"

const baseUrl = process.env.AUDIT_BASE_URL ?? "http://localhost:3000"
const chromeExecutable =
  process.env.CHROME_BIN ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
const viewport = { width: 1440, height: 1080 }
const teacherCredentials = {
  email: process.env.AUDIT_TEACHER_EMAIL ?? "teacher@attendease.dev",
  password: process.env.AUDIT_TEACHER_PASSWORD ?? "TeacherPass123!",
}
const adminCredentials = {
  email: process.env.AUDIT_ADMIN_EMAIL ?? "admin@attendease.dev",
  password: process.env.AUDIT_ADMIN_PASSWORD ?? "AdminPass123!",
}

const webPlan = getWebCapturePlan()

function resolveTarget(target) {
  return path.resolve(process.cwd(), target)
}

async function captureRoute(page, route, target) {
  const filePath = resolveTarget(target)

  await mkdir(path.dirname(filePath), { recursive: true })
  await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" })
  await page
    .waitForFunction(
      () =>
        !/Loading classrooms|Loading QR-ready classrooms|Loading live roster|Loading student support|Loading device recovery|Loading session state|Loading reports|Loading session history/.test(
          document.body.innerText,
        ),
      undefined,
      { timeout: 6_000 },
    )
    .catch(() => undefined)
  await page.screenshot({ path: filePath, fullPage: true })
  console.log(`Captured ${route} -> ${target}`)
}

async function login(page, role) {
  const credentials = role === "admin" ? adminCredentials : teacherCredentials
  const loginPath = role === "admin" ? "/admin/login" : "/login"

  await page.goto(`${baseUrl}${loginPath}`, { waitUntil: "networkidle" })
  await page.getByLabel("Email").fill(credentials.email)
  await page.getByLabel("Password").fill(credentials.password)
  await page.getByRole("button", { name: /sign in/i }).click()
  await page.waitForURL(
    (url) => url.pathname.startsWith(role === "admin" ? "/admin" : "/teacher"),
    {
      timeout: 20_000,
    },
  )
}

async function findFirstClassroomBasePath(page) {
  await page.waitForFunction(
    () => !document.body.innerText.includes("Loading classrooms..."),
    undefined,
    { timeout: 20_000 },
  )

  const links = await page
    .locator('a[href*="/teacher/classrooms/"]')
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("href")).filter(Boolean),
    )

  return (
    links.find((href) => /^\/teacher\/classrooms\/[^/]+$/.test(href) && !href.endsWith("/new")) ??
    null
  )
}

async function createOrOpenLiveQrSession(page) {
  await page.goto(`${baseUrl}/teacher/sessions/start`, { waitUntil: "networkidle" })
  await page.waitForFunction(
    () => !document.body.innerText.includes("Loading QR-ready classrooms..."),
    undefined,
    { timeout: 20_000 },
  )

  const classroomSelect = page.locator("select").first()
  await classroomSelect.waitFor({ state: "visible", timeout: 20_000 })
  await classroomSelect.selectOption({ index: 0 })
  await page.getByLabel("Session duration (minutes)").fill("20")
  await page.getByLabel("Allowed distance (meters)").fill("75")
  await page.getByRole("button", { name: /use browser location/i }).click()
  await page.waitForFunction(
    () => document.body.innerText.includes("Teacher location confirmed for this live session."),
    undefined,
    { timeout: 20_000 },
  )
  await page.getByRole("button", { name: /start qr session/i }).click()
  await page.waitForURL(/\/teacher\/sessions\/active\/[^/]+$/, { timeout: 20_000 })

  return new URL(page.url()).pathname
}

async function captureTeacherScreens(browser) {
  const context = await browser.newContext({
    viewport,
    geolocation: { latitude: 28.6139, longitude: 77.209 },
  })
  await context.grantPermissions(["geolocation"], { origin: baseUrl })
  const page = await context.newPage()

  await captureRoute(page, "/login", "Structure/artifacts/full-product-audit/web/teacher/login.png")
  await captureRoute(
    page,
    "/register",
    "Structure/artifacts/full-product-audit/web/teacher/register.png",
  )

  await login(page, "teacher")

  await captureRoute(
    page,
    "/teacher/dashboard",
    "Structure/artifacts/full-product-audit/web/teacher/dashboard.png",
  )
  await captureRoute(
    page,
    "/teacher/classrooms",
    "Structure/artifacts/full-product-audit/web/teacher/classrooms-list.png",
  )
  const classroomBasePath = await findFirstClassroomBasePath(page)
  await captureRoute(
    page,
    "/teacher/classrooms/new",
    "Structure/artifacts/full-product-audit/web/teacher/classroom-create.png",
  )

  if (classroomBasePath) {
    await captureRoute(
      page,
      classroomBasePath,
      "Structure/artifacts/full-product-audit/web/teacher/classroom-detail.png",
    )
    await captureRoute(
      page,
      `${classroomBasePath}/roster`,
      "Structure/artifacts/full-product-audit/web/teacher/roster.png",
    )
    await captureRoute(
      page,
      `${classroomBasePath}/schedule`,
      "Structure/artifacts/full-product-audit/web/teacher/schedule.png",
    )
    await captureRoute(
      page,
      `${classroomBasePath}/stream`,
      "Structure/artifacts/full-product-audit/web/teacher/stream.png",
    )
    await captureRoute(
      page,
      `${classroomBasePath}/lectures`,
      "Structure/artifacts/full-product-audit/web/teacher/lectures.png",
    )
  }

  await captureRoute(
    page,
    "/teacher/sessions/start",
    "Structure/artifacts/full-product-audit/web/teacher/qr-setup.png",
  )
  try {
    const liveSessionPath = await createOrOpenLiveQrSession(page)
    await captureRoute(
      page,
      liveSessionPath,
      "Structure/artifacts/full-product-audit/web/teacher/qr-live.png",
    )
    await captureRoute(
      page,
      `${liveSessionPath}/projector`,
      "Structure/artifacts/full-product-audit/web/teacher/qr-projector.png",
    )
  } catch (error) {
    console.warn(
      `[audit-warning] Could not open a live QR session automatically: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }

  await captureRoute(
    page,
    "/teacher/sessions/history",
    "Structure/artifacts/full-product-audit/web/teacher/session-history.png",
  )
  await captureRoute(
    page,
    "/teacher/reports",
    "Structure/artifacts/full-product-audit/web/teacher/reports.png",
  )
  await captureRoute(
    page,
    "/teacher/exports",
    "Structure/artifacts/full-product-audit/web/teacher/exports.png",
  )
  await captureRoute(
    page,
    "/teacher/analytics",
    "Structure/artifacts/full-product-audit/web/teacher/analytics.png",
  )
  await captureRoute(
    page,
    "/teacher/email-automation",
    "Structure/artifacts/full-product-audit/web/teacher/email-automation.png",
  )

  await context.close()
}

async function captureAdminScreens(browser) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()

  await captureRoute(
    page,
    "/admin/login",
    "Structure/artifacts/full-product-audit/web/admin/login.png",
  )

  await login(page, "admin")
  await captureRoute(
    page,
    "/admin/dashboard",
    "Structure/artifacts/full-product-audit/web/admin/dashboard.png",
  )
  await captureRoute(
    page,
    "/admin/devices?view=support",
    "Structure/artifacts/full-product-audit/web/admin/student-support.png",
  )
  await captureRoute(
    page,
    "/admin/devices",
    "Structure/artifacts/full-product-audit/web/admin/device-recovery.png",
  )
  await captureRoute(
    page,
    "/admin/imports",
    "Structure/artifacts/full-product-audit/web/admin/imports.png",
  )
  await captureRoute(
    page,
    "/admin/semesters",
    "Structure/artifacts/full-product-audit/web/admin/governance.png",
  )

  await context.close()
}

const browser = await chromium.launch({
  headless: true,
  executablePath: chromeExecutable,
})

try {
  await captureTeacherScreens(browser)
  await captureAdminScreens(browser)
} finally {
  await browser.close()
}

console.log(`Captured ${webPlan.length} web audit entries.`)
