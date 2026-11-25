import Foundation

// How the diagnostics export turns what it read into a fixture file, without knowing the file's format.
public protocol FixtureEncoding: Sendable {
    func encode(_ fixture: WalletFixture) throws -> Data
}
