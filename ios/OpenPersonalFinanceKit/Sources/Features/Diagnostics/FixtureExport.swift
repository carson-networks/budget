import Domain
import Foundation

public nonisolated struct FixtureExport: Sendable {
    private let fixture: WalletFixture
    private let redacted: Bool
    private let encoder: any FixtureEncoding

    init(fixture: WalletFixture, redacted: Bool, encoder: any FixtureEncoding) {
        self.fixture = fixture
        self.redacted = redacted
        self.encoder = encoder
    }

    // The amount factor is drawn here so every export scales by a different one.
    package func data() throws -> Data {
        let output = redacted ? fixture.redacted(amountFactor: WalletFixture.randomAmountFactor()) : fixture
        return try encoder.encode(output)
    }
}
