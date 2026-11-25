import Domain

public actor FakeBackgroundDelivery: BackgroundDeliveryControl {
    package private(set) var applied: [SyncFrequency] = []

    public init() {}

    public func apply(_ frequency: SyncFrequency) {
        applied.append(frequency)
    }
}
