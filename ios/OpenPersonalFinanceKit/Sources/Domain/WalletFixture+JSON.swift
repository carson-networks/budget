import Foundation

extension WalletFixture {
    package static let schemaVersion = 1

    package static func decode(from data: Data) throws -> WalletFixture {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(WalletFixtureJSON.self, from: data).value
    }

    package func encoded() throws -> Data {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        return try encoder.encode(WalletFixtureJSON(self))
    }
}

private struct WalletFixtureJSON: JSONShape {
    let value: WalletFixture

    init(_ value: WalletFixture) {
        self.value = value
    }

    private enum CodingKeys: String, CodingKey, CaseIterable {
        case schemaVersion
        case accounts
        case accountHistories
    }

    init(from decoder: any Decoder) throws {
        try decoder.rejectUnknownKeys(allowed: CodingKeys.self)
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let version = try container.decode(Int.self, forKey: .schemaVersion)
        guard version == WalletFixture.schemaVersion else {
            throw DecodingError.dataCorruptedError(
                forKey: .schemaVersion,
                in: container,
                debugDescription: "Unsupported fixture schemaVersion \(version)"
            )
        }
        value = WalletFixture(
            accounts: try container.decode([ChangesJSON<WalletAccountJSON>].self, forKey: .accounts).map(\.value),
            accountHistories: try container.decode([AccountHistoryJSON].self, forKey: .accountHistories).map(\.value)
        )
    }

    func encode(to encoder: any Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(WalletFixture.schemaVersion, forKey: .schemaVersion)
        try container.encode(value.accounts.map(ChangesJSON<WalletAccountJSON>.init), forKey: .accounts)
        try container.encode(value.accountHistories.map(AccountHistoryJSON.init), forKey: .accountHistories)
    }
}

private struct AccountHistoryJSON: JSONShape {
    let value: WalletFixture.AccountHistory

    init(_ value: WalletFixture.AccountHistory) {
        self.value = value
    }

    private enum CodingKeys: String, CodingKey, CaseIterable {
        case accountID
        case balances
        case transactions
    }

    init(from decoder: any Decoder) throws {
        try decoder.rejectUnknownKeys(allowed: CodingKeys.self)
        let container = try decoder.container(keyedBy: CodingKeys.self)
        value = WalletFixture.AccountHistory(
            accountID: try container.decode(UUID.self, forKey: .accountID),
            balances: try container.decodeIfPresent([ChangesJSON<WalletBalanceJSON>].self, forKey: .balances)?
                .map(\.value) ?? [],
            transactions: try container.decodeIfPresent(
                [ChangesJSON<WalletTransactionJSON>].self,
                forKey: .transactions
            )?.map(\.value) ?? []
        )
    }

    func encode(to encoder: any Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(value.accountID, forKey: .accountID)
        try container.encode(value.balances.map(ChangesJSON<WalletBalanceJSON>.init), forKey: .balances)
        try container.encode(value.transactions.map(ChangesJSON<WalletTransactionJSON>.init), forKey: .transactions)
    }
}

private struct ChangesJSON<Shape: JSONShape>: JSONShape
where Shape.Value: Identifiable & Sendable, Shape.Value.ID == UUID {
    let value: WalletChanges<Shape.Value>

    init(_ value: WalletChanges<Shape.Value>) {
        self.value = value
    }

    private enum CodingKeys: String, CodingKey, CaseIterable {
        case inserted
        case updated
        case deleted
    }

    init(from decoder: any Decoder) throws {
        try decoder.rejectUnknownKeys(allowed: CodingKeys.self)
        let container = try decoder.container(keyedBy: CodingKeys.self)
        value = WalletChanges(
            inserted: try container.decodeIfPresent([Shape].self, forKey: .inserted)?.map(\.value) ?? [],
            updated: try container.decodeIfPresent([Shape].self, forKey: .updated)?.map(\.value) ?? [],
            deleted: try container.decodeIfPresent([UUID].self, forKey: .deleted) ?? []
        )
    }

    func encode(to encoder: any Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        if !value.inserted.isEmpty { try container.encode(value.inserted.map(Shape.init), forKey: .inserted) }
        if !value.updated.isEmpty { try container.encode(value.updated.map(Shape.init), forKey: .updated) }
        if !value.deleted.isEmpty { try container.encode(value.deleted, forKey: .deleted) }
    }
}
