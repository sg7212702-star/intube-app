// InstaPro Profile System
// Profile, Edit Profile, Follow, Followers, Following, Posts and Reels

import { auth, db } from "./firebase.js";

import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  arrayUnion,
  arrayRemove
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;
let viewingUid = null;
let isOwnProfile = true;
let profileUnsubscribe = null;
let postsUnsubscribe = null;
let reelsUnsubscribe = null;
let currentTab = "posts";

const $ = (id) => document.getElementById(id);

const DEFAULT_AVATAR = "https://i.pravatar.cc/150";

function showMessage(message) {
  alert(message);
}

// ---------------------------------------
// PROFILE HTML
// ---------------------------------------

function setupProfileHTML() {
  const page = $("profilePage");
  if (!page || page.dataset.profileReady === "true") return;

  page.dataset.profileReady = "true";

  page.innerHTML = `
    <div style="background:#000;color:#fff;min-height:100vh;">

      <div class="backBar"
        style="display:flex;align-items:center;padding:14px;gap:15px;">
        <button id="profileBackBtn"
          style="background:none;border:0;color:white;font-size:24px;">←</button>

        <b id="profileUsernameTop">Profile</b>

        <button id="profileMenuBtn"
          style="margin-left:auto;background:none;color:white;border:0;font-size:22px;">⋯</button>
      </div>

      <div style="padding:14px 16px;">

        <div style="display:flex;align-items:center;gap:20px;">

          <img id="pAvatar" src="${DEFAULT_AVATAR}"
            style="width:84px;height:84px;border-radius:50%;object-fit:cover;border:2px solid #d62976;">

          <div style="display:flex;flex:1;justify-content:space-around;text-align:center;">

            <div>
              <b id="pPostsCount" style="display:block;">0</b>
              <span>Posts</span>
            </div>

            <div id="openFollowers" style="cursor:pointer;">
              <b id="pFollowersCount" style="display:block;">0</b>
              <span>Followers</span>
            </div>

            <div id="openFollowing" style="cursor:pointer;">
              <b id="pFollowingCount" style="display:block;">0</b>
              <span>Following</span>
            </div>

          </div>
        </div>

        <div style="margin-top:12px;">
          <b id="pName"></b>
          <div id="pBio" style="white-space:pre-wrap;margin-top:4px;"></div>
          <div id="pLink" style="margin-top:4px;"></div>
        </div>

        <div style="display:flex;gap:8px;margin-top:14px;">

          <button id="editProfileBtn"
            style="flex:1;padding:8px;border:0;border-radius:8px;background:#333;color:white;">
            Edit profile
          </button>

          <button id="followBtn"
            style="flex:1;padding:8px;border:0;border-radius:8px;background:#0095f6;color:white;display:none;">
            Follow
          </button>

          <button id="messageBtn"
            style="flex:1;padding:8px;border:0;border-radius:8px;background:#333;color:white;display:none;">
            Message
          </button>

          <button id="shareProfileBtn"
            style="padding:8px;border:0;border-radius:8px;background:#333;color:white;">
            Share
          </button>

        </div>

        <div id="profileEditPanel"
          style="display:none;margin-top:15px;padding:14px;background:#171717;border-radius:12px;">

          <h3>Edit Profile</h3>

          <label>Name</label>
          <input id="editName" maxlength="80" placeholder="Your name"
            style="display:block;width:100%;box-sizing:border-box;padding:10px;margin:6px 0 12px;">

          <label>Username</label>
          <input id="editUsername" maxlength="30" placeholder="username"
            style="display:block;width:100%;box-sizing:border-box;padding:10px;margin:6px 0 12px;">

          <label>Bio</label>
          <textarea id="editBio" maxlength="150" placeholder="Write your bio"
            style="display:block;width:100%;box-sizing:border-box;padding:10px;margin:6px 0 12px;"></textarea>

          <label>Website</label>
          <input id="editLink" maxlength="200" placeholder="https://example.com"
            style="display:block;width:100%;box-sizing:border-box;padding:10px;margin:6px 0 12px;">

          <label>Profile Photo URL</label>
          <input id="editPhoto" maxlength="1000" placeholder="https://..."
            style="display:block;width:100%;box-sizing:border-box;padding:10px;margin:6px 0 12px;">

          <button id="saveProfileBtn"
            style="padding:10px 16px;background:#0095f6;color:white;border:0;border-radius:8px;">
            Save Changes
          </button>

          <button id="cancelProfileEdit"
            style="padding:10px 16px;background:#444;color:white;border:0;border-radius:8px;">
            Cancel
          </button>

        </div>

        <div id="followListPanel"
          style="display:none;margin-top:15px;background:#171717;border-radius:12px;padding:12px;">

          <div style="display:flex;gap:15px;">
            <button id="followTabFollowers">Followers</button>
            <button id="followTabFollowing">Following</button>
            <button id="closeFollowList" style="margin-left:auto;">Close</button>
          </div>

          <div id="followList" style="margin-top:12px;"></div>
        </div>

      </div>

      <div style="display:flex;border-top:1px solid #333;">

        <button class="profileTab" data-tab="posts"
          style="flex:1;padding:12px;background:none;color:white;border:0;">
          ▦ Posts
        </button>

        <button class="profileTab" data-tab="reels"
          style="flex:1;padding:12px;background:none;color:white;border:0;">
          ▶ Reels
        </button>

        <button class="profileTab" data-tab="tagged"
          style="flex:1;padding:12px;background:none;color:white;border:0;">
          ♙ Tagged
        </button>

      </div>

      <div id="postsGrid"
        style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:2px;"></div>

      <div id="reelsGrid"
        style="display:none;grid-template-columns:repeat(3,minmax(0,1fr));gap:2px;"></div>

      <div id="taggedGrid"
        style="display:none;padding:40px;text-align:center;color:#aaa;">
        Tagged posts are not available yet.
      </div>

    </div>
  `;

  $("profileBackBtn").onclick = () => {
    if (typeof window.goHome === "function") {
      window.goHome();
    }
  };

  $("editProfileBtn").onclick = openEditPanel;
  $("cancelProfileEdit").onclick = closeEditPanel;
  $("saveProfileBtn").onclick = saveProfile;
  $("followBtn").onclick = toggleFollow;
  $("shareProfileBtn").onclick = shareProfile;
  $("profileMenuBtn").onclick = showProfileMenu;

  $("openFollowers").onclick = () => openFollowList("followers");
  $("openFollowing").onclick = () => openFollowList("following");

  $("followTabFollowers").onclick = () => openFollowList("followers");
  $("followTabFollowing").onclick = () => openFollowList("following");

  $("closeFollowList").onclick = () => {
    $("followListPanel").style.display = "none";
  };

  document.querySelectorAll(".profileTab").forEach((button) => {
    button.onclick = () => switchProfileTab(button.dataset.tab);
  });
}

