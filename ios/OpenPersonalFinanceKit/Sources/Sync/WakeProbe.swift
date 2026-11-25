import Domain
import Foundation
import os

// Records what a background wake could read, without moving the saved tokens, so phase 2 can see how often
// each trigger fires and whether Wallet data is readable while the phone is locked.
package struct WakeProbe: Sendable {
    private let source: any FinanceDataSource
    private let tokens: any TokenStoring
    private let log: any LogStoring<WakeLogEntry>
    private let now: @Sendable () -> Date

    package init(
        source: any FinanceDataSource,
        tokens: any TokenStoring,
        log: any LogStoring<WakeLogEntry>,
        now: @escaping @Sendable () -> Date = Date.init
    ) {
        self.source = source
        self.tokens = tokens
        self.log = log
        self.now = now
    }

    package func run(trigger: SyncTrigger, dataTypes: [WalletDataType]) async {
        let started = now()
        var outcome = WakeLogEntry.Outcome.cancelled
        var accountCount = 0
        var changeCount = 0
        // Shielded so a wake cancelled by willTerminate or an expired refresh still leaves its line.
        defer {
            let entry = WakeLogEntry(
                date: started,
                trigger: trigger,
                dataTypes: dataTypes,
                outcome: outcome,
                accountCount: accountCount,
                changeCount: changeCount
            )
            await withTaskCancellationShield { await record(entry) }
        }
        do {
            for accountID in try await tokens.accountIDs() {
                try Task.checkCancellation()
                let saved = try await tokens.tokens(for: accountID)
                changeCount += try await changes(since: saved, accountID: accountID)
                accountCount += 1
            }
            outcome = .succeeded
        } catch {
            outcome = Self.outcome(for: error)
        }
    }

    private func changes(since saved: AccountTokens, accountID: UUID) async throws -> Int {
        let account = try await source.accountChanges(since: saved.accountToken)
        let balances = try await source.balanceChanges(accountID: accountID, since: saved.balanceToken)
        let transactions = try await source.transactionChanges(accountID: accountID, since: saved.transactionToken)
        return Self.count(WalletChanges(account).filtered(to: accountID)) + Self.count(WalletChanges(balances))
            + Self.count(WalletChanges(transactions))
    }

    private func record(_ entry: WakeLogEntry) async {
        Log.logger.info(
            """
            Wake \(entry.trigger.rawValue, privacy: .public): \(entry.outcome.rawValue, privacy: .public), \
            \(entry.accountCount, privacy: .public) accounts, \(entry.changeCount, privacy: .public) changes
            """
        )
        do {
            try await log.append(entry)
        } catch {
            Log.logger.error("Writing the wake log failed: \(String(describing: error), privacy: .public)")
        }
    }

    private static func count<Element>(_ changes: WalletChanges<Element>) -> Int {
        changes.inserted.count + changes.updated.count + changes.deleted.count
    }

    private static func outcome(for error: any Error) -> WakeLogEntry.Outcome {
        if error is CancellationError {
            return .cancelled
        }
        switch error as? FinanceDataError {
        case .dataUnavailable: return .dataUnavailable
        case .notAuthorized: return .notAuthorized
        case .invalidToken: return .invalidToken
        case nil: return .failed
        }
    }
}
