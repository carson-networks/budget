import Foundation

/// Serves a `FinanceFixture` in place of FinanceKit, for tests and the Simulator.
///
/// Step `n` of every history becomes visible once `advance()` has been called `n` times, so a test can read, advance,
/// and read again from the saved token to watch a change like a pending charge booking.
public actor FakeFinanceDataSource: FinanceDataSource {
    private struct Token: Codable {
        var stream: String
        var position: Int
    }

    private let fixture: FinanceFixture
    private var authorization: WalletAuthorization
    private let authorizationOnRequest: WalletAuthorization
    private var visibleSteps = 1
    private var dataAvailable = true

    public init(
        fixture: FinanceFixture,
        authorization: WalletAuthorization = .notDetermined,
        authorizationOnRequest: WalletAuthorization = .authorized
    ) {
        self.fixture = fixture
        self.authorization = authorization
        self.authorizationOnRequest = authorizationOnRequest
    }

    public func advance() {
        visibleSteps += 1
    }

    public func setDataAvailable(_ available: Bool) {
        dataAvailable = available
    }

    public func authorizationStatus() async throws -> WalletAuthorization {
        authorization
    }

    public func requestAuthorization() async throws -> WalletAuthorization {
        if authorization == .notDetermined {
            authorization = authorizationOnRequest
        }
        return authorization
    }

    public func accountChanges(since token: Data?) async throws -> ChangeSet<WalletAccount> {
        try serve(fixture.accountChanges, stream: "accounts", since: token)
    }

    public func balanceChanges(accountID: UUID, since token: Data?) async throws -> ChangeSet<WalletBalance> {
        try serve(history(accountID)?.balanceChanges ?? [], stream: "balances/\(accountID)", since: token)
    }

    public func transactionChanges(accountID: UUID, since token: Data?) async throws -> ChangeSet<WalletTransaction> {
        try serve(history(accountID)?.transactionChanges ?? [], stream: "transactions/\(accountID)", since: token)
    }

    private func history(_ accountID: UUID) -> FinanceFixture.AccountHistory? {
        fixture.accountHistories.first { $0.accountID == accountID }
    }

    private func serve<Item>(
        _ steps: [FinanceFixture.Step<Item>], stream: String, since token: Data?
    ) throws -> ChangeSet<Item> {
        guard authorization == .authorized else { throw FinanceDataError.notAuthorized }
        guard dataAvailable else { throw FinanceDataError.dataUnavailable }

        let end = min(visibleSteps, steps.count)
        var start = 0
        if let token {
            guard let decoded = try? JSONDecoder().decode(Token.self, from: token),
                decoded.stream == stream,
                (0...end).contains(decoded.position)
            else { throw FinanceDataError.invalidToken }
            start = decoded.position
        }

        let encoder = JSONEncoder()
        encoder.outputFormatting = .sortedKeys
        let newToken = try encoder.encode(Token(stream: stream, position: end))
        return steps[start..<end].reduce(ChangeSet(newToken: newToken)) { merged, step in
            merged.merging(step.changeSet(token: newToken))
        }
    }
}
