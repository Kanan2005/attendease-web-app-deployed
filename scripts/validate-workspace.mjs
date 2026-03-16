import fs from "node:fs"
import path from "node:path"

const rootDirectory = process.cwd()

const workspaceGroups = [
  {
    kind: "app",
    directory: path.join(rootDirectory, "apps"),
    requiredScripts: ["dev", "build", "lint", "typecheck", "test"],
    extraRules(folderName, scripts) {
      const issues = []

      if (folderName === "api" || folderName === "web" || folderName === "worker") {
        if (!scripts.start) {
          issues.push(`${folderName}: missing required start script`)
        }
      }

      if (folderName === "worker" && !scripts.health) {
        issues.push("worker: missing required health script")
      }

      if (folderName === "mobile" && !scripts.start) {
        issues.push("mobile: missing required start script")
      }

      if (folderName === "api" && !scripts["test:integration"]) {
        issues.push("api: missing required test:integration script")
      }

      return issues
    },
  },
  {
    kind: "package",
    directory: path.join(rootDirectory, "packages"),
    requiredScripts: ["dev", "build", "lint", "typecheck", "test"],
    extraRules() {
      return []
    },
  },
]

const errors = []
const seenPackageNames = new Set()

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"))
}

function ensureFileIncludes(filePath, marker, label) {
  if (!fs.existsSync(filePath)) {
    errors.push(`${label}: missing ${path.relative(rootDirectory, filePath)}`)
    return
  }

  const contents = fs.readFileSync(filePath, "utf8")
  if (!contents.includes(marker)) {
    errors.push(
      `${label}: expected marker "${marker}" in ${path.relative(rootDirectory, filePath)}`,
    )
  }
}

