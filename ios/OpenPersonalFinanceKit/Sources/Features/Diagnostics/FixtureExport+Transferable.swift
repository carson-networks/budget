import CoreTransferable
import UniformTypeIdentifiers

nonisolated extension FixtureExport: Transferable {
    public static var transferRepresentation: some TransferRepresentation {
        DataRepresentation(exportedContentType: .json) { export in
            try export.data()
        }
        .suggestedFileName("wallet-fixture.json")
    }
}
