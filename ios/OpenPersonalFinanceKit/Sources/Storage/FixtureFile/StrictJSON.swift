import Domain
import Foundation

// JSONDecoder ignores unknown keys, so a typo would silently drop a field. Re-encoding what was decoded
// and comparing keys finds any the structs didn't keep.
enum StrictJSON {
    static func decode<Value: Codable>(
        _ type: Value.Type,
        from data: Data,
        decoder: JSONDecoder,
        encoder: JSONEncoder
    ) throws -> Value {
        let value = try decoder.decode(type, from: data)
        let input = try JSONSerialization.jsonObject(with: data)
        let kept = try JSONSerialization.jsonObject(with: encoder.encode(value))
        try checkKeys(input, kept: kept, path: "")
        return value
    }

    private static func checkKeys(_ input: Any, kept: Any, path: String) throws {
        if let input = input as? [String: Any], let kept = kept as? [String: Any] {
            for (key, value) in input where !(value is NSNull) {
                guard let keptValue = kept[key] else {
                    throw FixtureMapping.invalid("Unknown key \(path)\(key)")
                }
                try checkKeys(value, kept: keptValue, path: "\(path)\(key).")
            }
        } else if let input = input as? [Any], let kept = kept as? [Any] {
            for (index, (value, keptValue)) in zip(input, kept).enumerated() {
                try checkKeys(value, kept: keptValue, path: "\(path)\(index).")
            }
        }
    }
}
