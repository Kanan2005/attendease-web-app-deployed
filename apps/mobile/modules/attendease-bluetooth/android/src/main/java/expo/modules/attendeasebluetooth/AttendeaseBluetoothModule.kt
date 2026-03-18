package expo.modules.attendeasebluetooth

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.os.Handler
import android.os.Looper
import android.os.ParcelUuid
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.nio.charset.StandardCharsets
import java.util.UUID
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec
import org.json.JSONObject

class AttendeaseBluetoothModule : Module() {
  private val handler = Handler(Looper.getMainLooper())

  private var advertiser: BluetoothLeAdvertiser? = null
  private var advertiserCallback: AdvertiseCallback? = null
  private var advertiserConfig: AdvertiserConfig? = null
  private var rotationRunnable: Runnable? = null

  private var scanner: BluetoothLeScanner? = null
  private var scanCallback: ScanCallback? = null
  private var scanServiceUuid: ParcelUuid? = null

  override fun definition() = ModuleDefinition {
    Name("AttendeaseBluetooth")

    Events("onDetection", "onAdvertiserState", "onScannerState")

    AsyncFunction("getAvailability") {
      val adapter = getBluetoothAdapter()
      mapOf(
        "supported" to (adapter != null),
        "poweredOn" to (adapter?.isEnabled == true),
        "canAdvertise" to (adapter?.bluetoothLeAdvertiser != null),
        "canScan" to (adapter?.bluetoothLeScanner != null),
      )
    }

    AsyncFunction("startAdvertising") { rawConfig: Map<String, Any?> ->
      val config = AdvertiserConfig.fromMap(rawConfig)
      val adapter = requireEnabledAdapter()
      val nextAdvertiser =
        adapter.bluetoothLeAdvertiser ?: throw CodedException("ERR_BLUETOOTH_UNAVAILABLE", "BLE advertising is unavailable on this device.", null)

      advertiser = nextAdvertiser
      advertiserConfig = config
      startAdvertisingSlice(config)
      scheduleRotation(config)

      mapOf(
        "state" to "ADVERTISING",
        "publicId" to config.publicId,
        "serviceUuid" to config.serviceUuid,
      )
    }

    AsyncFunction("stopAdvertising") {
      stopAdvertisingInternal("STOPPED")
      mapOf("state" to "STOPPED")
    }

    AsyncFunction("startScanning") { rawConfig: Map<String, Any?> ->
      val adapter = requireEnabledAdapter()
      val nextScanner =
        adapter.bluetoothLeScanner ?: throw CodedException("ERR_BLUETOOTH_UNAVAILABLE", "BLE scanning is unavailable on this device.", null)
      val serviceUuid = ParcelUuid(UUID.fromString(rawConfig.requireString("serviceUuid")))

      stopScanningInternal(sendEvent = false)
      scanner = nextScanner
      scanServiceUuid = serviceUuid

      // Match on service data UUID (not service UUID list) because the advertiser
      // only includes the UUID in service data to save space in the 31-byte BLE packet.
      val filters = listOf(ScanFilter.Builder().setServiceData(serviceUuid, null).build())
      val settings =
        ScanSettings.Builder()
          .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
          .build()

      val callback =
        object : ScanCallback() {
          override fun onScanResult(callbackType: Int, result: ScanResult) {
            val payloadBytes = result.scanRecord?.getServiceData(serviceUuid) ?: return
            sendEvent(
              "onDetection",
              mapOf(
                "payload" to String(payloadBytes, StandardCharsets.UTF_8),
                "rssi" to result.rssi,
                "serviceUuid" to serviceUuid.uuid.toString(),
                "detectedAt" to System.currentTimeMillis(),
              ),
            )
          }

          override fun onScanFailed(errorCode: Int) {
            sendEvent(
              "onScannerState",
              mapOf(
                "state" to "FAILED",
                "errorCode" to errorCode,
              ),
            )
          }
        }

      scanCallback = callback
      nextScanner.startScan(filters, settings, callback)
      sendEvent("onScannerState", mapOf("state" to "SCANNING"))

      mapOf("state" to "SCANNING")
    }

    AsyncFunction("stopScanning") {
      stopScanningInternal(sendEvent = true)
      mapOf("state" to "STOPPED")
    }

    OnDestroy {
      stopAdvertisingInternal("STOPPED")
      stopScanningInternal(sendEvent = false)
    }
  }

  private fun getBluetoothAdapter(): BluetoothAdapter? {
    val manager = appContext.reactContext?.getSystemService(BluetoothManager::class.java)
    return manager?.adapter
  }

  private fun requireEnabledAdapter(): BluetoothAdapter {
    val adapter = getBluetoothAdapter()
      ?: throw CodedException("ERR_BLUETOOTH_UNAVAILABLE", "Bluetooth is not supported on this device.", null)

    if (!adapter.isEnabled) {
      throw CodedException("ERR_BLUETOOTH_DISABLED", "Bluetooth is turned off.", null)
    }

    return adapter
  }

  private fun scheduleRotation(config: AdvertiserConfig) {
    rotationRunnable?.let(handler::removeCallbacks)

    val runnable =
      object : Runnable {
        override fun run() {
          startAdvertisingSlice(config)
          handler.postDelayed(this, config.rotationWindowSeconds * 1000L)
        }
      }

    rotationRunnable = runnable
    handler.postDelayed(runnable, config.rotationWindowSeconds * 1000L)
  }

