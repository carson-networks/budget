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

        init<Element>(_ step: WalletFixtureStep<Element>) {
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
    private var hasLoaded = false
    // What was read, kept so it can be exported: the full read, then each read from saved tokens.
    private var fullRead = WalletFixture.empty
    private var tokenReadSteps = WalletFixture.empty
    private let source: any FinanceDataSource
    private let tokens: any TokenStoring

    public init(source: any FinanceDataSource, tokens: any TokenStoring) {
        self.source = source
        self.tokens = tokens
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
        do {
            authorization = try await source.authorizationStatus()
            let accountChanges = try await source.accountChanges(since: nil)
            var summaries: [AccountSummary] = []
            var histories: [WalletFixture.AccountHistory] = []
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
                histories.append(
                    WalletFixture.AccountHistory(
                        accountID: account.id,
                        balances: [WalletFixtureStep(balances)],
                        transactions: [WalletFixtureStep(transactions)]
                    )
                )
                // Never overwrites, so a change made since an earlier read still shows on the next read.
                if try await tokens.tokens(for: account.id) == .empty {
                    try await tokens.save(
                        AccountTokens(
                            accountToken: accountChanges.newToken,
                            balanceToken: balances.newToken,
                            transactionToken: transactions.newToken
                        ),
                        for: account.id
                    )
                }
            }
            accounts = summaries
            fullRead = WalletFixture(accounts: [WalletFixtureStep(accountChanges)], accountHistories: histories)
            tokenReadSteps = .empty
            tokenReads = []
            hasLoaded = true
            failure = nil
        } catch {
            Log.logger.error("Diagnostics read failed: \(String(describing: error), privacy: .public)")
            failure = Self.failure(for: error)
        }
    }

    // Saves each account's new tokens as soon as it is read, so the next read shows only what changed since.
    public func readAgainFromSavedTokens() async {
        // A second tap while reading would read from the same saved tokens and record the step twice.
        guard !isReadingTokens else { return }
        isReadingTokens = true
        defer { isReadingTokens = false }
        var reads: [TokenRead] = []
        var accountSteps: [WalletFixtureStep<WalletAccount>] = []
        var histories: [WalletFixture.AccountHistory] = []
        do {
            for summary in accounts {
                let account = summary.account
                let saved = try await tokens.tokens(for: account.id)
                let accountChanges = try await source.accountChanges(since: saved.accountToken)
                let balances = try await source.balanceChanges(accountID: account.id, since: saved.balanceToken)
                let transactions = try await source.transactionChanges(
                    accountID: account.id,
                    since: saved.transactionToken
                )
                try await tokens.save(
                    AccountTokens(
                        accountToken: accountChanges.newToken,
                        balanceToken: balances.newToken,
                        transactionToken: transactions.newToken
                    ),
                    for: account.id
                )
                // The account history is store-wide, so keep only this account's part of it.
                let accountStep = WalletFixtureStep(
                    inserted: accountChanges.inserted.filter { $0.id == account.id },
                    updated: accountChanges.updated.filter { $0.id == account.id },
                    deleted: accountChanges.deleted.filter { $0 == account.id }
                )
                let history = WalletFixture.AccountHistory(
                    accountID: account.id,
                    balances: [WalletFixtureStep(balances)],
                    transactions: [WalletFixtureStep(transactions)]
                )
                accountSteps.append(accountStep)
                histories.append(history)
                reads.append(
                    TokenRead(
                        account: account,
                        fromSavedToken: saved != .empty,
                        accounts: ChangeCount(accountStep),
                        balances: ChangeCount(history.balances[0]),
                        transactions: ChangeCount(history.transactions[0])
                    )
                )
            }
            failure = nil
        } catch {
            Log.logger.error("Read from saved tokens failed: \(String(describing: error), privacy: .public)")
            failure = Self.failure(for: error)
        }
        Log.logger.info("Read \(reads.count, privacy: .public) accounts from saved tokens")
        tokenReads = reads
        guard !reads.isEmpty else { return }
        let accountStep = WalletFixtureStep(
            inserted: accountSteps.flatMap(\.inserted),
            updated: accountSteps.flatMap(\.updated),
            deleted: accountSteps.flatMap(\.deleted)
        )
        tokenReadSteps = tokenReadSteps.appending(
            WalletFixture(accounts: [accountStep], accountHistories: histories)
        )
    }

    public func resetTokens() async {
        do {
            try await tokens.removeAll()
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
        case .invalidToken: .invalidToken
        case nil: .other
        }
    }
}
