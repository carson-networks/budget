public protocol BackgroundDeliveryControl: Sendable {
    // Turns background delivery on for every data type at this frequency, or off.
    func apply(_ frequency: SyncFrequency) async
}
