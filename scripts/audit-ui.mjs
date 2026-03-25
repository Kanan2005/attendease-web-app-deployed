import path from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"

const BASE = "http://localhost:3000"
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "audit-screenshots")

async function run() {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()

  // Sign in
  await page.goto(`${BASE}/auth/sign-in`)
  await page.waitForLoadState("networkidle")
  await page.screenshot({ path: `${OUT}/01-sign-in.png` })

  // Try to fill credentials
  const emailInput = page.locator(
    'input[type="email"], input[name="email"], input[placeholder*="email" i]',
  )
  const pwInput = page.locator('input[type="password"]')
  if ((await emailInput.count()) > 0 && (await pwInput.count()) > 0) {
    await emailInput.fill("teacher@attendease.dev")
    await pwInput.fill("TeacherPass123!")
    await page.locator('button[type="submit"]').click()
    await page.waitForURL("**/teacher/**", { timeout: 15000 }).catch(() => {})
    await page.waitForLoadState("networkidle")
  }

  // After sign-in — should redirect to classrooms
  await page.screenshot({ path: `${OUT}/02-after-signin.png`, fullPage: true })
  console.log("Current URL after sign-in:", page.url())

  // Classrooms list
  await page.goto(`${BASE}/teacher/classrooms`)
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/03-classrooms-list.png`, fullPage: true })

  // Find first classroom link and click it
  const classroomLink = page.locator('a[href*="/teacher/classrooms/"]').first()
  if ((await classroomLink.count()) > 0) {
    const href = await classroomLink.getAttribute("href")
    console.log("First classroom href:", href)
    await classroomLink.click()
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(1000)
    await page.screenshot({ path: `${OUT}/04-classroom-detail-sessions.png`, fullPage: true })
    console.log("Classroom detail URL:", page.url())

    // Extract classroomId from URL
    const match = page.url().match(/classrooms\/([^/]+)/)
    const classroomId = match?.[1]

    if (classroomId) {
      // Students tab
      await page.goto(`${BASE}/teacher/classrooms/${classroomId}/roster`)
      await page.waitForLoadState("networkidle")
      await page.waitForTimeout(1000)
      await page.screenshot({ path: `${OUT}/05-classroom-students.png`, fullPage: true })

      // Announcements tab
      await page.goto(`${BASE}/teacher/classrooms/${classroomId}/stream`)
      await page.waitForLoadState("networkidle")
      await page.waitForTimeout(1000)
      await page.screenshot({ path: `${OUT}/06-classroom-announcements.png`, fullPage: true })

      // Reports tab
      await page.goto(`${BASE}/teacher/classrooms/${classroomId}/reports`)
      await page.waitForLoadState("networkidle")
      await page.waitForTimeout(1500)
      await page.screenshot({ path: `${OUT}/07-classroom-reports.png`, fullPage: true })

      // Click into first lecture session if available
      await page.goto(`${BASE}/teacher/classrooms/${classroomId}/lectures`)
      await page.waitForLoadState("networkidle")
      await page.waitForTimeout(1000)
      const sessionLink = page.locator('a[href*="/lectures/"]').first()
      if ((await sessionLink.count()) > 0) {
        await sessionLink.click()
        await page.waitForLoadState("networkidle")
        await page.waitForTimeout(1000)
        await page.screenshot({ path: `${OUT}/08-lecture-session-detail.png`, fullPage: true })
        console.log("Session detail URL:", page.url())
      }
    }
  }

  // Check top nav
  const navLinks = await page.locator("nav a, header a").allTextContents()
  console.log("Nav links visible:", navLinks.filter((t) => t.trim()).join(", "))

  await browser.close()
  console.log("\nAll screenshots saved to:", OUT)
}

run().catch((e) => {
  console.error("Error:", e.message)
  process.exit(1)
})
