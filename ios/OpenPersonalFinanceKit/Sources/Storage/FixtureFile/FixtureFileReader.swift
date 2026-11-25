import Domain
import Foundation

// Reads the wallet fixture JSON: the bundled test fixtures and fixtures exported from a phone.
package struct FixtureFileReader {
    package init() {}

    package func read(_ data: Data) throws -> WalletFixture {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        // Unknown keys are found by re-encoding what was decoded, so the encoder only needs to be consistent.
        return try StrictJSON.decode(FixtureFile.self, from: data, decoder: decoder, encoder: Self.encoder())
            .toDomain()
    }

    private static func encoder() -> JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }
}
