import Foundation

public struct WalletAccount: Identifiable, Sendable {
    public enum Kind: String, Sendable {
        case asset
        case liability
    }

    public let id: UUID
    public let displayName: String
    public let institutionName: String
    public let kind: Kind
    public let currencyCode: String
    public let creditLimit: Decimal?

    package init(
        id: UUID,
        displayName: String,
        institutionName: String,
        kind: Kind,
        currencyCode: String,
        creditLimit: Decimal? = nil
    ) {
        self.id = id
        self.displayName = displayName
        self.institutionName = institutionName
        self.kind = kind
        self.currencyCode = currencyCode
        self.creditLimit = creditLimit
    }
}
