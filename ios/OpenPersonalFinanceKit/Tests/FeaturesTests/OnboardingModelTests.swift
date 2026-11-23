import Domain
import Fakes
import Features
import Testing

struct OnboardingModelTests {
    @Test func showsUnavailableWithoutAskingForAccess() async {
        let model = OnboardingModel(source: FakeFinanceDataSource(isDataAvailable: false))
        await model.load()
        #expect(model.state == .unavailable)

        await model.requestAccess()
        #expect(model.state == .unavailable)
    }

    @Test func skipsPromptWhenAlreadyAuthorized() async {
        let model = OnboardingModel(source: FakeFinanceDataSource())
        await model.load()
        #expect(model.state == .authorized)
    }

    @Test(arguments: [
        (WalletAuthorization.authorized, OnboardingModel.State.authorized),
        (.denied, .denied),
    ])
    func requestsAccessWhenNotDetermined(answer: WalletAuthorization, expected: OnboardingModel.State) async {
        let source = FakeFinanceDataSource(authorizationStatus: .notDetermined, authorizationOnRequest: answer)
        let model = OnboardingModel(source: source)

        await model.load()
        #expect(model.state == .needsAuthorization)

        await model.requestAccess()
        #expect(model.state == expected)
    }

    @Test func reportsDeniedWithoutAskingAgain() async {
        let model = OnboardingModel(source: FakeFinanceDataSource(authorizationStatus: .denied))
        await model.load()
        #expect(model.state == .denied)

        await model.requestAccess()
        #expect(model.state == .denied)
    }

    @Test func failsAndRecoversOnRetry() async {
        let source = FakeFinanceDataSource(authorizationStatus: .notDetermined)
        let model = OnboardingModel(source: source)

        await source.setInjectedError(.dataUnavailable)
        await model.load()
        #expect(model.state == .failed)

        await source.setInjectedError(nil)
        await model.load()
        #expect(model.state == .needsAuthorization)
    }
}
