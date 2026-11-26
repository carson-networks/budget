public protocol BackgroundDeliveryControl: Sendable {
    // Enables delivery of every data type at the frequency, or disables it all for `.off`.
    func apply(_ frequency: SyncFrequency) async
}
