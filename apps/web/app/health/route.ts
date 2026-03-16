import { NextResponse } from "next/server"

import { buildWebHealthPayload } from "../../src/health"

export async function GET() {
  return NextResponse.json(buildWebHealthPayload())
}
