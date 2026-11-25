import Domain
import Foundation
import os

// Reads the file on every call so the app and the extension never act on a stale copy.
package actor TokenStore: TokenStoring {
    private static let schemaVersion = 1

    private struct Envelope: Codable {
        let schemaVersion: Int
        let accounts: [String: AccountTokens]
    }

    private struct VersionProbe: Decodable {
        let schemaVersion: Int
    }

    private let file: URL

    package init(directory: AppGroupDirectory) {
        file = directory.tokensFile
    }

    package func tokens(for accountID: UUID) throws -> AccountTokens {
        try load()[accountID.uuidString] ?? .empty
    }

    package func save(_ tokens: AccountTokens, for accountID: UUID) throws {
        var accounts = try load()
        accounts[accountID.uuidString] = tokens
        try write(accounts)
    }

    package func removeAll() throws {
        do {
            try FileManager.default.removeItem(at: file)
        } catch CocoaError.fileNoSuchFile {
            return
        }
    }

    // A read error throws rather than reading as empty, so a save never overwrites other accounts' tokens.
    private func load() throws -> [String: AccountTokens] {
        let data: Data
        do {
            data = try Data(contentsOf: file)
        } catch CocoaError.fileReadNoSuchFile {
            return [:]
        }
        do {
            let version = try JSONDecoder().decode(VersionProbe.self, from: data).schemaVersion
            guard version == Self.schemaVersion else {
                try clear(reason: "schemaVersion \(version)")
                return [:]
            }
            return try JSONDecoder().decode(Envelope.self, from: data).accounts
        } catch let error as DecodingError {
            try clear(reason: String(describing: error))
            return [:]
        }
    }

    // Cleared tokens make the next read start from nothing, which recovers everything.
    private func clear(reason: String) throws {
        Log.logger.warning("Clearing incompatible token file: \(reason, privacy: .public)")
        try removeAll()
    }

    private func write(_ accounts: [String: AccountTokens]) throws {
        try FileManager.default.createDirectory(
            at: file.deletingLastPathComponent(),
            withIntermediateDirectories: true
        )
        let data = try JSONEncoder().encode(Envelope(schemaVersion: Self.schemaVersion, accounts: accounts))
        try data.write(to: file, options: .atomic)
    }
}
