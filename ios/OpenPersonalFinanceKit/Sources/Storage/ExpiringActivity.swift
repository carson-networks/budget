import Dispatch
import Foundation
import Synchronization

// Guards sub-millisecond DB writes with a system task assertion to avoid 0xdead10cc suspension kills.
enum ExpiringActivity {
    static func perform<Value: Sendable>(
        reason: String,
        operation: @escaping @Sendable () throws -> Value
    ) throws -> Value {
        let state = Mutex<(claimed: Bool, completed: Bool, result: Result<Value, any Error>?)>((false, false, nil))
        let finished = DispatchSemaphore(value: 0)

        ProcessInfo.processInfo.performExpiringActivity(withReason: reason) { expired in
            let action = state.withLock { state -> (run: Bool, signalExpired: Bool) in
                guard !state.claimed else { return (false, false) }
                state.claimed = true
                if expired {
                    state.completed = true
                    state.result = .failure(StorageError.activityExpired)
                    return (false, true)
                }
                return (true, false)
            }
            if action.signalExpired {
                finished.signal()
                return
            }
            guard action.run else { return }
            let outcome = Result { try operation() }
            let shouldSignal = state.withLock { state -> Bool in
                guard !state.completed else { return false }
                state.completed = true
                state.result = outcome
                return true
            }
            if shouldSignal {
                finished.signal()
            }
        }

        finished.wait()
        guard let outcome = state.withLock({ $0.result }) else {
            throw StorageError.activityExpired
        }
        return try outcome.get()
    }

    static func performAsync<Value: Sendable>(
        reason: String,
        operation: @escaping @Sendable () throws -> Value
    ) async throws -> Value {
        try await withCheckedThrowingContinuation { continuation in
            let state = Mutex<(claimed: Bool, completed: Bool)>((false, false))
            ProcessInfo.processInfo.performExpiringActivity(withReason: reason) { expired in
                let action = state.withLock { state -> (run: Bool, failExpired: Bool) in
                    guard !state.claimed else { return (false, false) }
                    state.claimed = true
                    if expired {
                        state.completed = true
                        return (false, true)
                    }
                    return (true, false)
                }
                if action.failExpired {
                    continuation.resume(throwing: StorageError.activityExpired)
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
