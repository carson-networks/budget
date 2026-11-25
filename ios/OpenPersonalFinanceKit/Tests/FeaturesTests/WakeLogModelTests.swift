import Domain
import Fakes
import Features
import Foundation
import Testing

struct WakeLogModelTests {
    @Test func loadsWakesAsTheReaderListsThem() async {
        let model = WakeLogModel(activity: FakeActivityReader.sample())

        await model.load()

        #expect(model.entries.map(\.trigger) == [.backgroundDelivery, .backgroundRefresh, .backgroundDelivery])
        #expect(model.entries.map(\.outcome) == [.succeeded, .dataUnavailable, .succeeded])
        #expect(!model.failed)
    }

    @Test func reportsAFailedReadAndRecovers() async {
        let activity = FakeActivityReader.sample()
        let model = WakeLogModel(activity: activity)

        await activity.setInjectedError(CocoaError(.fileReadUnknown))
        await model.load()
        #expect(model.failed)
        #expect(model.entries.isEmpty)

        await activity.setInjectedError(nil)
        await model.load()
        #expect(!model.failed)
        #expect(model.entries.count == 3)
    }
}
