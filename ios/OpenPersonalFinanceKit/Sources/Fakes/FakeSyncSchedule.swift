import Domain

public actor FakeSyncSchedule: SyncScheduling {
    private var saved: SyncFrequency?
    package private(set) var applied: [SyncFrequency] = []
    private var injectedError: (any Error)?

    public init(frequency: SyncFrequency? = nil) {
        saved = frequency
    }

    public func frequency() throws -> SyncFrequency {
        try throwInjectedError()
        return saved ?? .off
    }

    public func setFrequency(_ frequency: SyncFrequency) throws {
        try throwInjectedError()
        applied.append(frequency)
        saved = frequency
    }

    public func reapply() throws {
        try throwInjectedError()
        if let saved {
            applied.append(saved)
        }
    }

    package func setInjectedError(_ error: (any Error)?) {
        injectedError = error
    }

    private func throwInjectedError() throws {
        if let injectedError {
            throw injectedError
        }
    }
}
