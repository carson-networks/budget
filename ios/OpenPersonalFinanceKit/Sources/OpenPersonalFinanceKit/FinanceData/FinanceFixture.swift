import Foundation

/// The JSON fixture format read by `FakeFinanceDataSource`. See `Fixtures/README.md`.
public struct FinanceFixture: Codable, Equatable, Sendable {
    public struct Step<Item: Identifiable & Codable & Equatable & Sendable>: Codable, Equatable, Sendable
    where Item.ID == UUID {
        public var inserted: [Item]
        public var updated: [Item]
        public var deleted: [UUID]

        public init(inserted: [Item] = [], updated: [Item] = [], deleted: [UUID] = []) {
            self.inserted = inserted
            self.updated = updated
            self.deleted = deleted
        }

        enum CodingKeys: String, CodingKey, CaseIterable {
            case inserted, updated, deleted
        }

        public init(from decoder: any Decoder) throws {
            let container = try decoder.strictContainer(keyedBy: CodingKeys.self)
            inserted = try container.decodeIfPresent([Item].self, forKey: .inserted) ?? []
            updated = try container.decodeIfPresent([Item].self, forKey: .updated) ?? []
            deleted = try container.decodeIfPresent([UUID].self, forKey: .deleted) ?? []
        }

        func changeSet(token: Data) -> ChangeSet<Item> {
            ChangeSet(inserted: inserted, updated: updated, deleted: deleted, newToken: token)
        }
    }

    public struct AccountHistory: Codable, Equatable, Sendable {
        public var accountID: UUID
        public var balanceChanges: [Step<WalletBalance>]
        public var transactionChanges: [Step<WalletTransaction>]

        public init(
            accountID: UUID, balanceChanges: [Step<WalletBalance>] = [],
            transactionChanges: [Step<WalletTransaction>] = []
        ) {
            self.accountID = accountID
            self.balanceChanges = balanceChanges
            self.transactionChanges = transactionChanges
        }

        enum CodingKeys: String, CodingKey, CaseIterable {
            case accountID, balanceChanges, transactionChanges
        }

        public init(from decoder: any Decoder) throws {
            let container = try decoder.strictContainer(keyedBy: CodingKeys.self)
            accountID = try container.decode(UUID.self, forKey: .accountID)
            balanceChanges = try container.decodeIfPresent([Step<WalletBalance>].self, forKey: .balanceChanges) ?? []
            transactionChanges =
                try container.decodeIfPresent([Step<WalletTransaction>].self, forKey: .transactionChanges) ?? []
        }
    }

    public var accountChanges: [Step<WalletAccount>]
    public var accountHistories: [AccountHistory]

    public init(accountChanges: [Step<WalletAccount>], accountHistories: [AccountHistory]) {
        self.accountChanges = accountChanges
        self.accountHistories = accountHistories
    }

    enum CodingKeys: String, CodingKey, CaseIterable {
        case accountChanges, accountHistories
    }

    public init(from decoder: any Decoder) throws {
        let container = try decoder.strictContainer(keyedBy: CodingKeys.self)
        accountChanges = try container.decode([Step<WalletAccount>].self, forKey: .accountChanges)
        accountHistories = try container.decodeIfPresent([AccountHistory].self, forKey: .accountHistories) ?? []
    }

    public static func decode(from data: Data) throws -> FinanceFixture {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(FinanceFixture.self, from: data)
    }

    public func encoded() throws -> Data {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        return try encoder.encode(self)
    }

    /// The hand-written fixture shipped with the package; the Simulator runs against it.
    public static func sample() throws -> FinanceFixture {
        guard let url = Bundle.module.url(forResource: "sample", withExtension: "json", subdirectory: "Fixtures") else {
            throw CocoaError(.fileNoSuchFile)
        }
        return try decode(from: Data(contentsOf: url))
    }
}
