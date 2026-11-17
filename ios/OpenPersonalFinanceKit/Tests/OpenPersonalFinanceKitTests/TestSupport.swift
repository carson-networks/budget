import Foundation

@testable import OpenPersonalFinanceKit

extension UUID {
    init(_ literal: StaticString) {
        guard let uuid = UUID(uuidString: "\(literal)") else { preconditionFailure("bad UUID literal \(literal)") }
        self = uuid
    }
}

extension Decimal {
    init(_ literal: StaticString) {
        guard let value = Decimal(exactString: "\(literal)") else { preconditionFailure("bad decimal \(literal)") }
        self = value
    }
}
