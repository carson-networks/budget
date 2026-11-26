// What screens use to show recent background activity; the log files stay behind it.
public protocol ActivityReading: Sendable {
    // Newest first.
    func recentWakes() async throws -> [WakeLogEntry]
}
