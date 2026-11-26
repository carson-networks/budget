import Foundation
import os

protocol VersionedEnvelope: Codable {
    static var currentVersion: Int { get }
    var schemaVersion: Int { get }
}

// A store's file: missing reads as nil, and a corrupt or incompatible one is removed with a warning and reads as nil.
struct VersionedFile<Envelope: VersionedEnvelope>: Sendable {
    private struct VersionProbe: Decodable {
        let schemaVersion: Int
    }

    let url: URL

    // A read error throws rather than reading as nil, so a write never replaces a file it could not see.
    func read() throws -> Envelope? {
        let data: Data
        do {
            data = try Data(contentsOf: url)
        } catch CocoaError.fileReadNoSuchFile {
            return nil
        }
        do {
            let version = try JSONDecoder().decode(VersionProbe.self, from: data).schemaVersion
            guard version == Envelope.currentVersion else {
                try clear(reason: "schemaVersion \(version)")
                return nil
            }
            return try JSONDecoder().decode(Envelope.self, from: data)
        } catch let error as DecodingError {
            try clear(reason: String(describing: error))
            return nil
        }
    }

    func write(_ envelope: Envelope) throws {
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try JSONEncoder().encode(envelope).write(to: url, options: .atomic)
    }

    func remove() throws {
        do {
            try FileManager.default.removeItem(at: url)
        } catch CocoaError.fileNoSuchFile {
            return
        }
    }

    private func clear(reason: String) throws {
        Log.logger.warning(
            "Clearing incompatible \(url.lastPathComponent, privacy: .public): \(reason, privacy: .public)")
        try remove()
    }
}
