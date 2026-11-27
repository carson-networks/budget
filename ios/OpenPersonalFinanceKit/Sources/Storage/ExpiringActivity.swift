import Foundation
import Synchronization

// Holds a best-effort background task assertion during sub-millisecond writes to avoid 0xdead10cc suspension kills.
enum ExpiringActivity {
    typealias Runner = @Sendable (_ reason: String, _ block: @escaping @Sendable (Bool) -> Void) -> Void

    private struct State {
        var claimed = false
        var completed = false
        var notifiedExpiration = false
    }

    static func perform<Value: Sendable>(
        reason: String,
        onExpire: @escaping @Sendable () -> Void = {},
        runner: Runner = { ProcessInfo.processInfo.performExpiringActivity(withReason: $0, using: $1) },
        operation: @escaping @Sendable () throws -> Value
    ) async throws -> Value {
        try await withCheckedThrowingContinuation { continuation in
            let state = Mutex(State())
            runner(reason) { expired in
                let action = state.withLock { state -> (run: Bool, notifyExpiration: Bool) in
                    if !state.claimed {
                        // Run even when expired is already true (unhosted xctest runners or willTerminate cleanup).
                        state.claimed = true
                        return (true, false)
                    }
                    if expired, !state.completed, !state.notifiedExpiration {
                        state.notifiedExpiration = true
                        return (false, true)
                    }
                    return (false, false)
                }
                if action.notifyExpiration {
                    onExpire()
                    return
                }
                guard action.run else { return }
                let outcome = Result { try operation() }
                let shouldResume = state.withLock { state -> Bool in
                    guard !state.completed else { return false }
                    state.completed = true
                    return true
                }
                if shouldResume {
                    continuation.resume(with: outcome)
                }
            }
        }
    }
}
