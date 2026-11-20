import Domain
import Foundation
import os

public actor FakeFinanceDataSource: FinanceDataSource {
    public enum FixtureError: Error, Equatable, Sendable {
        case missingResource(name: String, subdirectory: String?)
    }

    private struct FakeToken: Codable, Equatable {
        enum Stream: String, Codable {
            case accounts
            case balances
            case transactions
        }

        let stream: Stream
        let accountID: UUID?
        let nextIndex: Int
    }

    private let dataAvailable: Bool
    private var authorization: WalletAuthorization
    private let authorizationOnRequest: WalletAuthorization?
    private var injectedError: FinanceDataError?
    private let accountSteps: [WalletFixture.ChangeStep<WalletAccount>]
    private let historiesByAccountID: [UUID: WalletFixture.AccountHistory]

    public init(
        fixture: WalletFixture,
        isDataAvailable: Bool = true,
        authorizationStatus: WalletAuthorization = .authorized,
        authorizationOnRequest: WalletAuthorization? = nil
    ) {
        self.dataAvailable = isDataAvailable
        self.authorization = authorizationStatus
        self.authorizationOnRequest = authorizationOnRequest
        if fixture.accounts.isEmpty {
            self.accountSteps = fixture.accountChanges
        } else {
            self.accountSteps = [WalletFixture.ChangeStep(inserted: fixture.accounts)] + fixture.accountChanges
        }
        self.historiesByAccountID = Dictionary(
            uniqueKeysWithValues: fixture.histories.map { ($0.accountID, $0) }
        )
    }

    public static func loadFixture(
        named name: String = "sample",
        subdirectory: String? = "Fixtures"
    ) throws -> WalletFixture {
        guard
            let url = Bundle.module.url(
                forResource: name,
                withExtension: "json",
                subdirectory: subdirectory
            )
        else {
            throw FixtureError.missingResource(name: name, subdirectory: subdirectory)
        }
        return try loadFixture(at: url)
    }

    public static func loadFixture(at url: URL) throws -> WalletFixture {
        let data = try Data(contentsOf: url)
        return try WalletFixture.decode(from: data)
    }

    public static var sample: FakeFinanceDataSource {
        do {
            return try FakeFinanceDataSource(fixture: loadFixture())
        } catch {
            Log.logger.error(
                "Failed to load bundled sample fixture: \(error.localizedDescription, privacy: .public)"
            )
            return FakeFinanceDataSource(fixture: .empty)
        }
    }

    public nonisolated func isDataAvailable() -> Bool {
        dataAvailable
    }

    public func authorizationStatus() async throws -> WalletAuthorization {
        if let injectedError {
            throw injectedError
        }
        guard dataAvailable else {
            throw FinanceDataError.dataUnavailable
        }
        return authorization
    }

    public func requestAuthorization() async throws -> WalletAuthorization {
        if let injectedError {
            throw injectedError
        }
        guard dataAvailable else {
            throw FinanceDataError.dataUnavailable
        }
        if authorization == .notDetermined {
            authorization = authorizationOnRequest ?? .authorized
        }
        return authorization
    }

    public func accountChanges(since token: Data?) async throws -> ChangeSet<WalletAccount> {
        try verifyReadable()
        return try nextChangeSet(
            steps: accountSteps,
            stream: .accounts,
            accountID: nil,
            since: token
        )
    }

    public func balanceChanges(
        accountID: UUID,
        since token: Data?
    ) async throws -> ChangeSet<WalletBalance> {
        try verifyReadable()
        let steps = historiesByAccountID[accountID]?.balanceChanges ?? []
        return try nextChangeSet(
            steps: steps,
            stream: .balances,
            accountID: accountID,
            since: token
        )
    }

    public func transactionChanges(
        accountID: UUID,
        since token: Data?
    ) async throws -> ChangeSet<WalletTransaction> {
        try verifyReadable()
        let steps = historiesByAccountID[accountID]?.transactionChanges ?? []
        return try nextChangeSet(
            steps: steps,
            stream: .transactions,
            accountID: accountID,
            since: token
        )
    }

    public func setAuthorizationStatus(_ status: WalletAuthorization) {
        authorization = status
    }

    public func setInjectedError(_ error: FinanceDataError?) {
        injectedError = error
    }

    private func verifyReadable() throws {
        if let injectedError {
            throw injectedError
        }
        guard dataAvailable else {
            throw FinanceDataError.dataUnavailable
        }
        guard authorization == .authorized else {
            throw FinanceDataError.notAuthorized
        }
    }

    private func nextChangeSet<Element: Identifiable & Codable & Equatable & Sendable>(
        steps: [WalletFixture.ChangeStep<Element>],
        stream: FakeToken.Stream,
        accountID: UUID?,
        since token: Data?
    ) throws -> ChangeSet<Element> where Element.ID: Hashable & Codable & Sendable {
        let index = try decodeIndex(
            from: token,
            expectedStream: stream,
            expectedAccountID: accountID,
            stepCount: steps.count
        )

        guard index < steps.count else {
            let steadyToken = try encodeToken(
                FakeToken(stream: stream, accountID: accountID, nextIndex: steps.count)
            )
            return ChangeSet(newToken: steadyToken)
        }

        let step = steps[index]
        let nextToken = try encodeToken(
            FakeToken(stream: stream, accountID: accountID, nextIndex: index + 1)
        )
        return ChangeSet(
            inserted: step.inserted,
            updated: step.updated,
            deleted: step.deleted,
            newToken: nextToken
        )
    }

    private func decodeIndex(
        from token: Data?,
        expectedStream: FakeToken.Stream,
        expectedAccountID: UUID?,
        stepCount: Int
    ) throws -> Int {
        guard let token else {
            return 0
        }
        guard let decoded = try? JSONDecoder().decode(FakeToken.self, from: token),
            decoded.stream == expectedStream,
            decoded.accountID == expectedAccountID,
            decoded.nextIndex >= 0,
            decoded.nextIndex <= stepCount
        else {
            throw FinanceDataError.invalidToken
        }
        return decoded.nextIndex
    }

    private func encodeToken(_ token: FakeToken) throws -> Data {
        let encoder = JSONEncoder()
        encoder.outputFormatting = .sortedKeys
        return try encoder.encode(token)
    }
}
