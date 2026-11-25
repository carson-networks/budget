import Foundation

// What screens use to read Wallet history; when tokens are read, saved or cleared stays behind it.
public protocol WalletHistoryReading: Sendable {
    // Reads everything, and saves starting tokens for any account that has none.
    func readEverything() async throws -> WalletRead
    // Reads one account since its saved tokens, or from the start if there are none, then saves the new ones.
    func readSinceSavedTokens(accountID: UUID) async throws -> AccountHistoryRead
    func resetTokens() async throws
}
