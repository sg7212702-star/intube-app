import { FirebaseAuthentication } from "@capacitor-firebase/authentication";

// Bundled by the Android workflow. Website login continues to use the existing popup flow.
window.instaproNativeGoogleSignIn = async function () {
  return FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true });
};
