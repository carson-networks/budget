import Domain
import Fakes
import Foundation
import Sync
import Testing

struct WakeProbeTests {
    private static let card = UUID(uuidString: "11111111-1111-4111-8111-111111111111") ?? UUID()
    private static let now = Date(timeIntervalSince1970: 1_800_000_000)

    private let source = FakeFinanceDataSource.sample()
    private let tokens = InMemoryTokenStore()
    private let log = InMemoryLogStore<WakeLogEntry>()
    private let probe: WakeProbe

    init() {
        probe = WakeProbe(source: source, tokens: tokens, log: log, now: { Self.now })
    }

    private func saveStartingTokens() async throws {
        _ = try await WalletHistoryReader(source: source, tokens: tokens).readEverything()
    }

    @Test func logsWhatChangedSinceTheSavedTokensWithoutSavingNewOnes() async throws {
        try await saveStartingTokens()
        let saved = await tokens.tokens(for: Self.card)

        await probe.run(trigger: .backgroundDelivery, dataTypes: [.transactions, .balances])

        let expected = WakeLogEntry(
            date: Self.now,
            trigger: .backgroundDelivery,
            dataTypes: [.transactions, .balances],
            outcome: .succeeded,
            accountCount: 2,
            changeCount: 5
        )
        #expect(await log.entries() == [expected])
        #expect(await tokens.tokens(for: Self.card) == saved)

        await probe.run(trigger: .backgroundRefresh, dataTypes: [])
        #expect(await log.entries().last?.changeCount == 5)
    }

    @Test func readsNothingBeforeAnyTokensAreSaved() async {
        await probe.run(trigger: .backgroundRefresh, dataTypes: [])

        let entry = await log.entries().first
        #expect(entry?.outcome == .succeeded)
        #expect(entry?.trigger == .backgroundRefresh)
        #expect(entry?.accountCount == 0)
        #expect(entry?.changeCount == 0)
    }

    @Test(arguments: [
        (FinanceDataError.dataUnavailable, WakeLogEntry.Outcome.dataUnavailable),
        (.notAuthorized, .notAuthorized),
    ])
    func logsAFailedRead(error: FinanceDataError, expected: WakeLogEntry.Outcome) async throws {
        try await saveStartingTokens()
        await source.setInjectedError(error)

        await probe.run(trigger: .backgroundDelivery, dataTypes: [.accounts])

        let entry = await log.entries().first
        #expect(entry?.outcome == expected)
        #expect(entry?.accountCount == 0)
    }

    @Test func logsARejectedToken() async {
        await tokens.save(AccountTokens(transactionToken: Data("corrupt".utf8)), for: Self.card)

        await probe.run(trigger: .backgroundDelivery, dataTypes: [.transactions])

        #expect(await log.entries().first?.outcome == .invalidToken)
    }

    @Test func aCancelledWakeStillWritesItsLine() async throws {
        try await saveStartingTokens()
        let log = CancellationRefusingLog()
        let probe = WakeProbe(source: source, tokens: tokens, log: log, now: { Self.now })

        let wake = Task {
            while !Task.isCancelled {
                await Task.yield()
            }
            await probe.run(trigger: .backgroundDelivery, dataTypes: [.transactions])
        }
        wake.cancel()
        await wake.value

        let entry = await log.entries().first
        #expect(entry?.outcome == .cancelled)
        #expect(entry?.accountCount == 0)
    }
}

// Refuses writes from a cancelled task, as a write that sleeps on lock contention would.
private actor CancellationRefusingLog: LogStoring {
    private var stored: [WakeLogEntry] = []

    func append(_ entry: WakeLogEntry) throws {
        try Task.checkCancellation()
        stored.append(entry)
    }

    func entries() -> [WakeLogEntry] {
        stored
    }
}
