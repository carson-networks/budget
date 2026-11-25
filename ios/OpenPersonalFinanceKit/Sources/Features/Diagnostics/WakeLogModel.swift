import Domain
import Observation
import os

@Observable
public final class WakeLogModel {
    public private(set) var entries: [WakeLogEntry] = []
    public private(set) var failed = false
    private let activity: any ActivityReading

    public init(activity: any ActivityReading) {
        self.activity = activity
    }

    public func load() async {
        do {
            entries = try await activity.recentWakes()
            failed = false
        } catch {
            Log.logger.error("Reading the wake log failed: \(String(describing: error), privacy: .public)")
            failed = true
        }
    }
}
