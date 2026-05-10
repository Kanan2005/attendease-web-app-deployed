import { AdminDashboardScreen } from "../../src/admin-foundation"
import { useDoubleBackToExit } from "../../src/use-back-handler"

export default function AdminDashboardRoute() {
  useDoubleBackToExit()
  return <AdminDashboardScreen />
}
