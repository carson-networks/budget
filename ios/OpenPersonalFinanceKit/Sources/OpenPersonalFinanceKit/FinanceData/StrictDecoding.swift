import Foundation

struct AnyCodingKey: CodingKey {
    let stringValue: String
    let intValue: Int?

    init(stringValue: String) {
        self.stringValue = stringValue
        intValue = nil
    }

    init?(intValue: Int) {
        stringValue = String(intValue)
        self.intValue = intValue
    }
}

extension Decoder {
    // Synthesized Decodable ignores unknown keys, which would let a typo in a fixture pass silently.
    func strictContainer<Key: CodingKey & CaseIterable>(keyedBy type: Key.Type) throws -> KeyedDecodingContainer<Key> {
        let allowed = Set(Key.allCases.map(\.stringValue))
        let raw = try container(keyedBy: AnyCodingKey.self)
        if let unknown = raw.allKeys.first(where: { !allowed.contains($0.stringValue) }) {
            throw DecodingError.dataCorrupted(
                .init(codingPath: codingPath + [unknown], debugDescription: "Unknown key '\(unknown.stringValue)'")
            )
        }
        return try container(keyedBy: Key.self)
    }
}

extension KeyedDecodingContainer {
    func decodeDecimal(forKey key: Key) throws -> Decimal {
        let string = try decode(String.self, forKey: key)
        guard let value = Decimal(exactString: string) else {
            throw DecodingError.dataCorruptedError(
                forKey: key, in: self, debugDescription: "'\(string)' is not a non-negative decimal string")
        }
        return value
    }

    func decodeDecimalIfPresent(forKey key: Key) throws -> Decimal? {
        try contains(key) && !decodeNil(forKey: key) ? decodeDecimal(forKey: key) : nil
    }
}

extension KeyedEncodingContainer {
    mutating func encodeDecimal(_ value: Decimal, forKey key: Key) throws {
        try encode(value.description, forKey: key)
    }

    mutating func encodeDecimalIfPresent(_ value: Decimal?, forKey key: Key) throws {
        if let value { try encodeDecimal(value, forKey: key) }
    }
}

extension Decimal {
    // Decimal(string:) accepts trailing garbage ("12abc" is 12), so the shape is checked first.
    init?(exactString string: String) {
        guard string.wholeMatch(of: /[0-9]+(\.[0-9]+)?/) != nil,
            let value = Decimal(string: string, locale: Locale(identifier: "en_US_POSIX"))
        else { return nil }
        self = value
    }
}