// ---------------------------------------
// OPEN / CLOSE EDIT PANEL
// ---------------------------------------

function openEditPanel() {
  if (!isOwnProfile) return;

  $("profileEditPanel").style.display = "block";
  $("profileEditPanel").scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });
}

function closeEditPanel() {
  $("profileEditPanel").style.display = "none";
}

// ---------------------------------------
// SAVE PROFILE
// ---------------------------------------

async function saveProfile() {
  if (!currentUser || !isOwnProfile) {
    showMessage("Apni profile mein login karein.");
    return;
  }

  const name = $("editName").value.trim();
  const username = $("editUsername").value.trim().replace(/^@/, "");
  const bio = $("editBio").value.trim();
  const link = $("editLink").value.trim();
  const photo = $("editPhoto").value.trim();

  if (!name || !username) {
    showMessage("Name aur Username zaroor bharein.");
    return;
  }

  if (!/^[a-zA-Z0-9._]{3,30}$/.test(username)) {
    showMessage("Username 3-30 characters ka ho. Letters, numbers, dot aur underscore allowed hain.");
    return;
  }

  if (link && !/^https?:\/\/\S+$/i.test(link)) {
    showMessage("Website link https:// se shuru hona chahiye.");
    return;
  }

  if (photo && !/^https?:\/\/\S+$/i.test(photo)) {
    showMessage("Photo ke liye valid https:// image URL dein.");
    return;
  }

  const button = $("saveProfileBtn");
  button.disabled = true;
  button.textContent = "Saving...";

  try {
    const ref = doc(db, "users", currentUser.uid);

    await setDoc(ref, {
      uid: currentUser.uid,
      name,
      username,
      bio,
      link,
      photo,
      email: currentUser.email || "",
      updatedAt: serverTimestamp()
    }, { merge: true });

    closeEditPanel();
    showMessage("Profile update ho gayi!");
  } catch (error) {
    console.error("Save profile error:", error);
    showMessage("Profile save nahi hui: " + error.message);
  } finally {
    button.disabled = false;
    button.textContent = "Save Changes";
  }
}

// ---------------------------------------
// FOLLOW / UNFOLLOW
// ---------------------------------------

