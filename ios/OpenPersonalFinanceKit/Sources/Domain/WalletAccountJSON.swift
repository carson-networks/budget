import Foundation

struct WalletAccountJSON: JSONShape {
    let value: WalletAccount

    init(_ value: WalletAccount) {
        self.value = value
    }

    private enum CodingKeys: String, CodingKey, CaseIterable {
        case id
        case displayName
        case institutionName
        case kind
        case currencyCode
        case creditLimit
    }

    init(from decoder: any Decoder) throws {
        try decoder.rejectUnknownKeys(allowed: CodingKeys.self)
        let container = try decoder.container(keyedBy: CodingKeys.self)
        value = WalletAccount(
            id: try container.decode(UUID.self, forKey: .id),
            displayName: try container.decode(String.self, forKey: .displayName),
            institutionName: try container.decode(String.self, forKey: .institutionName),
            kind: try container.decodeRaw(WalletAccount.Kind.self, forKey: .kind),
            currencyCode: try container.decode(String.self, forKey: .currencyCode),
            creditLimit: try DecimalStringCoding.decodeIfPresent(from: container, forKey: .creditLimit)
        )
    }

    func encode(to encoder: any Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(value.id, forKey: .id)
        try container.encode(value.displayName, forKey: .displayName)
        try container.encode(value.institutionName, forKey: .institutionName)
        try container.encode(value.kind.rawValue, forKey: .kind)
        try container.encode(value.currencyCode, forKey: .currencyCode)
        try DecimalStringCoding.encodeIfPresent(value.creditLimit, to: &container, forKey: .creditLimit)
    }
}
