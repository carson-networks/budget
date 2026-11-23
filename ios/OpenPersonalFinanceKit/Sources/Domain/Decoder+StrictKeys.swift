private struct AnyCodingKey: CodingKey {
    let stringValue: String
    let intValue: Int?

    init?(stringValue: String) {
        self.stringValue = stringValue
        self.intValue = nil
    }

    init?(intValue: Int) {
        self.stringValue = String(intValue)
        self.intValue = intValue
    }
}

extension Decoder {
    // JSONDecoder ignores unknown keys by default; validate explicitly so typos fail fast.
    package func rejectUnknownKeys<Keys: CodingKey & CaseIterable>(
        allowed _: Keys.Type
    ) throws {
        let container = try self.container(keyedBy: AnyCodingKey.self)
        let allowedNames = Set(Keys.allCases.map(\.stringValue))
        let unknownKeys =
            container.allKeys
            .map(\.stringValue)
            .filter { !allowedNames.contains($0) }
            .sorted()
        guard unknownKeys.isEmpty else {
            throw DecodingError.dataCorrupted(
                DecodingError.Context(
                    codingPath: container.codingPath,
                    debugDescription: "Unknown key(s): \(unknownKeys.joined(separator: ", "))"
                )
            )
        }
    }
}
