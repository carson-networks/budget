public enum FinanceDataError: Error, Equatable, Hashable, Sendable {
    case notAuthorized
    case dataUnavailable
    case invalidToken
}
