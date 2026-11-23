import Foundation

public struct WalletAccount: Identifiable, Decodable, Sendable {
    public enum Kind: String, Decodable, Sendable {
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

    private enum CodingKeys: String, CodingKey, CaseIterable {
        case id
        case displayName
        case institutionName
        case kind
        case currencyCode
        case creditLimit
    }

    public init(from decoder: any Decoder) throws {
        try decoder.rejectUnknownKeys(allowed: CodingKeys.self)
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        displayName = try container.decode(String.self, forKey: .displayName)
        institutionName = try container.decode(String.self, forKey: .institutionName)
        kind = try container.decode(Kind.self, forKey: .kind)
        currencyCode = try container.decode(String.self, forKey: .currencyCode)
        creditLimit = try DecimalStringCoding.decodeIfPresent(from: container, forKey: .creditLimit)
    }
}
