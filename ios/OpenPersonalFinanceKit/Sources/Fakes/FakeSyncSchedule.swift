import Domain

public actor FakeSyncSchedule: SyncScheduling {
    package private(set) var applied: [SyncFrequency] = []
    private var saved: SyncFrequency
    private var injectedError: FinanceDataError?

    public init(frequency: SyncFrequency = .off) {
        saved = frequency
    }

    public func applySavedFrequency() throws -> SyncFrequency {
        try throwInjectedError()
        applied.append(saved)
        return saved
    }

    public func setFrequency(_ frequency: SyncFrequency) throws {
        try throwInjectedError()
        saved = frequency
        applied.append(frequency)
    }

    package func setInjectedError(_ error: FinanceDataError?) {
        injectedError = error
    }

    private func throwInjectedError() throws {
        if let injectedError {
            throw injectedError
        }
    }
}
