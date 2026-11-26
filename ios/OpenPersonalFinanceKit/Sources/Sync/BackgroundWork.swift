// Runs overlapping wakes one after another, so a second wake never replaces the handle of one still running.
package actor BackgroundWork {
    private var last: Task<Void, Never>?
    private var running: [Int: Task<Void, Never>] = [:]
    private var idleWaiters: [Int: CheckedContinuation<Void, Never>] = [:]
    private var nextID = 0

    package init() {}

    package func run(_ work: @escaping @Sendable @concurrent () async -> Void) async {
        let previous = last
        let id = takeID()
        let task = Task {
            await previous?.value
            await work()
        }
        last = task
        running[id] = task
        await task.value
        running[id] = nil
        if running.isEmpty {
            idleWaiters.values.forEach { $0.resume() }
            idleWaiters = [:]
        }
    }

    // Returns when every run has finished its cleanup, or after `grace` if one does not stop in time.
    package func cancelAll(grace: Duration) async {
        guard !running.isEmpty else { return }
        running.values.forEach { $0.cancel() }
        let id = takeID()
        // Awaiting a task's value ignores cancellation, so the grace period resumes the wait itself.
        let timeout = Task {
            try? await Task.sleep(for: grace)
            stopWaiting(id)
        }
        await withCheckedContinuation { idleWaiters[id] = $0 }
        timeout.cancel()
    }

    private func stopWaiting(_ id: Int) {
        idleWaiters.removeValue(forKey: id)?.resume()
    }

    private func takeID() -> Int {
        defer { nextID += 1 }
        return nextID
    }
}
