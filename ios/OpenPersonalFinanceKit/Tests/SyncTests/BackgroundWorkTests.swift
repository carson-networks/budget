import Sync
import Testing

struct BackgroundWorkTests {
    private let work = BackgroundWork()
    private let events = Events()

    @Test func overlappingRunsTakeTurns() async throws {
        let events = events
        let first = Task {
            await work.run {
                await events.add("first started")
                try? await Task.sleep(for: .milliseconds(50))
                await events.add("first finished")
            }
        }
        try await events.waitFor("first started")
        await work.run { await events.add("second started") }
        await first.value

        #expect(await events.all == ["first started", "first finished", "second started"])
    }

    @Test func cancelAllWaitsForCleanup() async throws {
        let events = events
        let run = Task {
            await work.run {
                await events.add("started")
                try? await Task.sleep(for: .seconds(30))
                await withTaskCancellationShield {
                    try? await Task.sleep(for: .milliseconds(50))
                    await events.add("cleaned up")
                }
            }
        }
        try await events.waitFor("started")
        await work.cancelAll(grace: .seconds(5))

        #expect(await events.all == ["started", "cleaned up"])
        await run.value
    }

    @Test func cancelAllStopsWaitingAfterTheGracePeriod() async throws {
        let events = events
        let run = Task {
            await work.run {
                await events.add("started")
                await withTaskCancellationShield { try? await Task.sleep(for: .seconds(1)) }
            }
        }
        try await events.waitFor("started")
        let elapsed = await ContinuousClock().measure { await work.cancelAll(grace: .milliseconds(50)) }

        #expect(elapsed < .milliseconds(800))
        await run.value
    }
}

private actor Events {
    private(set) var all: [String] = []

    func add(_ event: String) {
        all.append(event)
    }

    func waitFor(_ event: String) async throws {
        while !all.contains(event) {
            try await Task.sleep(for: .milliseconds(1))
        }
    }
}
