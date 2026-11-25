import Domain
import Foundation

public nonisolated struct FixtureExport: Sendable {
    private let fixture: WalletFixture
    private let redacted: Bool

    init(fixture: WalletFixture, redacted: Bool) {
        self.fixture = fixture
        self.redacted = redacted
    }

    // The amount factor is drawn here so every export scales by a different one.
    package func data() throws -> Data {
        let output = redacted ? fixture.redacted(amountFactor: WalletFixture.randomAmountFactor()) : fixture
        return try ExportFile(output).encoded()
    }
}
