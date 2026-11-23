import Foundation

package struct WalletFixture: Decodable, Sendable {
    package static let empty = WalletFixture(accounts: [], balances: [], transactions: [])

    package let accounts: [WalletAccount]
    package let balances: [WalletBalance]
    package let transactions: [WalletTransaction]

    package init(accounts: [WalletAccount], balances: [WalletBalance], transactions: [WalletTransaction]) {
        self.accounts = accounts
        self.balances = balances
        self.transactions = transactions
    }

    private enum CodingKeys: String, CodingKey, CaseIterable {
        case accounts
        case balances
        case transactions
    }

    package init(from decoder: any Decoder) throws {
        try decoder.rejectUnknownKeys(allowed: CodingKeys.self)
        let container = try decoder.container(keyedBy: CodingKeys.self)
        accounts = try container.decode([WalletAccount].self, forKey: .accounts)
        balances = try container.decode([WalletBalance].self, forKey: .balances)
        transactions = try container.decode([WalletTransaction].self, forKey: .transactions)
    }

    package static func decode(from data: Data) throws -> WalletFixture {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(WalletFixture.self, from: data)
    }
}
