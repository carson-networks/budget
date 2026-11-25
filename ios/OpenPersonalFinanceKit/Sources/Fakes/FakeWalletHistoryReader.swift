import Domain
import Foundation
import os

// Serves a fixture the way WalletHistoryReader serves FinanceKit, with a step position in place of saved tokens.
public actor FakeWalletHistoryReader: WalletHistoryReading {
    private struct Position {
        var account: Int
        var balances: Int
        var transactions: Int
    }

    private let fixture: WalletFixture
    private var positions: [UUID: Position] = [:]
    private var injectedError: FinanceDataError?

    package init(fixture: WalletFixture) {
        self.fixture = fixture
    }

    public static func sample() -> FakeWalletHistoryReader {
        do {
            return FakeWalletHistoryReader(fixture: try FixtureFiles.load(named: "sample"))
        } catch {
            Log.logger.error("Failed to load the sample fixture: \(String(describing: error), privacy: .private)")
            return FakeWalletHistoryReader(fixture: .empty)
        }
    }

    public func readEverything() throws -> WalletRead {
        try throwInjectedError()
        let accounts = Self.step(fixture.accounts, at: 0)
        let histories = (accounts.inserted + accounts.updated).map { account in
            if positions[account.id] == nil {
                positions[account.id] = Position(account: 1, balances: 1, transactions: 1)
            }
            return read(account.id, at: Position(account: 0, balances: 0, transactions: 0), fromSavedToken: false)
        }
        return WalletRead(accounts: accounts, histories: histories)
    }

    public func readSinceSavedTokens(accountID: UUID) throws -> AccountHistoryRead {
        try throwInjectedError()
        let saved = positions[accountID]
        let position = saved ?? Position(account: 0, balances: 0, transactions: 0)
        positions[accountID] = Position(
            account: position.account + 1,
            balances: position.balances + 1,
            transactions: position.transactions + 1
        )
        return read(accountID, at: position, fromSavedToken: saved != nil)
    }

    public func resetTokens() throws {
        try throwInjectedError()
        positions = [:]
    }

    package func setInjectedError(_ error: FinanceDataError?) {
        injectedError = error
    }

    private func read(_ accountID: UUID, at position: Position, fromSavedToken: Bool) -> AccountHistoryRead {
        let history = fixture.history(for: accountID)
        return AccountHistoryRead(
            accountID: accountID,
            fromSavedToken: fromSavedToken,
            account: Self.step(fixture.accounts, at: position.account).filtered(to: accountID),
            balances: Self.step(history?.balances ?? [], at: position.balances),
            transactions: Self.step(history?.transactions ?? [], at: position.transactions)
        )
    }

    private func throwInjectedError() throws {
        if let injectedError {
            throw injectedError
        }
    }

    private static func step<Element>(_ steps: [WalletChanges<Element>], at index: Int) -> WalletChanges<Element> {
        index < steps.count ? steps[index] : WalletChanges()
    }
}