async function toggleFollow() {
  if (!currentUser || !viewingUid || currentUser.uid === viewingUid) return;

  const myRef = doc(db, "users", currentUser.uid);
  const targetRef = doc(db, "users", viewingUid);

  try {
    await runTransaction(db, async (transaction) => {
      const mySnap = await transaction.get(myRef);
      const targetSnap = await transaction.get(targetRef);

      if (!mySnap.exists() || !targetSnap.exists()) {
        throw new Error("Profile data nahi mila.");
      }

      const myData = mySnap.data();
      const targetData = targetSnap.data();

      const myFollowing = Array.isArray(myData.following)
        ? myData.following
        : [];

      const targetFollowers = Array.isArray(targetData.followers)
        ? targetData.followers
        : [];

      const alreadyFollowing = myFollowing.includes(viewingUid);

      if (alreadyFollowing) {
        transaction.update(myRef, {
          following: arrayRemove(viewingUid)
        });

        transaction.update(targetRef, {
          followers: arrayRemove(currentUser.uid)
        });
      } else {
        transaction.update(myRef, {
          following: arrayUnion(viewingUid)
        });

        transaction.update(targetRef, {
          followers: arrayUnion(currentUser.uid)
        });
      }
    });
  } catch (error) {
    console.error("Follow error:", error);
    showMessage("Follow update fail hua: " + error.message);
  }
}

// ---------------------------------------
// FOLLOWERS / FOLLOWING LIST
// ---------------------------------------

async function openFollowList(type) {
  if (!viewingUid) return;

  const panel = $("followListPanel");
  const list = $("followList");

  panel.style.display = "block";
  list.textContent = "Loading...";

  try {
    const snap = await getDoc(doc(db, "users", viewingUid));

    if (!snap.exists()) {
      list.textContent = "Profile nahi mili.";
      return;
    }

    const data = snap.data();
    const ids = Array.isArray(data[type]) ? data[type] : [];

    if (!ids.length) {
      list.textContent = `Abhi koi ${type} nahi hai.`;
      return;
    }

    list.replaceChildren();

    for (const uid of ids) {
      const userSnap = await getDoc(doc(db, "users", uid));
      if (!userSnap.exists()) continue;

      const user = userSnap.data();
      const row = document.createElement("div");

      row.style.cssText =
        "display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #333;";

      const avatar = document.createElement("img");
      avatar.src = user.photo || DEFAULT_AVATAR;
      avatar.alt = "";
      avatar.style.cssText =
        "width:42px;height:42px;object-fit:cover;border-radius:50%;";

      const details = document.createElement("div");
      details.style.flex = "1";

      const username = document.createElement("b");
      username.textContent = user.username || "user";

      const name = document.createElement("div");
      name.textContent = user.name || "";
      name.style.fontSize = "12px";

      details.append(username, name);
      row.append(avatar, details);

      if (currentUser && uid !== currentUser.uid) {
        const button = document.createElement("button");
        button.textContent = "View";
        button.onclick = () => window.openProfile?.(uid);
        row.append(button);
      }

      list.append(row);
    }

    $("followTabFollowers").style.opacity =
      type === "followers" ? "1" : ".5";
    $("followTabFollowing").style.opacity =
      type === "following" ? "1" : ".5";

  } catch (error) {
    console.error("Follow list error:", error);
    list.textContent = "List load nahi hui: " + error.message;
  }
}

// ---------------------------------------
// PROFILE MENU
// ---------------------------------------

function showProfileMenu() {
  const choice = prompt(
    "Profile Menu:\n1. Edit Profile\n2. Share Profile\n3. Logout\n\nNumber likhein:"
  );

  if (choice === "1") openEditPanel();
  if (choice === "2") shareProfile();
  if (choice === "3" && typeof window.logoutUser === "function") {
    window.logoutUser();
  }
}

async function shareProfile() {
  const url = new URL(window.location.href);
  if (viewingUid) url.searchParams.set("profile", viewingUid);

  try {
    if (navigator.share) {
      await navigator.share({
        title: "InstaPro Profile",
        url: url.toString()
      });
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(url.toString());
      showMessage("Profile link copy ho gaya.");
    } else {
      prompt("Profile link copy karein:", url.toString());
    }
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error("Share error:", error);
    }
  }
}

// ---------------------------------------
// POSTS / REELS TABS
// ---------------------------------------

function switchProfileTab(tab) {
  currentTab = tab;

  document.querySelectorAll(".profileTab").forEach((button) => {
    const active = button.dataset.tab === tab;
    button.style.opacity = active ? "1" : ".5";
    button.style.borderBottom = active ? "2px solid white" : "0";
  });

  $("postsGrid").style.display = tab === "posts" ? "grid" : "none";
  $("reelsGrid").style.display = tab === "reels" ? "grid" : "none";
  $("taggedGrid").style.display = tab === "tagged" ? "block" : "none";
}

