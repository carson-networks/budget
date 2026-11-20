public enum WalletAuthorization: String, Codable, Equatable, Hashable, Sendable, CaseIterable {
    case notDetermined
    case authorized
    case denied
    case restricted
}
