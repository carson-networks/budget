import Domain

package actor InMemoryLog<Entry: Sendable>: LogStoring {
    private var stored: [Entry]

    package init(entries: [Entry] = []) {
        stored = entries
    }

    package func append(_ entry: Entry) {
        stored.append(entry)
    }

    package func entries() -> [Entry] {
        stored
    }
}