for (const group of workspaceGroups) {
  const folders = fs
    .readdirSync(group.directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()

  for (const folderName of folders) {
    const packageDirectory = path.join(group.directory, folderName)
    const packageJsonPath = path.join(packageDirectory, "package.json")
    const tsconfigPath = path.join(packageDirectory, "tsconfig.json")

    if (!fs.existsSync(packageJsonPath)) {
      errors.push(`${group.kind} ${folderName}: missing package.json`)
      continue
    }

    if (!fs.existsSync(tsconfigPath)) {
      errors.push(`${group.kind} ${folderName}: missing tsconfig.json`)
    }

    if (group.kind === "app") {
      const envExamplePath = path.join(packageDirectory, ".env.example")
      if (!fs.existsSync(envExamplePath)) {
        errors.push(`app ${folderName}: missing .env.example`)
      }
    }

    const manifest = readJson(packageJsonPath)
    const expectedName = `@attendease/${folderName}`
    const scripts = manifest.scripts ?? {}

    if (manifest.name !== expectedName) {
      errors.push(
        `${group.kind} ${folderName}: expected package name ${expectedName}, found ${manifest.name}`,
      )
    }

    if (seenPackageNames.has(manifest.name)) {
      errors.push(`${group.kind} ${folderName}: duplicate package name ${manifest.name}`)
    } else {
      seenPackageNames.add(manifest.name)
    }

    if (manifest.private !== true) {
      errors.push(`${group.kind} ${folderName}: package must be private`)
    }

    for (const requiredScript of group.requiredScripts) {
      if (!scripts[requiredScript]) {
        errors.push(`${group.kind} ${folderName}: missing required script ${requiredScript}`)
      }
    }

    for (const issue of group.extraRules(folderName, scripts)) {
      errors.push(issue)
    }

    if (group.kind === "app" && (folderName === "api" || folderName === "worker")) {
      const buildTsconfigPath = path.join(packageDirectory, "tsconfig.build.json")
      if (!fs.existsSync(buildTsconfigPath)) {
        errors.push(`app ${folderName}: missing tsconfig.build.json`)
      }
    }
  }
}

if (!fs.existsSync(path.join(rootDirectory, ".env.example"))) {
  errors.push("root: missing .env.example")
}

const rootManifest = readJson(path.join(rootDirectory, "package.json"))
const rootScripts = rootManifest.scripts ?? {}

for (const requiredRootScript of [
  "test:api:targeted",
  "test:api:integration",
  "test:mobile:targeted",
  "test:web:targeted",
  "android:validate:help",
  "android:validate",
  "manual:mobile:emulator",
  "audit:matrix",
  "audit:screenshots:mobile",
  "audit:screenshots:web",
]) {
  if (!rootScripts[requiredRootScript]) {
    errors.push(`root: missing required script ${requiredRootScript}`)
  }
}

if (!fs.existsSync(path.join(rootDirectory, "docker-compose.yml"))) {
  errors.push("root: missing docker-compose.yml")
}

if (!fs.existsSync(path.join(rootDirectory, "docker-compose.runtime.yml"))) {
  errors.push("root: missing docker-compose.runtime.yml")
}

if (!fs.existsSync(path.join(rootDirectory, "Structure", "ux-redesign-audit.md"))) {
  errors.push("Structure: missing ux-redesign-audit.md")
}

if (!fs.existsSync(path.join(rootDirectory, "Structure", "full-product-screenshot-audit.md"))) {
  errors.push("Structure: missing full-product-screenshot-audit.md")
}

ensureFileIncludes(
  path.join(rootDirectory, "Structure", "ux-redesign-audit.md"),
  "Locked Product Decisions For The Reset Track",
  "Structure",
)
ensureFileIncludes(
  path.join(rootDirectory, "Structure", "ux-redesign-audit.md"),
  "Final Reset IA Decisions",
  "Structure",
)
ensureFileIncludes(
  path.join(rootDirectory, "Structure", "ux-redesign-audit.md"),
  "Canonical Product Naming",
  "Structure",
)
ensureFileIncludes(
  path.join(rootDirectory, "Structure", "ux-redesign-audit.md"),
  "Reset Implementation Status",
  "Structure",
)
ensureFileIncludes(
  path.join(rootDirectory, "Structure", "ux-redesign-audit.md"),
  "Remaining Reset Gaps",
  "Structure",
)
ensureFileIncludes(
  path.join(rootDirectory, "Structure", "context.md"),
  "Reset Track Status",
  "Structure",
)
ensureFileIncludes(
  path.join(rootDirectory, "Structure", "full-product-screenshot-audit.md"),
  "Full Product Screenshot Audit",
  "Structure",
)
ensureFileIncludes(
  path.join(rootDirectory, "Structure", "requirements", "01-system-overview.md"),
  "Reset Baseline Clarifications",
  "Structure",
)
ensureFileIncludes(
  path.join(rootDirectory, "Structure", "architecture", "01-system-overview.md"),
  "Reset Baseline Constraints",
  "Structure",
)
ensureFileIncludes(
  path.join(rootDirectory, "Structure", "requirements", "02-auth-roles-enrollment.md"),
  "Final Reset Auth Flows",
  "Structure",
)
ensureFileIncludes(
  path.join(rootDirectory, "Structure", "requirements", "02-auth-roles-enrollment.md"),
  "Reset Contract Boundary Requirements",
  "Structure",
)
ensureFileIncludes(
  path.join(rootDirectory, "Structure", "requirements", "03-student-mobile-app.md"),
  "Final Reset Student IA",
  "Structure",
)
ensureFileIncludes(
  path.join(rootDirectory, "Structure", "requirements", "04-teacher-mobile-app.md"),
  "Final Reset Teacher-Mobile IA",
  "Structure",
)
ensureFileIncludes(
  path.join(rootDirectory, "Structure", "requirements", "05-teacher-web-app.md"),
  "Final Reset Web IA",
  "Structure",
)
ensureFileIncludes(
  path.join(rootDirectory, "Structure", "architecture", "02-auth-roles-enrollment.md"),
  "Reset Role Entry Map",
  "Structure",
)
ensureFileIncludes(
  path.join(rootDirectory, "Structure", "architecture", "02-auth-roles-enrollment.md"),
  "Reset Contract Migration Foundation",
  "Structure",
)
ensureFileIncludes(
  path.join(rootDirectory, "Structure", "architecture", "03-student-mobile-app.md"),
  "Final Student Route Map",
  "Structure",
)
ensureFileIncludes(
  path.join(rootDirectory, "Structure", "architecture", "04-teacher-mobile-app.md"),
  "Final Teacher-Mobile Route Map",
  "Structure",
)
ensureFileIncludes(
  path.join(rootDirectory, "Structure", "architecture", "05-teacher-web-app.md"),
  "Final Web Route Map",
  "Structure",
)
ensureFileIncludes(
  path.join(rootDirectory, "Structure", "context.md"),
  "Prompt 4 Summary",
  "Structure",
)
ensureFileIncludes(
  path.join(rootDirectory, "Structure", "context.md"),
  "Prompt 5 Summary",
  "Structure",
)
ensureFileIncludes(
  path.join(rootDirectory, "Structure", "testing-strategy.md"),
  "Reset Track Targeted Validation Baseline",
  "Structure",
)
ensureFileIncludes(
  path.join(rootDirectory, "Structure", "testing-strategy.md"),
  "Reset Documentation Validation Baseline",
  "Structure",
)
ensureFileIncludes(
  path.join(rootDirectory, "README.md"),
  "Current Reset Product State",
  "Structure",
)
ensureFileIncludes(path.join(rootDirectory, "guide.md"), "Reset Product Reality Check", "Structure")
ensureFileIncludes(
  path.join(rootDirectory, "Structure", "context.md"),
  "Prompt 39 Summary",
  "Structure",
)

for (const requirementFileName of [
  "01-system-overview.md",
  "02-auth-roles-enrollment.md",
  "03-student-mobile-app.md",
  "04-teacher-mobile-app.md",
  "05-teacher-web-app.md",
  "06-qr-gps-attendance.md",
  "07-bluetooth-attendance.md",
  "08-session-history-manual-edits.md",
  "09-reports-exports.md",
  "11-data-rules-audit.md",
]) {
  ensureFileIncludes(
    path.join(rootDirectory, "Structure", "requirements", requirementFileName),
    "Reset Implementation Status",
    "Structure",
  )
}

for (const architectureFileName of [
  "01-system-overview.md",
  "02-auth-roles-enrollment.md",
  "03-student-mobile-app.md",
  "04-teacher-mobile-app.md",
  "05-teacher-web-app.md",
  "06-qr-gps-attendance.md",
  "07-bluetooth-attendance.md",
  "08-session-history-manual-edits.md",
  "09-reports-exports.md",
  "11-data-rules-audit.md",
  "13-academic-management-and-scheduling.md",
  "14-classroom-communications-and-roster.md",
  "15-device-trust-and-admin-controls.md",
]) {
  ensureFileIncludes(
    path.join(rootDirectory, "Structure", "architecture", architectureFileName),
    "Reset Implementation Snapshot",
    "Structure",
  )
}

if (errors.length > 0) {
  console.error("Workspace validation failed:")
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log("Workspace validation passed.")
