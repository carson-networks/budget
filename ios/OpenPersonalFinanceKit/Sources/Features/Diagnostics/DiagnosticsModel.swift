import Domain
import Foundation
import Observation
import os

@Observable
public final class DiagnosticsModel {
    public enum Failure: Equatable, Sendable {
        case notAuthorized
        case dataUnavailable
        case invalidToken
        case other
    }

    public struct ChangeCount: Equatable, Sendable {
        public let inserted: Int
        public let updated: Int
        public let deleted: Int

        init<Element>(_ step: WalletChanges<Element>) {
            inserted = step.inserted.count
            updated = step.updated.count
            deleted = step.deleted.count
        }
    }

    public struct TokenRead: Identifiable, Sendable {
        public let account: WalletAccount
        public let fromSavedToken: Bool
        public let accounts: ChangeCount
        public let balances: ChangeCount
        public let transactions: ChangeCount
        public var id: UUID { account.id }

        init(account: WalletAccount, read: AccountHistoryRead) {
            self.account = account
            fromSavedToken = read.fromSavedToken
            accounts = ChangeCount(read.account)
            balances = ChangeCount(read.balances)
            transactions = ChangeCount(read.transactions)
        }
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
    public private(set) var tokenReads: [TokenRead] = []
    public private(set) var isReadingTokens = false
    public private(set) var wakes: [WakeLogEntry] = []
    public private(set) var wakeLogFailed = false
    private var hasLoaded = false
    // What was read, kept so it can be exported: the full read, then each read from saved tokens.
    private var fullRead = WalletFixture.empty
    private var tokenReadSteps = WalletFixture.empty
    private let source: any FinanceDataSource
    private let history: any WalletHistoryReading
    private let activity: any ActivityReading

    public init(source: any FinanceDataSource, history: any WalletHistoryReading, activity: any ActivityReading) {
        self.source = source
        self.history = history
        self.activity = activity
    }

    public var canExport: Bool {
        !accounts.isEmpty
    }

    // Keeps reads from saved tokens when the screen reappears; pull to refresh starts over.
    public func loadIfNeeded() async {
        guard !hasLoaded else { return }
        await load()
    }

    public func load() async {
        await loadWakes()
        do {
            let status = try await source.authorizationStatus()
            authorization = status
            guard status == .authorized else {
                accounts = []
                failure = .notAuthorized
                return
            }
            let read = try await history.readEverything()
            accounts = (read.accounts.inserted + read.accounts.updated).map { account in
                Self.summary(for: account, history: read.histories.first { $0.accountID == account.id })
            }
            fullRead = WalletFixture(
                accounts: [read.accounts],
                accountHistories: read.histories.map(Self.fixtureHistory)
            )
            tokenReadSteps = .empty
            tokenReads = []
            hasLoaded = true
            failure = nil
        } catch {
            Log.logger.error("Diagnostics read failed: \(String(describing: error), privacy: .public)")
            failure = Self.failure(for: error)
        }
    }

    // Keeps each account read before a failure, since its new tokens are already saved.
    public func readAgainFromSavedTokens() async {
        // A second tap while reading would read from the same saved tokens and record the step twice.
        guard !isReadingTokens else { return }
        isReadingTokens = true
        defer { isReadingTokens = false }
        var reads: [AccountHistoryRead] = []
        do {
            for summary in accounts {
                reads.append(try await history.readSinceSavedTokens(accountID: summary.account.id))
            }
            failure = nil
        } catch {
            Log.logger.error("Read from saved tokens failed: \(String(describing: error), privacy: .public)")
            failure = Self.failure(for: error)
        }
        Log.logger.info("Read \(reads.count, privacy: .public) accounts from saved tokens")
        tokenReads = reads.compactMap { read in
            accounts.first { $0.id == read.accountID }.map { TokenRead(account: $0.account, read: read) }
        }
        guard !reads.isEmpty else { return }
        let accountStep = WalletChanges(
            inserted: reads.flatMap(\.account.inserted),
            updated: reads.flatMap(\.account.updated),
            deleted: reads.flatMap(\.account.deleted)
        )
        tokenReadSteps = tokenReadSteps.appending(
            WalletFixture(accounts: [accountStep], accountHistories: reads.map(Self.fixtureHistory))
        )
    }

    // Wakes are written by the extension while the screen is open, so the log view reads them again when shown.
    public func loadWakes() async {
        do {
            wakes = try await activity.recentWakes()
            wakeLogFailed = false
        } catch {
            Log.logger.error("Reading the wake log failed: \(String(describing: error), privacy: .public)")
            wakeLogFailed = true
        }
    }

    public func resetTokens() async {
        do {
            try await history.resetTokens()
            tokenReads = []
            tokenReadSteps = .empty
        } catch {
            Log.logger.error("Resetting tokens failed: \(String(describing: error), privacy: .public)")
            failure = .other
        }
    }

    public func fixtureExport(redacted: Bool) -> FixtureExport {
        FixtureExport(fixture: fullRead.appending(tokenReadSteps), redacted: redacted)
    }

    private static func fixtureHistory(_ read: AccountHistoryRead) -> WalletFixture.AccountHistory {
        WalletFixture.AccountHistory(
            accountID: read.accountID,
            balances: [read.balances],
            transactions: [read.transactions]
        )
    }

    private static func summary(for account: WalletAccount, history: AccountHistoryRead?) -> AccountSummary {
        let balances = (history?.balances.inserted ?? []) + (history?.balances.updated ?? [])
        let transactions = (history?.transactions.inserted ?? []) + (history?.transactions.updated ?? [])
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
        case .invalidToken: .invalidToken
        case nil: .other
        }
    }
}
