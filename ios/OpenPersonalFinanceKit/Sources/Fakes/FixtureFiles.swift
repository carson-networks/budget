import Domain
import Foundation
import Storage

// The bundled fixture files, read with Storage's fixture file reader.
package enum FixtureFiles {
    package static func load(named name: String) throws -> WalletFixture {
        guard let url = Bundle.module.url(forResource: name, withExtension: "json", subdirectory: "Fixtures") else {
            throw CocoaError(.fileNoSuchFile)
        }
        return try decode(Data(contentsOf: url))
    }

    package static func decode(_ data: Data) throws -> WalletFixture {
        try FixtureFileReader().read(data)
    }
}
