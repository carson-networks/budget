import Domain
import Foundation

// The exported fixture file. Plain Encodable structs mirror the JSON that the fakes read back.
nonisolated struct ExportFile: Encodable {
    var schemaVersion = 1
    var accounts: [ExportChanges<ExportAccount>]
    var accountHistories: [ExportAccountHistory]

    init(_ fixture: WalletFixture) {
        accounts = fixture.accounts.map { ExportChanges($0, item: ExportAccount.init) }
        accountHistories = fixture.accountHistories.map(ExportAccountHistory.init)
    }

    func encoded() throws -> Data {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        return try encoder.encode(self)
    }
}
