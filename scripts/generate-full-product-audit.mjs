import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import { buildAuditMarkdown } from "./full-product-audit-lib.mjs"

const outputPath = path.resolve(process.cwd(), "Structure/full-product-screenshot-audit.md")

await mkdir(path.dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${buildAuditMarkdown()}\n`, "utf8")

console.log(`Wrote ${outputPath}`)
