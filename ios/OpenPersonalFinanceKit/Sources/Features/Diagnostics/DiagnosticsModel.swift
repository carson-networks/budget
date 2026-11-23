import Domain
import Foundation
import Observation
import os

@Observable
public final class DiagnosticsModel {
    public enum Failure: Equatable, Sendable {
        case notAuthorized
        case dataUnavailable
        case other
    }

    public struct StatusCount: Identifiable, Sendable {
        public let status: WalletTransaction.Status
        public let count: Int
        public var id: WalletTransaction.Status { status }
    }

    public struct AccountSummary: Identifiable, Sendable {
        public let account: WalletAccount
        public let balance: WalletBalance?
        public let transactions: [WalletTransaction]
        public let statusCounts: [StatusCount]
        public let dateRange: ClosedRange<Date>?
        public var id: UUID { account.id }
    }

    public private(set) var authorization: WalletAuthorization?
    public private(set) var accounts: [AccountSummary] = []
    public private(set) var failure: Failure?
    private let source: any FinanceDataSource

    public init(source: any FinanceDataSource) {
        self.source = source
    }

    public func load() async {
        do {
            authorization = try await source.authorizationStatus()
            let accountChanges = try await source.accountChanges(since: nil)
            var summaries: [AccountSummary] = []
            for account in accountChanges.inserted + accountChanges.updated {
                let balances = try await source.balanceChanges(accountID: account.id, since: nil)
                let transactions = try await source.transactionChanges(accountID: account.id, since: nil)
                summaries.append(
                    Self.summary(
                        for: account,
                        balances: balances.inserted + balances.updated,
                        transactions: transactions.inserted + transactions.updated
                    )
                )
            }
            accounts = summaries
            failure = nil
        } catch {
            Log.logger.error("Diagnostics read failed: \(String(describing: error), privacy: .public)")
            failure = Self.failure(for: error)
        }
    }

    private static func summary(
        for account: WalletAccount,
        balances: [WalletBalance],
        transactions: [WalletTransaction]
    ) -> AccountSummary {
        let dates = transactions.map(\.transactionDate)
        let counts = Dictionary(grouping: transactions, by: \.status)
        return AccountSummary(
            account: account,
            balance: balances.max { asOfDate($0) < asOfDate($1) },
            transactions: transactions.sorted { $0.transactionDate > $1.transactionDate },
            statusCounts: WalletTransaction.Status.allCases.compactMap { status in
                counts[status].map { StatusCount(status: status, count: $0.count) }
            },
            dateRange: dates.min().flatMap { first in dates.max().map { first...$0 } }
        )
    }

    private static func asOfDate(_ balance: WalletBalance) -> Date {
        balance.booked?.asOfDate ?? balance.available?.asOfDate ?? .distantPast
    }

    private static func failure(for error: any Error) -> Failure {
        switch error as? FinanceDataError {
        case .notAuthorized: .notAuthorized
        case .dataUnavailable: .dataUnavailable
        case .invalidToken, nil: .other
        }
    }
}
