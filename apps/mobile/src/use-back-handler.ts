import { useEffect, useRef } from "react"
import { BackHandler, Platform, ToastAndroid } from "react-native"

/**
 * Exit the app immediately on hardware back press.
 * Use on the root landing screen where there is no meaningful "back" destination.
 * No-op on iOS (iOS has no system back button).
 */
export function useExitOnBack() {
  useEffect(() => {
    if (Platform.OS !== "android") return

    const onBack = () => {
      BackHandler.exitApp()
      return true
    }

    const sub = BackHandler.addEventListener("hardwareBackPress", onBack)
    return () => sub.remove()
  }, [])
}

/**
 * "Press back again to exit" pattern for home / dashboard tab screens.
 * First press shows a toast, second press within 2 seconds exits the app.
 * Prevents navigating back to the landing / sign-in screens while logged in.
 * No-op on iOS.
 */
export function useDoubleBackToExit() {
  const lastBackPress = useRef(0)

  useEffect(() => {
    if (Platform.OS !== "android") return

    const onBack = () => {
      const now = Date.now()
      if (now - lastBackPress.current < 2000) {
        BackHandler.exitApp()
        return true
      }
      lastBackPress.current = now
      ToastAndroid.show("Press back again to exit", ToastAndroid.SHORT)
      return true // prevent default back navigation
    }

    const sub = BackHandler.addEventListener("hardwareBackPress", onBack)
    return () => sub.remove()
  }, [])
}

/**
 * Block the hardware back button entirely.
 * Use on screens where accidental back press could lose important state
 * (e.g. active bluetooth broadcasting).
 * No-op on iOS.
 */
export function useBlockBack() {
  useEffect(() => {
    if (Platform.OS !== "android") return

    const onBack = () => true // consume the event, do nothing

    const sub = BackHandler.addEventListener("hardwareBackPress", onBack)
    return () => sub.remove()
  }, [])
}
