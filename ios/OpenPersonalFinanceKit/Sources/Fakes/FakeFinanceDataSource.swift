import Domain
import Foundation
import os

public actor FakeFinanceDataSource: FinanceDataSource {
    private let fixture: WalletFixture
    private let dataAvailable: Bool
    private var authorization: WalletAuthorization
    private let authorizationOnRequest: WalletAuthorization
    private var injectedError: FinanceDataError?

    package init(
        fixture: WalletFixture,
        isDataAvailable: Bool = true,
        authorizationStatus: WalletAuthorization = .authorized,
        authorizationOnRequest: WalletAuthorization = .authorized
    ) {
        self.fixture = fixture
        self.dataAvailable = isDataAvailable
        self.authorization = authorizationStatus
        self.authorizationOnRequest = authorizationOnRequest
    }

    public init(
        isDataAvailable: Bool = true,
        authorizationStatus: WalletAuthorization = .authorized,
        authorizationOnRequest: WalletAuthorization = .authorized
    ) {
        self.init(
            fixture: .empty,
            isDataAvailable: isDataAvailable,
            authorizationStatus: authorizationStatus,
            authorizationOnRequest: authorizationOnRequest
        )
    }

    public static func sample(
        isDataAvailable: Bool = true,
        authorizationStatus: WalletAuthorization = .authorized,
        authorizationOnRequest: WalletAuthorization = .authorized
    ) -> FakeFinanceDataSource {
        let fixture: WalletFixture
        do {
            fixture = try loadFixture(named: "sample")
        } catch {
            Log.logger.error("Failed to load the sample fixture: \(String(describing: error), privacy: .private)")
            fixture = .empty
        }
        return FakeFinanceDataSource(
            fixture: fixture,
            isDataAvailable: isDataAvailable,
            authorizationStatus: authorizationStatus,
            authorizationOnRequest: authorizationOnRequest
        )
    }

    package static func loadFixture(named name: String) throws -> WalletFixture {
        guard let url = Bundle.module.url(forResource: name, withExtension: "json", subdirectory: "Fixtures") else {
            throw CocoaError(.fileNoSuchFile)
        }
        return try WalletFixture.decode(from: Data(contentsOf: url))
    }

    public nonisolated func isDataAvailable() -> Bool {
        dataAvailable
    }

    public func authorizationStatus() async throws -> WalletAuthorization {
        if let injectedError {
            throw injectedError
        }
        return authorization
    }

    public func requestAuthorization() async throws -> WalletAuthorization {
        if let injectedError {
            throw injectedError
        }
        if authorization == .notDetermined {
            authorization = authorizationOnRequest
        }
        return authorization
    }

    // The fixture has a single state, so every read returns all of it and the token is ignored.
    public func accountChanges(since token: Data?) async throws -> ChangeSet<WalletAccount> {
        try verifyReadable()
        return ChangeSet(inserted: fixture.accounts, newToken: Data())
    }

    public func balanceChanges(accountID: UUID, since token: Data?) async throws -> ChangeSet<WalletBalance> {
        try verifyReadable()
        return ChangeSet(inserted: fixture.balances.filter { $0.accountID == accountID }, newToken: Data())
    }

    public func transactionChanges(accountID: UUID, since token: Data?) async throws -> ChangeSet<WalletTransaction> {
        try verifyReadable()
        return ChangeSet(inserted: fixture.transactions.filter { $0.accountID == accountID }, newToken: Data())
    }

    package func setInjectedError(_ error: FinanceDataError?) {
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
}
