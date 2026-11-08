// Intube shared profile-photo resolver.
// Firestore profile data remains authoritative; callers decide whether Auth is a safe fallback.
export const DEFAULT_PROFILE_PHOTO = "https://www.gravatar.com/avatar/?d=mp";

const PROFILE_PHOTO_FIELDS = [
  "photoURL",
  "photoUrl",
  "profilePic",
  "profilePhotoURL",
  "profileImage",
  "avatarUrl",
  "photo",
  "avatar",
  "userPhoto",
  "fromPhoto"
];

export function getProfilePhoto(data, fallback = DEFAULT_PROFILE_PHOTO) {
  if (!data || typeof data !== "object") return fallback;

  for (const field of PROFILE_PHOTO_FIELDS) {
    const value = data[field];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return fallback;
}
