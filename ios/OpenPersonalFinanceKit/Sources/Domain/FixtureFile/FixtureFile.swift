import Foundation

// The whole fixture file. Plain Codable structs mirror the JSON; toDomain() and init(_:) map it.
struct FixtureFile: Codable {
    static let schemaVersion = 1

    var schemaVersion: Int
    var accounts: [FixtureChanges<FixtureAccount>]
    var accountHistories: [FixtureAccountHistory]

    init(_ fixture: WalletFixture) {
        schemaVersion = Self.schemaVersion
        accounts = fixture.accounts.map { FixtureChanges($0, item: FixtureAccount.init) }
        accountHistories = fixture.accountHistories.map(FixtureAccountHistory.init)
    }

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

extension WalletFixture {
    package static func decode(from data: Data) throws -> WalletFixture {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try StrictJSON.decode(FixtureFile.self, from: data, decoder: decoder, encoder: fixtureEncoder())
            .toDomain()
    }

    package func encoded() throws -> Data {
        try Self.fixtureEncoder().encode(FixtureFile(self))
    }

    private static func fixtureEncoder() -> JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        return encoder
    }
}
