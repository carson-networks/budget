import Foundation

// Amounts decode from decimal strings so money never passes through Double.
package enum DecimalStringCoding {
    private static let posixLocale = Locale(identifier: "en_US_POSIX")

    package static func parse(_ raw: String, codingPath: [any CodingKey]) throws -> Decimal {
        guard isValidDecimalString(raw),
            let value = Decimal(string: raw, locale: posixLocale),
            !value.isNaN
        else {
            throw DecodingError.dataCorrupted(
                DecodingError.Context(
                    codingPath: codingPath,
                    debugDescription: "Invalid decimal string: \(raw)"
                )
            )
        }
        return value
    }

    package static func decode<Key: CodingKey>(
        from container: KeyedDecodingContainer<Key>,
        forKey key: Key
    ) throws -> Decimal {
        let raw = try container.decode(String.self, forKey: key)
        return try parse(raw, codingPath: container.codingPath + [key])
    }

    package static func decodeIfPresent<Key: CodingKey>(
        from container: KeyedDecodingContainer<Key>,
        forKey key: Key
    ) throws -> Decimal? {
        guard let raw = try container.decodeIfPresent(String.self, forKey: key) else {
            return nil
        }
        return try parse(raw, codingPath: container.codingPath + [key])
    }

    // Decimal(string:locale:) accepts partial prefixes like "12.34abc" and "1,000", so validate syntax first.
    private static func isValidDecimalString(_ raw: String) -> Bool {
        guard !raw.isEmpty else { return false }
        var index = raw.startIndex
        if raw[index] == "+" || raw[index] == "-" {
            index = raw.index(after: index)
            guard index < raw.endIndex else { return false }
        }
        var integerDigits = 0
        while index < raw.endIndex, raw[index].isASCII, raw[index].isNumber {
            integerDigits += 1
            index = raw.index(after: index)
        }
        guard integerDigits > 0 else { return false }
        if index == raw.endIndex {
            return true
        }
        guard raw[index] == "." else { return false }
        index = raw.index(after: index)
        var fractionalDigits = 0
        while index < raw.endIndex, raw[index].isASCII, raw[index].isNumber {
            fractionalDigits += 1
            index = raw.index(after: index)
        }
        return fractionalDigits > 0 && index == raw.endIndex
    }
}
