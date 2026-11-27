import Domain

package actor InMemoryLogStore<Entry: Sendable>: LogStoring {
    private var stored: [Entry] = []

    package init() {}

    package func append(_ entry: Entry) {
        stored.append(entry)
    }

    package func entries() -> [Entry] {
        stored
    }
}
