package enum StorageError: Error, Sendable {
    case lockBusy
    case activityExpired
    case invalidStoredValue(String)
}
