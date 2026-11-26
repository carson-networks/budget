import Domain
import Fakes
import Foundation
import Sync
import Testing

struct WakeProbeTests {
    private static let card = UUID(uuidString: "11111111-1111-4111-8111-111111111111") ?? UUID()
    private static let savings = UUID(uuidString: "12222222-2222-4222-8222-222222222222") ?? UUID()
    private static let startedAt = Date(timeIntervalSince1970: 1_800_000_000)

    private let source = FakeFinanceDataSource.sample()
    private let tokens = InMemoryTokenStore()
    private let log = InMemoryLog<WakeLogEntry>()

    private var probe: WakeProbe {
        WakeProbe(source: source, tokens: tokens, log: log, now: { Self.startedAt })
    }

    @Test func countsChangesSinceSavedTokensWithoutSavingNewOnes() async throws {
        let reader = WalletHistoryReader(source: source, tokens: tokens)
        _ = try await reader.readEverything()
        let saved = [await tokens.tokens(for: Self.card), await tokens.tokens(for: Self.savings)]

        await probe.run(trigger: .backgroundDelivery, dataTypes: [.transactions, .balances])

        #expect([await tokens.tokens(for: Self.card), await tokens.tokens(for: Self.savings)] == saved)
        var expected = 0
        for account in [Self.card, Self.savings] {
            let read = try await reader.readSinceSavedTokens(accountID: account)
            expected += Self.count(read.account) + Self.count(read.balances) + Self.count(read.transactions)
        }
        let entry = try #require(await log.entries().first)
        #expect(entry.startedAt == Self.startedAt)
        #expect(entry.trigger == .backgroundDelivery)
        #expect(entry.dataTypes == [.transactions, .balances])
        guard case .succeeded(let count) = entry.outcome else {
            Issue.record("Expected a successful read, got \(entry.outcome)")
            return
        }
        #expect(expected > 0)
        #expect(count == expected)
    }

    @Test func recordsALockedRead() async throws {
        await source.setInjectedError(.dataUnavailable)
        await probe.run(trigger: .backgroundRefresh, dataTypes: [])

        let entry = try #require(await log.entries().first)
        #expect(entry.trigger == .backgroundRefresh)
        guard case .failed(.dataUnavailable) = entry.outcome else {
            Issue.record("Expected a locked read, got \(entry.outcome)")
            return
        }
    }

    @Test func aCancelledWakeIsStillRecorded() async throws {
        let probe = probe
        await Task {
            withUnsafeCurrentTask { $0?.cancel() }
            await probe.run(trigger: .backgroundDelivery, dataTypes: [.accounts])
        }.value

        let entry = try #require(await log.entries().first)
        guard case .failed(.cancelled) = entry.outcome else {
            Issue.record("Expected a cancelled read, got \(entry.outcome)")
            return
        }
    }

    @Test func activityReaderListsNewestFirst() async throws {
        await probe.run(trigger: .backgroundDelivery, dataTypes: [])
        await probe.run(trigger: .backgroundRefresh, dataTypes: [])

        let wakes = try await ActivityReader(wakes: log).recentWakes()
        #expect(wakes.map(\.trigger) == [.backgroundRefresh, .backgroundDelivery])
    }

    private static func count<Element>(_ changes: WalletChanges<Element>) -> Int {
        changes.inserted.count + changes.updated.count + changes.deleted.count
    }
}
