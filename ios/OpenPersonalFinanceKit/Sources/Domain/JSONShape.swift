// A JSON layout for a Domain value, so the value itself carries no serialization.
protocol JSONShape: Codable {
    associatedtype Value
    var value: Value { get }
    init(_ value: Value)
}

extension KeyedDecodingContainer {
    func decodeRaw<Raw: RawRepresentable>(_ type: Raw.Type, forKey key: Key) throws -> Raw
    where Raw.RawValue == String {
        let raw = try decode(String.self, forKey: key)
        guard let value = Raw(rawValue: raw) else {
            throw DecodingError.dataCorruptedError(forKey: key, in: self, debugDescription: "Unknown value \(raw)")
        }
        return value
    }
}
