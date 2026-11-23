import Domain

public actor FakeFinanceDataSource: FinanceDataSource {
    private let dataAvailable: Bool
    private var authorization: WalletAuthorization
    private let authorizationOnRequest: WalletAuthorization
    private var injectedError: FinanceDataError?

    public init(
        isDataAvailable: Bool = true,
        authorizationStatus: WalletAuthorization = .authorized,
        authorizationOnRequest: WalletAuthorization = .authorized
    ) {
        self.dataAvailable = isDataAvailable
        self.authorization = authorizationStatus
        self.authorizationOnRequest = authorizationOnRequest
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

    package func setInjectedError(_ error: FinanceDataError?) {
        injectedError = error
    }
}
