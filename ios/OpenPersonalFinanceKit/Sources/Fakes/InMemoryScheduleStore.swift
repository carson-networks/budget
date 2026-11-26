import Domain

package actor InMemoryScheduleStore: ScheduleStoring {
    private var saved: SyncFrequency?
    private var injectedError: FinanceDataError?

    package init(frequency: SyncFrequency? = nil) {
        saved = frequency
    }

    package func frequency() throws -> SyncFrequency? {
        try throwInjectedError()
        return saved
    }

    package func save(_ frequency: SyncFrequency) throws {
        try throwInjectedError()
        saved = frequency
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
