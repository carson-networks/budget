import Domain
import Sync

// What the entry points call when iOS wakes them in the background.
public struct BackgroundWakes: Sendable {
    // willTerminate has to return soon, so a run that ignores cancellation is not waited for past this.
    private static let terminationGrace = Duration.seconds(3)

    private let probe: WakeProbe
    private let work: BackgroundWork

    init(probe: WakeProbe, work: BackgroundWork) {
        self.probe = probe
        self.work = work
    }

    public func backgroundDelivery(_ dataTypes: [WalletDataType]) async {
        await work.run { [probe] in
            await probe.run(trigger: .backgroundDelivery, dataTypes: dataTypes)
        }
    }

    // SwiftUI cancels this when the refresh task expires.
    public func backgroundRefresh() async {
        await probe.run(trigger: .backgroundRefresh, dataTypes: [])
    }

    public func willTerminate() async {
        await work.cancelAll(grace: Self.terminationGrace)
    }
}
