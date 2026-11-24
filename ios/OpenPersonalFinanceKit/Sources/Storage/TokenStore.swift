import Domain
import Foundation
import os

// Reads the file on every call so the app and the extension never act on a stale copy.
public actor TokenStore: TokenStoring {
    private static let schemaVersion = 1

    private struct Envelope: Codable {
        let schemaVersion: Int
        let accounts: [String: AccountTokens]
    }

    private struct VersionProbe: Decodable {
        let schemaVersion: Int
    }

    private let file: URL

    public init(directory: AppGroupDirectory) {
        file = directory.tokensFile
    }

    public func tokens(for accountID: UUID) -> AccountTokens {
        load()[accountID.uuidString] ?? .empty
    }

    public func save(_ tokens: AccountTokens, for accountID: UUID) throws {
        var accounts = load()
        accounts[accountID.uuidString] = tokens
        try write(accounts)
    }

    public func removeAll() throws {
        guard FileManager.default.fileExists(atPath: file.path) else { return }
        try FileManager.default.removeItem(at: file)
    }

    private func load() -> [String: AccountTokens] {
        guard FileManager.default.fileExists(atPath: file.path) else { return [:] }
        let data: Data
        do {
            data = try Data(contentsOf: file)
        } catch {
            Log.logger.error("Token file unreadable: \(String(describing: error), privacy: .public)")
            return [:]
        }
        do {
            let version = try JSONDecoder().decode(VersionProbe.self, from: data).schemaVersion
            guard version == Self.schemaVersion else {
                clear(reason: "schemaVersion \(version)")
                return [:]
            }
            return try JSONDecoder().decode(Envelope.self, from: data).accounts
        } catch {
            clear(reason: String(describing: error))
            return [:]
        }
    }

    // Cleared tokens make the next read start from nothing, which recovers everything.
    private func clear(reason: String) {
        Log.logger.warning("Clearing incompatible token file: \(reason, privacy: .public)")
        do {
            try FileManager.default.removeItem(at: file)
        } catch {
            Log.logger.error("Could not remove token file: \(String(describing: error), privacy: .public)")
        }
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
