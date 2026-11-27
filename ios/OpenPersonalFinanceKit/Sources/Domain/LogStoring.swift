public protocol LogStoring<Entry>: Sendable {
    associatedtype Entry: Sendable

    func append(_ entry: Entry) async throws
    // Oldest first.
    func entries() async throws -> [Entry]
}