  private fun startAdvertisingSlice(config: AdvertiserConfig) {
    val nextAdvertiser =
      advertiser ?: throw CodedException("ERR_BLUETOOTH_UNAVAILABLE", "BLE advertising is unavailable on this device.", null)
    val serviceUuid = ParcelUuid(UUID.fromString(config.serviceUuid))
    val payload = buildPayload(config)
    val payloadBytes = payload.toByteArray(StandardCharsets.UTF_8)
    android.util.Log.d("AttendeaseBLE", "Service data: UUID(16) + payload(${payloadBytes.size}) = ${16 + payloadBytes.size} bytes")
    val advertiseData =
      AdvertiseData.Builder()
        .setIncludeDeviceName(false)
        .setIncludeTxPowerLevel(false)
        // NOTE: Do NOT call addServiceUuid() — it adds 18 extra bytes and exceeds the 31-byte BLE limit.
        // The UUID is already embedded inside addServiceData().
        .addServiceData(serviceUuid, payloadBytes)
        .build()
    val advertiseSettings =
      AdvertiseSettings.Builder()
        .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
        .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM)
        .setConnectable(false)
        .build()

    advertiserCallback?.let { nextAdvertiser.stopAdvertising(it) }

    val callback =
      object : AdvertiseCallback() {
        override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {
          sendEvent(
            "onAdvertiserState",
            mapOf(
              "state" to "ADVERTISING",
              "payload" to payload,
              "publicId" to config.publicId,
            ),
          )
        }

        override fun onStartFailure(errorCode: Int) {
          sendEvent(
            "onAdvertiserState",
            mapOf(
              "state" to "FAILED",
              "errorCode" to errorCode,
            ),
          )
        }
      }

    advertiserCallback = callback
    nextAdvertiser.startAdvertising(advertiseSettings, advertiseData, callback)
  }

  private fun stopAdvertisingInternal(state: String) {
    rotationRunnable?.let(handler::removeCallbacks)
    rotationRunnable = null
    advertiserCallback?.let { callback ->
      advertiser?.stopAdvertising(callback)
    }
    advertiserCallback = null

    sendEvent("onAdvertiserState", mapOf("state" to state))
  }

  private fun stopScanningInternal(sendEvent: Boolean) {
    val currentScanner = scanner
    val currentCallback = scanCallback

    if (currentScanner != null && currentCallback != null) {
      currentScanner.stopScan(currentCallback)
    }

    scanCallback = null
    scanServiceUuid = null

    if (sendEvent) {
      sendEvent("onScannerState", mapOf("state" to "STOPPED"))
    }
  }

  private fun buildPayload(config: AdvertiserConfig): String {
    val slice = System.currentTimeMillis() / (config.rotationWindowSeconds * 1000L)
    val eid = createEphemeralId(config, slice)
    
    // Ultra-compact format: pid4 + eid8 = 12 hex chars = 12 bytes
    // The slice is embedded in the eid computation, so we don't need to transmit it separately
    val pidShort = config.publicId.take(4)
    val eidShort = eid.take(8)
    val payload = "$pidShort$eidShort"
    
    android.util.Log.d("AttendeaseBLE", "Payload: $payload (${payload.length} chars, ${payload.toByteArray().size} bytes)")
    return payload
  }

  private fun createEphemeralId(config: AdvertiserConfig, slice: Long): String {
    val mac = Mac.getInstance("HmacSHA256")
    val secret = SecretKeySpec(config.seed.toByteArray(StandardCharsets.UTF_8), "HmacSHA256")
    mac.init(secret)
    val digest =
      mac.doFinal(
        "v${config.protocolVersion}:${config.publicId}:$slice".toByteArray(StandardCharsets.UTF_8),
      )

    return digest.joinToString(separator = "") { byte -> "%02x".format(byte) }
  }

  private data class AdvertiserConfig(
    val serviceUuid: String,
    val publicId: String,
    val seed: String,
    val protocolVersion: Int,
    val rotationWindowSeconds: Int,
  ) {
    companion object {
      fun fromMap(raw: Map<String, Any?>): AdvertiserConfig =
        AdvertiserConfig(
          serviceUuid = raw.requireString("serviceUuid"),
          publicId = raw.requireString("publicId"),
          seed = raw.requireString("seed"),
          protocolVersion = raw.requireInt("protocolVersion"),
          rotationWindowSeconds = raw.requireInt("rotationWindowSeconds"),
        )
    }
  }

  private companion object {
    fun Map<String, Any?>.requireString(key: String): String {
      val value = this[key] as? String

      if (value.isNullOrBlank()) {
        throw CodedException("ERR_INVALID_ARGUMENT", "Missing required Bluetooth field: $key.", null)
      }

      return value
    }

    fun Map<String, Any?>.requireInt(key: String): Int {
      val value = this[key]

      return when (value) {
        is Int -> value
        is Double -> value.toInt()
        is Long -> value.toInt()
        else ->
          throw CodedException("ERR_INVALID_ARGUMENT", "Missing required Bluetooth field: $key.", null)
      }
    }
  }
}
