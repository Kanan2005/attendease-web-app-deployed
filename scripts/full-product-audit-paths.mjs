import path from "node:path"

export const auditRoot = "Structure/artifacts/full-product-audit"

export function mobilePath(...segments) {
  return path.posix.join(auditRoot, "mobile", ...segments)
}

export function webPath(...segments) {
  return path.posix.join(auditRoot, "web", ...segments)
}
