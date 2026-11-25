import Domain
import Foundation

// The whole fixture file. Plain Codable structs mirror the JSON; toDomain() maps it to the Domain value.
struct FixtureFile: Codable {
    static let schemaVersion = 1

    var schemaVersion: Int
    var accounts: [FixtureChanges<FixtureAccount>]
    var accountHistories: [FixtureAccountHistory]

    func toDomain() throws -> WalletFixture {
        guard schemaVersion == Self.schemaVersion else {
            throw FixtureMapping.invalid("Unsupported fixture schemaVersion \(schemaVersion)")
        }
        return WalletFixture(
            accounts: try accounts.map { try $0.toDomain { try $0.toDomain() } },
            accountHistories: try accountHistories.map { try $0.toDomain() }
        )
    }
}
