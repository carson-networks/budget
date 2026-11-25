import Domain
import Foundation

// Checks the file's strings while mapping to Domain values; errors are DecodingErrors like any other bad file.
enum FixtureMapping {
    private static let posixLocale = Locale(identifier: "en_US_POSIX")

    // Money is a decimal string in the file so it never passes through Double.
    static func money(_ raw: String, field: String) throws -> Decimal {
        guard isDecimalString(raw), let value = Decimal(string: raw, locale: posixLocale), !value.isNaN else {
            throw invalid("Invalid \(field) \(raw)")
        }
        return value
    }

    static func enumValue<Value: RawRepresentable>(_ raw: String, field: String) throws -> Value
    where Value.RawValue == String {
        guard let value = Value(rawValue: raw) else {
            throw invalid("Unknown \(field) \(raw)")
        }
        return value
    }

    static func invalid(_ description: String) -> DecodingError {
        DecodingError.dataCorrupted(DecodingError.Context(codingPath: [], debugDescription: description))
    }

    // Decimal(string:locale:) accepts partial prefixes like "12.34abc" and "1,000", so check the syntax first.
    private static func isDecimalString(_ raw: String) -> Bool {
        var rest = Substring(raw)
        if rest.first == "+" || rest.first == "-" {
            rest = rest.dropFirst()
        }
        let parts = rest.split(separator: ".", omittingEmptySubsequences: false)
        return (parts.count == 1 || parts.count == 2)
            && parts.allSatisfy { !$0.isEmpty && $0.allSatisfy { $0.isASCII && $0.isNumber } }
    }
}
