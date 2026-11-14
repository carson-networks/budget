# iOS releases

The **iOS Release** workflow (`.github/workflows/ios-release.yml`) builds the `OpenPersonalFinance` app and its `OpenPersonalFinanceDelivery` extension, signs them for the App Store, saves the IPA and debug symbols as workflow artifacts for 30 days, and uploads the IPA to App Store Connect for TestFlight.

It runs when an `ios-vMAJOR.MINOR.PATCH` tag is pushed, or when dispatched by hand. Web releases use plain `v*` tags, so the two never trigger each other's workflows.

Signing uses the [Codemagic CLI tools](https://github.com/codemagic-ci-cd/cli-tools) to point the Xcode project at the CI profiles, [import-codesign-certs](https://github.com/Apple-Actions/import-codesign-certs) for a temporary keychain, and [upload-testflight-build](https://github.com/Apple-Actions/upload-testflight-build) for the upload. These run inside GitHub Actions; no Codemagic account is needed. The project is archived with `xcodebuild archive` and exported with `xcodebuild -exportArchive`.

## One-time setup

The App IDs `net.carsonnetworks.OpenPersonalFinance` and `net.carsonnetworks.OpenPersonalFinance.Delivery` must exist in the Apple Developer team, both with **FinanceKit** and the App Group `group.net.carsonnetworks.OpenPersonalFinance`, and the app record must exist in App Store Connect (plan task P0-H1).

1. In **Certificates, Identifiers & Profiles**, create an **Apple Distribution** certificate if there isn't one, install it, and export it from Keychain Access as a `.p12` with a nonempty password.
2. Create two **App Store Connect** distribution profiles with that certificate: one for the app ID, one for the extension ID. Download both `.mobileprovision` files. If FinanceKit or the App Group was enabled on an App ID after a profile was made, regenerate the profile.
3. In App Store Connect → Users and Access → Integrations, create a **team API key** with the **App Manager** role and download `AuthKey_KEY_ID.p8`.
4. Add these repository secrets under **Settings → Secrets and variables → Actions**:

| Secret | Value |
| --- | --- |
| `IOS_DISTRIBUTION_CERTIFICATE_BASE64` | `base64 -i distribution.p12 \| pbcopy` |
| `IOS_DISTRIBUTION_CERTIFICATE_PASSWORD` | The `.p12` export password |
| `IOS_APP_PROVISIONING_PROFILE_BASE64` | `base64 -i OpenPersonalFinance.mobileprovision \| pbcopy` |
| `IOS_EXTENSION_PROVISIONING_PROFILE_BASE64` | `base64 -i OpenPersonalFinanceDelivery.mobileprovision \| pbcopy` |
| `APP_STORE_CONNECT_KEY_ID` | The API key's Key ID |
| `APP_STORE_CONNECT_ISSUER_ID` | The Issuer ID on the API keys page |
| `APP_STORE_CONNECT_PRIVATE_KEY` | `cat AuthKey_KEY_ID.p8 \| pbcopy`, pasted as-is including the BEGIN/END lines |

Never commit these files or their encoded contents. Renew the certificate and profile secrets before they expire.

Before building, the workflow checks that every secret is set and that each profile is for the right bundle ID and carries the FinanceKit entitlement and the App Group. It prints the signed entitlements of the archived app and extension in the **Show signed entitlements** step. Signing files and the temporary keychain are removed at the end of the job, even on failure.

## Release a version

```bash
git tag ios-v0.1.0
git push origin ios-v0.1.0
```

The tag sets the app version (`0.1.0`); prerelease suffixes are rejected. The build number is `GITHUB_RUN_NUMBER.GITHUB_RUN_ATTEMPT`, so rerunning a failed run gives a new build number.

After the upload, check **App Store Connect → OpenPersonalFinance → TestFlight** for processing errors and make the build available to the internal testers. Uploading does not submit the app for review. If Apple rejects a processed build, fix it and push a new tag; if only the upload failed, rerun the workflow.

TestFlight builds expire after 90 days. Push a new tag before then.

## Test a branch on devices

Once this workflow is on `master`, open **Actions → iOS Release → Run workflow**, pick the branch, and optionally enter a version. Without one, the project's `MARKETING_VERSION` is used.

```bash
gh workflow run ios-release.yml --ref your-branch
gh workflow run ios-release.yml --ref your-branch -f build_version=0.1.1
```

The job summary records the branch and commit that were built.
