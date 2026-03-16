import CoreBluetooth
import CryptoKit
import ExpoModulesCore

public final class AttendeaseBluetoothModule: Module, CBPeripheralManagerDelegate, CBCentralManagerDelegate {
  private var peripheralManager: CBPeripheralManager?
  private var centralManager: CBCentralManager?
  private var advertiserConfig: AdvertiserConfig?
  private var scanServiceUuid: CBUUID?
  private var rotationTimer: Timer?

  public func definition() -> ModuleDefinition {
    Name("AttendeaseBluetooth")

    Events("onDetection", "onAdvertiserState", "onScannerState")

    AsyncFunction("getAvailability") { () -> [String: Any] in
      return self.buildAvailabilityPayload()
    }

    AsyncFunction("startAdvertising") { (rawConfig: [String: Any]) throws -> [String: Any] in
      let config = try AdvertiserConfig(rawConfig: rawConfig)
      let manager = self.requirePeripheralManager()

      guard manager.state == .poweredOn else {
        throw Exception(name: "ERR_BLUETOOTH_DISABLED", description: "Bluetooth is not powered on.")
      }

      self.advertiserConfig = config
      self.startAdvertisingSlice(config)
      self.scheduleRotation(for: config)

      return [
        "state": "ADVERTISING",
        "publicId": config.publicId,
        "serviceUuid": config.serviceUuid.uuidString.lowercased(),
      ]
    }

    AsyncFunction("stopAdvertising") { () -> [String: Any] in
      self.stopAdvertisingInternal(state: "STOPPED")
      return [
        "state": "STOPPED",
      ]
    }

    AsyncFunction("startScanning") { (rawConfig: [String: Any]) throws -> [String: Any] in
      guard let rawServiceUuid = rawConfig["serviceUuid"] as? String,
            let serviceUuid = UUID(uuidString: rawServiceUuid)
      else {
        throw Exception(name: "ERR_INVALID_ARGUMENT", description: "Bluetooth serviceUuid is required.")
      }

      let manager = self.requireCentralManager()

      guard manager.state == .poweredOn else {
        throw Exception(name: "ERR_BLUETOOTH_DISABLED", description: "Bluetooth is not powered on.")
      }

      self.scanServiceUuid = CBUUID(nsuuid: serviceUuid)
      manager.stopScan()
      manager.scanForPeripherals(
        withServices: [self.scanServiceUuid!],
        options: [CBCentralManagerScanOptionAllowDuplicatesKey: true]
      )
      self.sendEvent("onScannerState", [
        "state": "SCANNING",
      ])

      return [
        "state": "SCANNING",
      ]
    }

    AsyncFunction("stopScanning") { () -> [String: Any] in
      self.stopScanningInternal(shouldEmitStateEvent: true)
      return [
        "state": "STOPPED",
      ]
    }

    OnDestroy {
      self.stopAdvertisingInternal(state: "STOPPED")
      self.stopScanningInternal(shouldEmitStateEvent: false)
    }
  }

