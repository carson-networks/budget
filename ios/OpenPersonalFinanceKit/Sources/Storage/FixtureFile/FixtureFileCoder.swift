import Domain
import Foundation

// Reads and writes the wallet fixture JSON: the bundled test fixtures and the diagnostics export.
package struct FixtureFileCoder: FixtureEncoding {
    package init() {}

    package func decode(_ data: Data) throws -> WalletFixture {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try StrictJSON.decode(FixtureFile.self, from: data, decoder: decoder, encoder: Self.encoder())
            .toDomain()
    }

    package func encode(_ fixture: WalletFixture) throws -> Data {
        try Self.encoder().encode(FixtureFile(fixture))
    }

    private static func encoder() -> JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        return encoder
    }
}