// ---------------------------------------
// LOAD POSTS AND REELS REALTIME
// ---------------------------------------

function clearMediaListeners() {
  if (postsUnsubscribe) postsUnsubscribe();
  if (reelsUnsubscribe) reelsUnsubscribe();

  postsUnsubscribe = null;
  reelsUnsubscribe = null;
}

function renderMedia(grid, items) {
  grid.replaceChildren();

  if (!items.length) {
    const empty = document.createElement("div");
    empty.textContent = "Abhi koi post nahi hai.";
    empty.style.cssText =
      "grid-column:1/-1;padding:35px 10px;text-align:center;color:#aaa;";
    grid.append(empty);
    return;
  }

  for (const item of items) {
    const tile = document.createElement("button");

    tile.style.cssText =
      "position:relative;padding:0;border:0;background:#111;aspect-ratio:1;overflow:hidden;";

    const mediaUrl = item.imageUrl || item.mediaUrl || item.url || "";

    if (mediaUrl) {
      let media;

      if (
        item.type === "video" ||
        mediaUrl.startsWith("data:video/") ||
        /\.(mp4|webm|mov)(\?|$)/i.test(mediaUrl)
      ) {
        media = document.createElement("video");
        media.muted = true;
        media.playsInline = true;
      } else {
        media = document.createElement("img");
        media.alt = item.caption || "Post";
      }

      media.src = mediaUrl;
      media.style.cssText =
        "width:100%;height:100%;object-fit:cover;";

      tile.append(media);
    } else {
      tile.textContent = "Media unavailable";
    }

    tile.onclick = () => {
      if (typeof window.openPost === "function") {
        window.openPost(item.id);
      } else if (mediaUrl) {
        window.open(mediaUrl, "_blank");
      }
    };

    grid.append(tile);
  }
}

function loadUserMedia(uid) {
  clearMediaListeners();

  const postsGrid = $("postsGrid");
  const reelsGrid = $("reelsGrid");

  postsGrid.textContent = "Loading...";
  reelsGrid.textContent = "Loading...";

  // Load posts in realtime. No orderBy avoids missing docs without createdAt.
  postsUnsubscribe = onSnapshot(
    query(collection(db, "posts"), where("uid", "==", uid)),
    (snapshot) => {
      const posts = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }));

      posts.sort((a, b) => {
        const at = a.createdAt?.toMillis?.() || 0;
        const bt = b.createdAt?.toMillis?.() || 0;
        return bt - at;
      });

      $("pPostsCount").textContent = posts.length;

      const reels = posts.filter(
        (post) =>
          post.type === "reel" ||
          post.isReel === true ||
          post.contentType === "reel"
      );

      renderMedia(postsGrid, posts);
      renderMedia(reelsGrid, reels);
    },
    (error) => {
      console.error("Posts listener error:", error);
      postsGrid.textContent = "Posts load nahi hui. Firestore Rules check karein.";
    }
  );
}

// ---------------------------------------
// LOAD PROFILE REALTIME
// ---------------------------------------

function loadProfileRealtime(uid) {
  viewingUid = uid;

  if (profileUnsubscribe) {
    profileUnsubscribe();
    profileUnsubscribe = null;
  }

  profileUnsubscribe = onSnapshot(
    doc(db, "users", uid),
    (snapshot) => {
      if (!snapshot.exists()) {
        showMessage("Yeh profile abhi Firestore mein nahi hai.");
        return;
      }

      const user = snapshot.data();

      $("pAvatar").src = user.photo || DEFAULT_AVATAR;
      $("profileUsernameTop").textContent =
        user.username || user.name || "user";
      $("pName").textContent = user.name || "";
      $("pBio").textContent = user.bio || "";

      const linkContainer = $("pLink");
      linkContainer.replaceChildren();

      if (user.link) {
        try {
          const safeUrl = new URL(user.link);

          if (["http:", "https:"].includes(safeUrl.protocol)) {
            const link = document.createElement("a");
            link.href = safeUrl.href;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = user.link;
            link.style.color = "#9ed4ff";
            linkContainer.append(link);
          }
        } catch {
          // Ignore invalid URL
        }
      }

      const followers = Array.isArray(user.followers)
        ? user.followers
        : [];
      const following = Array.isArray(user.following)
        ? user.following
        : [];

      $("pFollowersCount").textContent = followers.length;
      $("pFollowingCount").textContent = following.length;

      if (isOwnProfile) {
        $("editName").value = user.name || "";
        $("editUsername").value = user.username || "";
        $("editBio").value = user.bio || "";
        $("editLink").value = user.link || "";
        $("edit
