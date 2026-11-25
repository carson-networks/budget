import Foundation

// Runs background wakes one after another and stops them on termination. A second wake queues behind the
// one in flight instead of replacing its handle, so willTerminate can always reach every running wake.
package actor WakeCoordinator {
    private let gracePeriod: Duration
    private var running: [UUID: Task<Void, Never>] = [:]
    private var last: Task<Void, Never>?

    package init(gracePeriod: Duration = .seconds(3)) {
        self.gracePeriod = gracePeriod
    }

    // Returns once this wake has finished; cancelling the caller cancels the wake.
    package func run(_ operation: @escaping @Sendable () async -> Void) async {
        let previous = last
        let task = Task {
            await previous?.value
            guard !Task.isCancelled else { return }
            await operation()
        }
        let id = UUID()
        running[id] = task
        last = task
        await withTaskCancellationHandler {
            await task.value
        } onCancel: {
            task.cancel()
        }
        running[id] = nil
        if last == task {
            last = nil
        }
    }

    // Cancels every wake, then waits for their cleanup for at most the grace period.
    package func cancelAll() async {
        let tasks = Array(running.values)
        for task in tasks {
            task.cancel()
        }
        let (finished, continuation) = AsyncStream.makeStream(of: Void.self)
        let drain = Task {
            for task in tasks {
                await task.value
            }
            continuation.finish()
        }
        let timeout = Task { [gracePeriod] in
            try? await Task.sleep(for: gracePeriod)
            continuation.finish()
        }
        for await _ in finished {}
        drain.cancel()
        timeout.cancel()
    }
}
