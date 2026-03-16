import { cp, mkdir } from "node:fs/promises"
import path from "node:path"

import { getMobileScreenshotCopyPlan } from "./full-product-audit-lib.mjs"

const root = process.cwd()
const copyPlan = getMobileScreenshotCopyPlan()

for (const entry of copyPlan) {
  const sourcePath = path.resolve(root, entry.source)
  const targetPath = path.resolve(root, entry.target)

  await mkdir(path.dirname(targetPath), { recursive: true })
  await cp(sourcePath, targetPath)
  console.log(`Copied ${entry.id}: ${entry.source} -> ${entry.target}`)
}
