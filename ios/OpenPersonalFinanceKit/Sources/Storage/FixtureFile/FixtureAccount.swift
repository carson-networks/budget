import Domain
import Foundation

// The fixture's JSON for one account; money and enums are strings, as in the file.
struct FixtureAccount: Codable {
    var id: UUID
    var displayName: String
    var institutionName: String
    var kind: String
    var currencyCode: String
    var creditLimit: String?

    func toDomain() throws -> WalletAccount {
        WalletAccount(
            id: id,
            displayName: displayName,
            institutionName: institutionName,
            kind: try FixtureMapping.enumValue(kind, field: "kind"),
            currencyCode: currencyCode,
            creditLimit: try creditLimit.map { try FixtureMapping.money($0, field: "creditLimit") }
        )
    }
}
