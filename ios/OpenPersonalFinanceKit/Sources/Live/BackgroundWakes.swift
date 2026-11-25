import Domain
import FinanceKitSource
import Sync

// What the extension and the app's background refresh call; each wake runs the probe through one coordinator.
public struct BackgroundWakes: Sendable {
    private let probe: WakeProbe
    private let coordinator = WakeCoordinator()

    init(probe: WakeProbe) {
        self.probe = probe
    }

    // Generic so this target never names a FinanceKit type; FinanceKitSource reads the values.
    public func didReceiveData(for types: [some Sendable]) async {
        let dataTypes = FinanceKitMapping.dataTypes(types)
        await coordinator.run { [probe] in
            await probe.run(trigger: .backgroundDelivery, dataTypes: dataTypes)
        }
    }

    public func backgroundRefresh() async {
        await coordinator.run { [probe] in
            await probe.run(trigger: .backgroundRefresh, dataTypes: [])
        }
    }

    public func willTerminate() async {
        await coordinator.cancelAll()
    }
}
