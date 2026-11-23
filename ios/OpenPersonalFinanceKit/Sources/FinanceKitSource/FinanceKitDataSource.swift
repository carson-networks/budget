import Domain
import FinanceKit

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
}
