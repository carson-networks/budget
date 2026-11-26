import BackgroundTasks
import Foundation
import os

nonisolated enum BackgroundRefresh {
    static let identifier = "net.carsonnetworks.OpenPersonalFinance.refresh"
    // Hourly, to compare with background delivery at its hourly frequency.
    private static let interval: TimeInterval = 60 * 60
    private static let logger = Logger(subsystem: "net.carsonnetworks.OpenPersonalFinance", category: "App")

    // Replaces any pending request, so calling it on every backgrounding keeps exactly one.
    static func schedule() async {
        let request = BGAppRefreshTaskRequest(identifier: identifier)
        request.earliestBeginDate = Date(timeIntervalSinceNow: interval)
        do {
            try await BGTaskScheduler.shared.submitTaskRequest(request)
        } catch {
            logger.error("Scheduling background refresh failed: \(String(describing: error), privacy: .public)")
        }
    }
}
