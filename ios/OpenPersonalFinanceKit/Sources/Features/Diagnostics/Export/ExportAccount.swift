import Domain
import Foundation

// Money and enums are written as strings, as the file holds them.
nonisolated struct ExportAccount: Encodable {
    var id: UUID
    var displayName: String
    var institutionName: String
    var kind: String
    var currencyCode: String
    var creditLimit: String?

    init(_ account: WalletAccount) {
        id = account.id
        displayName = account.displayName
        institutionName = account.institutionName
        kind = account.kind.rawValue
        currencyCode = account.currencyCode
        creditLimit = account.creditLimit?.description
    }
}
