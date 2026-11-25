import Domain
import Foundation
import os

package actor ScheduleStore: ScheduleStoring {
    private static let schemaVersion = 1

    private struct Envelope: Codable {
        let schemaVersion: Int
        let frequency: String
    }

    private struct VersionProbe: Decodable {
        let schemaVersion: Int
    }

    private let file: URL

    package init(directory: AppGroupDirectory) {
        file = directory.scheduleFile
    }

    package func frequency() throws -> SyncFrequency? {
        let data: Data
        do {
            data = try Data(contentsOf: file)
        } catch CocoaError.fileReadNoSuchFile {
            return nil
        }
        do {
            let version = try JSONDecoder().decode(VersionProbe.self, from: data).schemaVersion
            guard version == Self.schemaVersion else {
                try clear(reason: "schemaVersion \(version)")
                return nil
            }
            let raw = try JSONDecoder().decode(Envelope.self, from: data).frequency
            guard let frequency = SyncFrequency(rawValue: raw) else {
                try clear(reason: "unknown frequency")
                return nil
            }
            return frequency
        } catch let error as DecodingError {
            try clear(reason: String(describing: error))
            return nil
        }
    }

    package func save(_ frequency: SyncFrequency) throws {
        try FileManager.default.createDirectory(
            at: file.deletingLastPathComponent(),
            withIntermediateDirectories: true
        )
        let data = try JSONEncoder().encode(Envelope(schemaVersion: Self.schemaVersion, frequency: frequency.rawValue))
        try data.write(to: file, options: .atomic)
    }

    // A cleared file reads as no choice, which leaves background delivery as it is until one is made.
    private func clear(reason: String) throws {
        Log.logger.warning("Clearing incompatible schedule file: \(reason, privacy: .public)")
        do {
            try FileManager.default.removeItem(at: file)
        } catch CocoaError.fileNoSuchFile {
            return
        }
    }
}
