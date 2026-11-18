// Android App Links verification file — must be reachable at
// https://<SHARE_BASE_URL domain>/.well-known/assetlinks.json for Android to trust that this app
// owns the domain used in shared links (see backend/src/config/shareUrl.js). The fingerprint here
// must match whatever keystore actually signs the installed APK — pulled from the Expo/EAS
// credentials dashboard for this project (project 996478b8-6fa1-4ffe-9113-5eb29973ccdf).
//
// NOTE: if this app is later published to Play Store with Play App Signing enabled, Google
// re-signs the app with ITS OWN certificate before distributing it to real users — this
// fingerprint will need to be updated to that one (Play Console -> Setup -> App signing) or
// App Links verification will silently fail for Play Store installs even though it works here.
const ANDROID_PACKAGE_NAME = 'app.rork.refer_process_v10';
const ANDROID_SHA256_CERT_FINGERPRINT = 'DE:5A:3A:FC:0D:E5:81:F4:EC:37:5F:8C:91:5E:0A:F6:A1:0E:02:18:8F:D9:86:52:11:95:CC:DF:4F:5A:8D:FE';

const ANDROID_ASSET_LINKS = [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: ANDROID_PACKAGE_NAME,
      sha256_cert_fingerprints: [ANDROID_SHA256_CERT_FINGERPRINT],
    },
  },
];

module.exports = { ANDROID_ASSET_LINKS };
