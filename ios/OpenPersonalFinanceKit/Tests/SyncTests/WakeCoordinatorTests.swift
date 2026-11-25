import Foundation
import Sync
import Testing

@Suite(.timeLimit(.minutes(1)))
struct WakeCoordinatorTests {
    @Test func aSecondWakeWaitsForTheOneInFlight() async throws {
        let coordinator = WakeCoordinator()
        let events = Events()
        let gate = Gate()
        let (started, didStart) = AsyncStream.makeStream(of: Void.self)

        async let first: Void = coordinator.run {
            await events.record("first started")
            didStart.yield()
            await gate.wait()
            await events.record("first finished")
        }
        for await _ in started { break }
        async let second: Void = coordinator.run { await events.record("second") }

        try await Task.sleep(for: .milliseconds(50))
        #expect(await events.all == ["first started"])

        await gate.open()
        await first
        await second
        #expect(await events.all == ["first started", "first finished", "second"])
    }

    @Test func cancelAllCancelsAWakeAndWaitsForItsCleanup() async {
        let coordinator = WakeCoordinator(gracePeriod: .seconds(30))
        let events = Events()
        let (started, didStart) = AsyncStream.makeStream(of: Void.self)

        async let wake: Void = coordinator.run {
            didStart.yield()
            try? await Task.sleep(for: .seconds(60))
            await events.record(Task.isCancelled ? "cleaned up after cancel" : "finished")
        }
        for await _ in started { break }

        await coordinator.cancelAll()
        #expect(await events.all == ["cleaned up after cancel"])
        await wake
    }

    @Test func cancelAllStopsWaitingAfterTheGracePeriod() async {
        let coordinator = WakeCoordinator(gracePeriod: .milliseconds(100))
        let gate = Gate()
        let (started, didStart) = AsyncStream.makeStream(of: Void.self)

        async let wake: Void = coordinator.run {
            didStart.yield()
            await gate.wait()
        }
        for await _ in started { break }

        await coordinator.cancelAll()
        #expect(await gate.isOpen == false)

        await gate.open()
        await wake
    }

    @Test func cancellingTheCallerCancelsTheWake() async {
        let coordinator = WakeCoordinator()
        let events = Events()
        let (started, didStart) = AsyncStream.makeStream(of: Void.self)

        let caller = Task {
            await coordinator.run {
                didStart.yield()
                try? await Task.sleep(for: .seconds(60))
                await events.record(Task.isCancelled ? "cancelled" : "finished")
            }
        }
        for await _ in started { break }

        caller.cancel()
        await caller.value
        #expect(await events.all == ["cancelled"])
    }
}

private actor Events {
    private(set) var all: [String] = []

    func record(_ event: String) {
        all.append(event)
    }
}

// Ignores cancellation, like work that never checks for it.
private actor Gate {
    private(set) var isOpen = false
    private var waiters: [CheckedContinuation<Void, Never>] = []

    func wait() async {
        guard !isOpen else { return }
        await withCheckedContinuation { waiters.append($0) }
    }

    func open() {
        isOpen = true
        for waiter in waiters {
            waiter.resume()
        }
        waiters = []
    }
}
