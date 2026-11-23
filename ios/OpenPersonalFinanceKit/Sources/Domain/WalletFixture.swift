import Foundation

public struct WalletFixture: Codable, Equatable, Sendable {
    public static let currentSchemaVersion = 1

    package static let empty = WalletFixture(accounts: [], accountChanges: [], histories: [])

    public struct ChangeStep<Element: Identifiable & Codable & Equatable & Sendable>: Codable, Equatable, Sendable
    where Element.ID: Hashable & Codable & Sendable {
        public let inserted: [Element]
        public let updated: [Element]
        public let deleted: [Element.ID]

        public init(
            inserted: [Element] = [],
            updated: [Element] = [],
            deleted: [Element.ID] = []
        ) {
            self.inserted = inserted
            self.updated = updated
            self.deleted = deleted
        }

        private enum CodingKeys: String, CodingKey, CaseIterable {
            case inserted
            case updated
            case deleted
        }

        public init(from decoder: any Decoder) throws {
            try decoder.rejectUnknownKeys(allowed: CodingKeys.self)
            let container = try decoder.container(keyedBy: CodingKeys.self)
            inserted = try container.decodeIfPresent([Element].self, forKey: .inserted) ?? []
            updated = try container.decodeIfPresent([Element].self, forKey: .updated) ?? []
            deleted = try container.decodeIfPresent([Element.ID].self, forKey: .deleted) ?? []
        }

        public func encode(to encoder: any Encoder) throws {
            var container = encoder.container(keyedBy: CodingKeys.self)
            try container.encode(inserted, forKey: .inserted)
            try container.encode(updated, forKey: .updated)
            try container.encode(deleted, forKey: .deleted)
        }
    }

    public struct AccountHistory: Codable, Equatable, Sendable {
        public let accountID: UUID
        public let balanceChanges: [ChangeStep<WalletBalance>]
        public let transactionChanges: [ChangeStep<WalletTransaction>]

        public init(
            accountID: UUID,
            balanceChanges: [ChangeStep<WalletBalance>] = [],
            transactionChanges: [ChangeStep<WalletTransaction>] = []
        ) {
            self.accountID = accountID
            self.balanceChanges = balanceChanges
            self.transactionChanges = transactionChanges
        }

        private enum CodingKeys: String, CodingKey, CaseIterable {
            case accountID
            case balanceChanges
            case transactionChanges
        }

        public init(from decoder: any Decoder) throws {
            try decoder.rejectUnknownKeys(allowed: CodingKeys.self)
            let container = try decoder.container(keyedBy: CodingKeys.self)
            accountID = try container.decode(UUID.self, forKey: .accountID)
            balanceChanges =
                try container.decodeIfPresent([ChangeStep<WalletBalance>].self, forKey: .balanceChanges) ?? []
            transactionChanges =
                try container.decodeIfPresent([ChangeStep<WalletTransaction>].self, forKey: .transactionChanges) ?? []
        }

        public func encode(to encoder: any Encoder) throws {
            var container = encoder.container(keyedBy: CodingKeys.self)
            try container.encode(accountID, forKey: .accountID)
            try container.encode(balanceChanges, forKey: .balanceChanges)
            try container.encode(transactionChanges, forKey: .transactionChanges)
        }
    }

    public let schemaVersion: Int
    public let accounts: [WalletAccount]
    public let accountChanges: [ChangeStep<WalletAccount>]
    public let histories: [AccountHistory]

    public init(
        schemaVersion: Int = WalletFixture.currentSchemaVersion,
        accounts: [WalletAccount],
        accountChanges: [ChangeStep<WalletAccount>] = [],
        histories: [AccountHistory]
    ) {
        self.schemaVersion = schemaVersion
        self.accounts = accounts
        self.accountChanges = accountChanges
        self.histories = histories
    }

    private enum CodingKeys: String, CodingKey, CaseIterable {
        case schemaVersion
        case accounts
        case accountChanges
        case histories
    }

    public init(from decoder: any Decoder) throws {
        try decoder.rejectUnknownKeys(allowed: CodingKeys.self)
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let version = try container.decode(Int.self, forKey: .schemaVersion)
        guard version == Self.currentSchemaVersion else {
            throw DecodingError.dataCorruptedError(
                forKey: .schemaVersion,
                in: container,
                debugDescription: "Unsupported WalletFixture schemaVersion: \(version)"
            )
        }
        schemaVersion = version
        accounts = try container.decode([WalletAccount].self, forKey: .accounts)
        accountChanges =
            try container.decodeIfPresent([ChangeStep<WalletAccount>].self, forKey: .accountChanges) ?? []
        let decodedHistories = try container.decode([AccountHistory].self, forKey: .histories)

        var seenAccountIDs: Set<UUID> = []
        for history in decodedHistories {
            guard seenAccountIDs.insert(history.accountID).inserted else {
                throw DecodingError.dataCorruptedError(
                    forKey: .histories,
                    in: container,
                    debugDescription: "Duplicate history for accountID \(history.accountID.uuidString)"
                )
            }
        }
        histories = decodedHistories
    }

    public func encode(to encoder: any Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(schemaVersion, forKey: .schemaVersion)
        try container.encode(accounts, forKey: .accounts)
        try container.encode(accountChanges, forKey: .accountChanges)
        try container.encode(histories, forKey: .histories)
    }

    package static func decode(from data: Data) throws -> WalletFixture {
        try makeDecoder().decode(WalletFixture.self, from: data)
    }

    package func encodedJSON() throws -> Data {
        try Self.makeEncoder().encode(self)
    }

    package static func makeDecoder() -> JSONDecoder {
        let decoder = JSONDecoder()
        let withFractional = Date.ISO8601FormatStyle(includingFractionalSeconds: true)
        let withoutFractional = Date.ISO8601FormatStyle(includingFractionalSeconds: false)
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let raw = try container.decode(String.self)
            if let date = try? withFractional.parse(raw) {
                return date
            }
            if let date = try? withoutFractional.parse(raw) {
                return date
            }
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Invalid ISO 8601 date: \(raw)"
            )
        }
        return decoder
    }

    package static func makeEncoder() -> JSONEncoder {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        let style = Date.ISO8601FormatStyle(includingFractionalSeconds: true)
        encoder.dateEncodingStrategy = .custom { date, encoder in
            var container = encoder.singleValueContainer()
            try container.encode(date.formatted(style))
        }
        return encoder
    }
}
