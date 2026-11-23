import Domain
import FinanceKit
import Foundation
import os

public struct FinanceKitDataSource: FinanceDataSource {
    private let store: FinanceStore

    public init() {
        store = .shared
    }

    public func isDataAvailable() -> Bool {
        FinanceStore.isDataAvailable(.financialData)
    }

    public func authorizationStatus() async throws -> WalletAuthorization {
        do {
            return FinanceKitMapping.authorization(try await store.authorizationStatus())
        } catch {
            throw FinanceKitMapping.dataError(for: error) ?? error
        }
    }

    public func requestAuthorization() async throws -> WalletAuthorization {
        do {
            return FinanceKitMapping.authorization(try await store.requestAuthorization())
        } catch {
            throw FinanceKitMapping.dataError(for: error) ?? error
        }
    }

    public func accountChanges(since token: Data?) async throws -> ChangeSet<WalletAccount> {
        try await drain(stream: "accounts", since: token, transform: FinanceKitMapping.account) {
            store.accountHistory(since: $0, isMonitoring: false)
        }
    }

    public func balanceChanges(accountID: UUID, since token: Data?) async throws -> ChangeSet<WalletBalance> {
        try await drain(stream: "balances", since: token, transform: FinanceKitMapping.balance) {
            store.accountBalanceHistory(forAccountID: accountID, since: $0, isMonitoring: false)
        }
    }

    public func transactionChanges(accountID: UUID, since token: Data?) async throws -> ChangeSet<WalletTransaction> {
        try await drain(stream: "transactions", since: token, transform: FinanceKitMapping.transaction) {
            store.transactionHistory(forAccountID: accountID, since: $0, isMonitoring: false)
        }
    }

    private func drain<Model: Identifiable, Element: Identifiable & Sendable>(
        stream: String,
        since token: Data?,
        transform: (Model) -> Element?,
        history: (FinanceStore.HistoryToken?) -> FinanceStore.History<Model>
    ) async throws -> ChangeSet<Element> where Model.ID == UUID, Element.ID == UUID {
        do {
            let start = try FinanceKitMapping.historyToken(from: token)
            var chunks: [ChangeSet<Element>] = []
            for try await changes in history(start) {
                try Task.checkCancellation()
                chunks.append(try FinanceKitMapping.changeSet(changes, transform: transform))
            }
            let merged = ChangeSet.merging(chunks, fallbackToken: token ?? Data())
            Log.logger.info(
                """
                Read \(stream, privacy: .public): \(chunks.count, privacy: .public) chunks, \
                \(merged.inserted.count, privacy: .public) inserted, \
                \(merged.updated.count, privacy: .public) updated, \
                \(merged.deleted.count, privacy: .public) deleted
                """
            )
            return merged
        } catch let error as FinanceDataError {
            throw error
        } catch let error as CancellationError {
            throw error
        } catch {
            throw await translate(error)
        }
    }

    // FinanceKit has no "not authorized" error, so check the status when a read fails for an unmapped reason.
    private func translate(_ error: any Error) async -> any Error {
        if let mapped = FinanceKitMapping.dataError(for: error) {
            return mapped
        }
        if (try? await store.authorizationStatus()) != .authorized {
            return FinanceDataError.notAuthorized
        }
        Log.logger.error("FinanceKit read failed: \(String(describing: error), privacy: .public)")
        return error
    }
}
