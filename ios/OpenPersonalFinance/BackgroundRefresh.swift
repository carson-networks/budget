import BackgroundTasks
import os

// Phase 1 only probes on refresh, to compare how often it fires with background delivery.
nonisolated enum BackgroundRefresh {
    static let identifier = "net.carsonnetworks.OpenPersonalFinance.refresh"

    private static let logger = Logger(subsystem: "net.carsonnetworks.OpenPersonalFinance", category: "App")

    static func schedule() async {
        let request = BGAppRefreshTaskRequest(identifier: identifier)
        request.earliestBeginDate = .now.addingTimeInterval(60 * 60)
        do {
            try await BGTaskScheduler.shared.submitTaskRequest(request)
        } catch {
            logger.error("Scheduling background refresh failed: \(String(describing: error), privacy: .public)")
        }
    }
}
