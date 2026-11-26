import Domain
import Foundation
import os

// Records each background wake so phase 2 can see how often iOS wakes the app and whether it can read Wallet data.
package struct WakeProbe: Sendable {
    private let source: any FinanceDataSource
    private let tokens: any TokenStoring
    private let log: any LogStoring<WakeLogEntry>
    private let now: @Sendable () -> Date

    package init(
        source: any FinanceDataSource,
        tokens: any TokenStoring,
        log: any LogStoring<WakeLogEntry>,
        now: @escaping @Sendable () -> Date = { Date() }
    ) {
        self.source = source
        self.tokens = tokens
        self.log = log
        self.now = now
    }

    package func run(trigger: SyncTrigger, dataTypes: [WalletDataType]) async {
        let startedAt = now()
        let start = ContinuousClock.now
        var outcome = WakeLogEntry.Outcome.failed(.cancelled)
        // Shielded so a cancelled wake still records that it ran.
        defer {
            await withTaskCancellationShield {
                await record(
                    WakeLogEntry(
                        startedAt: startedAt,
                        duration: ContinuousClock.now - start,
                        trigger: trigger,
                        dataTypes: dataTypes,
                        outcome: outcome
                    )
                )
            }
        }
        do {
            outcome = .succeeded(changeCount: try await countChanges())
        } catch {
            outcome = .failed(Self.failure(for: error))
        }
    }

    // Never saves tokens, so a probe never hides a change from the next read on the diagnostics screen.
    private func countChanges() async throws -> Int {
        try Task.checkCancellation()
        let accounts = try await source.accountChanges(since: nil)
        var count = 0
        for account in accounts.inserted + accounts.updated {
            try Task.checkCancellation()
            let saved = try await tokens.tokens(for: account.id)
            let accountChanges = try await source.accountChanges(since: saved.accountToken)
            let balances = try await source.balanceChanges(accountID: account.id, since: saved.balanceToken)
            let transactions = try await source.transactionChanges(
                accountID: account.id, since: saved.transactionToken)
            count +=
                Self.count(WalletChanges(accountChanges).filtered(to: account.id))
                + Self.count(WalletChanges(balances)) + Self.count(WalletChanges(transactions))
        }
        return count
    }

    private func record(_ entry: WakeLogEntry) async {
        do {
            try await log.append(entry)
            Log.logger.info("Recorded a \(entry.trigger.rawValue, privacy: .public) wake")
        } catch {
            Log.logger.error("Recording a wake failed: \(String(describing: error), privacy: .public)")
        }
    }

    private static func count<Element>(_ changes: WalletChanges<Element>) -> Int {
        changes.inserted.count + changes.updated.count + changes.deleted.count
    }

    private static func failure(for error: any Error) -> WakeLogEntry.Failure {
        if error is CancellationError {
            return .cancelled
        }
        switch error as? FinanceDataError {
        case .dataUnavailable: return .dataUnavailable
        case .notAuthorized: return .notAuthorized
        case .invalidToken: return .invalidToken
        case nil: return .other
        }
    }
}
