import Foundation

package struct WalletFixture: Codable, Sendable {
    package static let schemaVersion = 1
    package static let empty = WalletFixture(accounts: [], accountHistories: [])

    package struct AccountHistory: Codable, Sendable {
        package let accountID: UUID
        package let balances: [WalletFixtureStep<WalletBalance>]
        package let transactions: [WalletFixtureStep<WalletTransaction>]

        package init(
            accountID: UUID,
            balances: [WalletFixtureStep<WalletBalance>],
            transactions: [WalletFixtureStep<WalletTransaction>]
        ) {
            self.accountID = accountID
            self.balances = balances
            self.transactions = transactions
        }

        private enum CodingKeys: String, CodingKey, CaseIterable {
            case accountID
            case balances
            case transactions
        }

        package init(from decoder: any Decoder) throws {
            try decoder.rejectUnknownKeys(allowed: CodingKeys.self)
            let container = try decoder.container(keyedBy: CodingKeys.self)
            accountID = try container.decode(UUID.self, forKey: .accountID)
            balances = try container.decodeIfPresent([WalletFixtureStep<WalletBalance>].self, forKey: .balances) ?? []
            transactions =
                try container.decodeIfPresent([WalletFixtureStep<WalletTransaction>].self, forKey: .transactions) ?? []
        }
    }

    package let accounts: [WalletFixtureStep<WalletAccount>]
    package let accountHistories: [AccountHistory]

    package init(accounts: [WalletFixtureStep<WalletAccount>], accountHistories: [AccountHistory]) {
        self.accounts = accounts
        self.accountHistories = accountHistories
    }

    package func history(for accountID: UUID) -> AccountHistory? {
        accountHistories.first { $0.accountID == accountID }
    }

    // Each stream keeps its own steps, so an account first seen in `next` starts at its own step 0.
    package func appending(_ next: WalletFixture) -> WalletFixture {
        var histories = accountHistories
        for history in next.accountHistories {
            if let index = histories.firstIndex(where: { $0.accountID == history.accountID }) {
                histories[index] = AccountHistory(
                    accountID: history.accountID,
                    balances: histories[index].balances + history.balances,
                    transactions: histories[index].transactions + history.transactions
                )
            } else {
                histories.append(history)
            }
        }
        return WalletFixture(accounts: accounts + next.accounts, accountHistories: histories)
    }

    private enum CodingKeys: String, CodingKey, CaseIterable {
        case schemaVersion
        case accounts
        case accountHistories
    }

    package init(from decoder: any Decoder) throws {
        try decoder.rejectUnknownKeys(allowed: CodingKeys.self)
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let version = try container.decode(Int.self, forKey: .schemaVersion)
        guard version == Self.schemaVersion else {
            throw DecodingError.dataCorruptedError(
                forKey: .schemaVersion,
                in: container,
                debugDescription: "Unsupported fixture schemaVersion \(version)"
            )
        }
        accounts = try container.decode([WalletFixtureStep<WalletAccount>].self, forKey: .accounts)
        accountHistories = try container.decode([AccountHistory].self, forKey: .accountHistories)
    }

    package func encode(to encoder: any Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(Self.schemaVersion, forKey: .schemaVersion)
        try container.encode(accounts, forKey: .accounts)
        try container.encode(accountHistories, forKey: .accountHistories)
    }

    package static func decode(from data: Data) throws -> WalletFixture {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(WalletFixture.self, from: data)
    }

    package func encoded() throws -> Data {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        return try encoder.encode(self)
    }
}