  public func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
    if peripheral.state != .poweredOn {
      sendEvent("onAdvertiserState", [
        "state": "UNAVAILABLE",
        "nativeState": bluetoothStateLabel(peripheral.state),
      ])
    }
  }

  public func peripheralManagerDidStartAdvertising(
    _ peripheral: CBPeripheralManager,
    error: Error?
  ) {
    if let error {
      sendEvent("onAdvertiserState", [
        "state": "FAILED",
        "message": error.localizedDescription,
      ])
      return
    }

    sendEvent("onAdvertiserState", [
      "state": "ADVERTISING",
    ])
  }

  public func centralManagerDidUpdateState(_ central: CBCentralManager) {
    if central.state != .poweredOn {
      sendEvent("onScannerState", [
        "state": "UNAVAILABLE",
        "nativeState": bluetoothStateLabel(central.state),
      ])
    }
  }

  public func centralManager(
    _ central: CBCentralManager,
    didDiscover peripheral: CBPeripheral,
    advertisementData: [String: Any],
    rssi RSSI: NSNumber
  ) {
    guard let scanServiceUuid,
          let serviceData = advertisementData[CBAdvertisementDataServiceDataKey] as? [CBUUID: Data],
          let payloadData = serviceData[scanServiceUuid],
          let payload = String(data: payloadData, encoding: .utf8)
    else {
      return
    }

    sendEvent("onDetection", [
      "payload": payload,
      "rssi": RSSI.intValue,
      "serviceUuid": scanServiceUuid.uuidString.lowercased(),
      "detectedAt": Int(Date().timeIntervalSince1970 * 1000),
    ])
  }

  private func requirePeripheralManager() -> CBPeripheralManager {
    if let peripheralManager {
      return peripheralManager
    }

    let nextManager = CBPeripheralManager(delegate: self, queue: nil, options: nil)
    peripheralManager = nextManager
    return nextManager
  }

  private func requireCentralManager() -> CBCentralManager {
    if let centralManager {
      return centralManager
    }

    let nextManager = CBCentralManager(delegate: self, queue: nil, options: nil)
    centralManager = nextManager
    return nextManager
  }

  private func buildAvailabilityPayload() -> [String: Any] {
    let peripheral = requirePeripheralManager()
    let central = requireCentralManager()

    return [
      "supported": true,
      "poweredOn": peripheral.state == .poweredOn && central.state == .poweredOn,
      "canAdvertise": peripheral.state != .unsupported,
      "canScan": central.state != .unsupported,
    ]
  }

  private func scheduleRotation(for config: AdvertiserConfig) {
    rotationTimer?.invalidate()
    rotationTimer = Timer.scheduledTimer(withTimeInterval: TimeInterval(config.rotationWindowSeconds), repeats: true) { [weak self] _ in
      self?.startAdvertisingSlice(config)
    }
  }

  private func startAdvertisingSlice(_ config: AdvertiserConfig) {
    let manager = requirePeripheralManager()
    let payload = buildPayload(config)
    let payloadData = Data(payload.utf8)

    manager.stopAdvertising()
    manager.startAdvertising([
      CBAdvertisementDataServiceUUIDsKey: [config.serviceUuid],
      CBAdvertisementDataServiceDataKey: [config.serviceUuid: payloadData],
    ])
  }

  private func stopAdvertisingInternal(state: String) {
    rotationTimer?.invalidate()
    rotationTimer = nil
    peripheralManager?.stopAdvertising()
    sendEvent("onAdvertiserState", [
      "state": state,
    ])
  }

  private func stopScanningInternal(shouldEmitStateEvent: Bool) {
    centralManager?.stopScan()
    scanServiceUuid = nil

    if shouldEmitStateEvent {
      sendEvent("onScannerState", [
        "state": "STOPPED",
      ])
    }
  }

  private func buildPayload(_ config: AdvertiserConfig) -> String {
    let slice = Int(Date().timeIntervalSince1970 / TimeInterval(config.rotationWindowSeconds))
    let ephemeralId = createEphemeralId(config: config, slice: slice)

    return """
    {"v":\(config.protocolVersion),"pid":"\(config.publicId)","ts":\(slice),"eid":"\(ephemeralId)"}
    """
  }

  private func createEphemeralId(config: AdvertiserConfig, slice: Int) -> String {
    let key = SymmetricKey(data: Data(config.seed.utf8))
    let message = Data("v\(config.protocolVersion):\(config.publicId):\(slice)".utf8)
    let digest = HMAC<SHA256>.authenticationCode(for: message, using: key)

    return digest.map { String(format: "%02x", $0) }.joined()
  }

  private func bluetoothStateLabel(_ state: CBManagerState) -> String {
    switch state {
    case .poweredOn:
      return "POWERED_ON"
    case .poweredOff:
      return "POWERED_OFF"
    case .resetting:
      return "RESETTING"
    case .unauthorized:
      return "UNAUTHORIZED"
    case .unsupported:
      return "UNSUPPORTED"
    case .unknown:
      fallthrough
    @unknown default:
      return "UNKNOWN"
    }
  }
}

private struct AdvertiserConfig {
  let serviceUuid: CBUUID
  let publicId: String
  let seed: String
  let protocolVersion: Int
  let rotationWindowSeconds: Int

  init(rawConfig: [String: Any]) throws {
    guard let rawServiceUuid = rawConfig["serviceUuid"] as? String,
          let serviceUuid = UUID(uuidString: rawServiceUuid),
          let publicId = rawConfig["publicId"] as? String,
          let seed = rawConfig["seed"] as? String
    else {
      throw Exception(name: "ERR_INVALID_ARGUMENT", description: "Bluetooth advertiser config is incomplete.")
    }

    let protocolVersion = (rawConfig["protocolVersion"] as? NSNumber)?.intValue
      ?? (rawConfig["protocolVersion"] as? Int)
    let rotationWindowSeconds = (rawConfig["rotationWindowSeconds"] as? NSNumber)?.intValue
      ?? (rawConfig["rotationWindowSeconds"] as? Int)

    guard let protocolVersion, let rotationWindowSeconds else {
      throw Exception(name: "ERR_INVALID_ARGUMENT", description: "Bluetooth protocolVersion and rotationWindowSeconds are required.")
    }

    self.serviceUuid = CBUUID(nsuuid: serviceUuid)
    self.publicId = publicId
    self.seed = seed
    self.protocolVersion = protocolVersion
    self.rotationWindowSeconds = rotationWindowSeconds
  }
}
