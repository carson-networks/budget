import Domain
import Foundation

// Reads the file on every call so the app and the extension never act on a stale copy.
package actor TokenStore: TokenStoring {
    private struct Envelope: VersionedEnvelope {
        static let currentVersion = 1
        let schemaVersion: Int
        let accounts: [String: StoredTokens]
    }

    // The file's own shape, so renaming an AccountTokens field never changes what is on disk.
    private struct StoredTokens: Codable {
        let accountToken: Data?
        let balanceToken: Data?
        let transactionToken: Data?

        init(_ tokens: AccountTokens) {
            accountToken = tokens.accountToken
            balanceToken = tokens.balanceToken
            transactionToken = tokens.transactionToken
        }

        var tokens: AccountTokens {
            AccountTokens(accountToken: accountToken, balanceToken: balanceToken, transactionToken: transactionToken)
        }
    }

    // A cleared file makes the next read start from nothing, which recovers everything.
    private let file: VersionedFile<Envelope>

    package init(directory: AppGroupDirectory) {
        file = VersionedFile(url: directory.tokensFile)
    }

    package func tokens(for accountID: UUID) throws -> AccountTokens {
        try load()[accountID.uuidString]?.tokens ?? .empty
    }

    package func save(_ tokens: AccountTokens, for accountID: UUID) throws {
        var accounts = try load()
        accounts[accountID.uuidString] = StoredTokens(tokens)
        try file.write(Envelope(schemaVersion: Envelope.currentVersion, accounts: accounts))
    }

    package func removeAll() throws {
        try file.remove()
    }

    private func load() throws -> [String: StoredTokens] {
        try file.read()?.accounts ?? [:]
    }
}
