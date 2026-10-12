import { db, auth } from "./firebase.js";

import {
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let stopProfileListener = null;
let stopPostsListener = null;
let viewingUid = null;

const esc = (value = "") =>
  String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);

function profileStyles() {
  if (document.getElementById("instaProProfileStyles")) return;

  const style = document.createElement("style");
  style.id = "instaProProfileStyles";

  style.textContent = `
    #instaProProfile {
      position:fixed;
      inset:0;
      z-index:9990;
      overflow-y:auto;
      color:#fff;
      background:
        radial-gradient(ellipse at 10% 0%,rgba(138,43,226,.22),transparent 42%),
        radial-gradient(ellipse at 100% 20%,rgba(0,210,255,.16),transparent 38%),
        rgba(8,9,18,.96);
      font-family:inherit;
      backdrop-filter:blur(28px);
      -webkit-backdrop-filter:blur(28px);
    }

    #instaProProfile * { box-sizing:border-box; }

    #instaProProfile .ip-top {
      display:flex;
      align-items:center;
      justify-content:space-between;
      padding:15px 16px;
      position:sticky;
      top:0;
      z-index:5;
      background:rgba(12,13,24,.76);
      backdrop-filter:blur(24px);
      border-bottom:1px solid rgba(255,255,255,.1);
    }

    #instaProProfile .ip-glass {
      border:1px solid rgba(255,255,255,.13);
      background:rgba(255,255,255,.055);
      box-shadow:0 10px 35px rgba(0,0,0,.14);
      backdrop-filter:blur(22px);
      -webkit-backdrop-filter:blur(22px);
      border-radius:20px;
    }

    #instaProProfile .ip-avatar {
      width:94px;
      height:94px;
      padding:3px;
      border-radius:50%;
      background:linear-gradient(135deg,#ff3d9a,#8b5cf6,#16d9ff,#ffcc70);
      box-shadow:0 0 25px rgba(180,75,255,.22);
    }

    #instaProProfile .ip-avatar img {
      width:100%;
      height:100%;
      border-radius:50%;
      object-fit:cover;
      border:3px solid #11121c;
    }

    #instaProProfile .ip-btn {
      border:1px solid rgba(255,255,255,.15);
      border-radius:12px;
      padding:10px 14px;
      background:rgba(255,255,255,.09);
      color:#fff;
      font-weight:650;
      font-size:12px;
      cursor:pointer;
    }

    #instaProProfile .ip-primary {
      background:linear-gradient(110deg,#8b5cf6,#ec4899);
      border:0;
    }

    #instaProProfile .ip-stats {
      display:grid;
      grid-template-columns:repeat(3,1fr);
      gap:8px;
      margin:20px 0;
    }

    #instaProProfile .ip-stat {
      text-align:center;
      padding:13px 5px;
    }

    #instaProProfile .ip-stat strong {
      display:block;
      font-size:19px;
      font-weight:800;
    }

    #instaProProfile .ip-stat span {
      display:block;
      margin-top:4px;
      font-size:11px;
      opacity:.65;
    }

    #instaProProfile .ip-tabs {
      display:grid;
      grid-template-columns:repeat(3,1fr);
      border-bottom:1px solid rgba(255,255,255,.12);
      margin-top:22px;
    }

    #instaProProfile .ip-tab {
      padding:15px 4px;
      border:0;
      border-bottom:2px solid transparent;
      color:rgba(255,255,255,.55);
      background:transparent;
      font-size:13px;
      cursor:pointer;
    }

    #instaProProfile .ip-tab.active {
      color:#fff;
      border-bottom-color:#d66bff;
    }

    #instaProProfile .ip-grid {
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:3px;
    }

    #instaProProfile .ip-post {
      position:relative;
      aspect-ratio:3/4;
      overflow:hidden;
      background:rgba(255,255,255,.07);
      cursor:pointer;
    }

    #instaProProfile .ip-post img,
    #instaProProfile .ip-post video {
      width:100%;
      height:100%;
      object-fit:cover;
    }

    #instaProProfile .ip-video-icon {
      position:absolute;
      right:7px;
      top:7px;
      padding:4px 6px;
      background:rgba(0,0,0,.55);
      border-radius:8px;
      font-size:12px;
    }

    #instaProProfile .ip-empty {
      grid-column:1/-1;
      text-align:center;
      padding:50px 18px;
      opacity:.7;
      font-size:13px;
    }

    @media(min-width:700px) {
      #instaProProfile .ip-content {
        max-width:650px;
        margin:auto;
      }

      #instaProProfile .ip-grid {
        gap:5px;
      }
    }
  `;

  document.head.appendChild(style);
}

function currentUsername(user, data = {}) {
  return data.username ||
    data.displayName ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "InstaPro User";
}

function getCount(value) {
  if (Array.isArray(value)) return value.length;
  return Number(value) || 0;
}

function mediaURL(post) {
  return post.mediaURL ||
    post.mediaUrl ||
    post.imageUrl ||
    post.imageURL ||
    post.videoUrl ||
    post.videoURL ||
    post.url ||
    post.image ||
    "";
}

function isVideo(post, url = "") {
  const type = String(post.type || post.mediaType || "").toLowerCase();
  return type.includes("video") ||
    type.includes("reel") ||
    /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

function stopListeners() {
  if (stopProfileListener) stopProfileListener();
  if (stopPostsListener) stopPostsListener();

  stopProfileListener = null;
  stopPostsListener = null;
}

function closeProfile() {
  stopListeners();

  const page = document.getElementById("instaProProfile");
  if (page) page.remove();

  document.body.style.overflow = "";
}

function findPostOwner(post) {
  return post.uid ||
    post.userId ||
    post.authorId ||
    post.ownerUid ||
    "";
}

export async function openProfile(uid = null) {
  const user = auth.currentUser;

  if (!uid && !user) {
    alert("Profile dekhne ke liye pehle login karein.");
    return;
  }

  viewingUid = uid || user.uid;

  stopListeners();
  profileStyles();

  let page = document.getElementById("instaProProfile");
  if (page) page.remove();

  page = document.createElement("section");
  page.id = "instaProProfile";

  page.innerHTML = `
    <div class="ip-top">
      <button class="ip-btn" id="ipBack">‹ Back</button>
      <strong style="font-size:17px">InstaPro</strong>
      <button class="ip-btn" id="ipRefresh">↻</button>
    </div>

    <div class="ip-content" style="padding:18px 15px 35px">
      <div style="text-align:center;padding:35px 10px">
        Loading profile...
      </div>
    </div>
  `;

  document.body.appendChild(page);
  document.body.style.overflow = "hidden";

  page.querySelector("#ipBack").onclick = closeProfile;
  page.querySelector("#ipRefresh").onclick = () => openProfile(viewingUid);

  const content = page.querySelector(".ip-content");

  const userRef = doc(db, "users", viewingUid);

  const renderProfile = (data, posts = []) => {
    if (!document.getElementById("instaProProfile")) return;

    const ownProfile = auth.currentUser?.uid === viewingUid;
    const name = currentUsername(
      { ...data, displayName: data.displayName },
      data
    );

    const username = data.username ||
      auth.currentUser?.email?.split("@")[0] ||
      "user";

    const photo = data.photoURL ||
      data.photoUrl ||
      data.profilePic ||
      data.photo ||
      "https://www.gravatar.com/avatar/?d=mp";

    const bio = data.bio || data.about || "Welcome to my InstaPro profile ✨";

    const followers = getCount(data.followers);
    const following = getCount(data.following);

    const ownPosts = posts.filter(post => {
      const owner = findPostOwner(post);
      return !owner || owner === viewingUid;
    });

    content.innerHTML = `
      <div style="display:flex;align-items:center;gap:22px;padding:12px 4px">
        <div class="ip-avatar">
          <img src="${esc(photo)}" alt="Profile photo"
            onerror="this.onerror=null;this.src='https://www.gravatar.com/avatar/?d=mp'">
        </div>

        <div style="flex:1;min-width:0">
          <div style="font-size:19px;font-weight:800;overflow-wrap:anywhere">
            ${esc(name)}
          </div>
          <div style="font-size:12px;opacity:.65;margin-top:4px">
            @${esc(username)}
          </div>
          <div style="font-size:11px;margin-top:9px;color:#d7a2ff">
            ✦ CREATOR PROFILE
          </div>
        </div>
      </div>

      <div style="margin-top:15px;font-size:13px;line-height:1.7;white-space:pre-wrap">
        ${esc(bio)}
      </div>

      <div class="ip-stats">
        <div class="ip-stat ip-glass">
          <strong>${ownPosts.length}</strong>
          <span>Posts</span>
        </div>
        <div class="ip-stat ip-glass">
          <strong>${followers}</strong>
          <span>Followers</span>
        </div>
        <div class="ip-stat ip-glass">
          <strong>${following}</strong>
          <span>Following</span>
        </div>
      </div>

      <div style="display:flex;gap:8px">
        ${ownProfile ? `
          <button class="ip-btn ip-primary" id="ipEdit" style="flex:1">
            ✨ Edit Profile
          </button>
        ` : `
          <button class="ip-btn ip-primary" id="ipFollow" style="flex:1">
            Follow
          </button>
        `}
        <button class="ip-btn" id="ipShare" style="flex:1">
          ↗ Share Profile
        </button>
      </div>

      <div class="ip-glass" style="padding:15px;margin-top:18px">
        <div style="font-size:13px;font-weight:700">✦ Profile highlights</div>
        <div style="font-size:11px;opacity:.65;margin-top:6px">
          Photos, videos and reels in one place
        </div>
      </div>

      <div class="ip-tabs">
        <button class="ip-tab active" data-tab="all">▦ Posts</button>
        <button class="ip-tab" data-tab="videos">▷ Videos</button>
        <button class="ip-tab" data-tab="reels">✦ Reels</button>
      </div>

      <div id="ipMediaGrid" class="ip-grid" style="margin-top:3px"></div>
    `;

    const grid = content.querySelector("#ipMediaGrid");

    const drawGrid = (tab = "all") => {
      const filtered = ownPosts.filter(post => {
        const url = mediaURL(post);
        const video = isVideo(post, url);
        const type = String(post.type || post.mediaType || "").toLowerCase();

        if (tab === "videos") return video;
        if (tab === "reels") return type.includes("reel");
        return true;
      });

      if (!filtered.length) {
        grid.innerHTML = `
          <div class="ip-empty">
            <div style="font-size:36px;margin-bottom:12px">▧</div>
            <strong>No ${tab === "all" ? "posts" : tab} yet</strong>
            <p>Uploaded photos and videos will appear here.</p>
          </div>
        `;
        return;
      }

      grid.innerHTML = filtered.map(post => {
        const url = mediaURL(post);
        const video = isVideo(post, url);

        if (!url) {
          return `
            <div class="ip-post" style="padding:10px;font-size:11px">
              Media URL unavailable
            </div>
          `;
        }

        return `
          <div class="ip-post" data-post-id="${esc(post.id || "")}">
            ${video
              ? `<video src="${esc(url)}" muted playsinline preload="metadata"></video>
                 <span class="ip-video-icon">▷</span>`
              : `<img src="${esc(url)}" loading="lazy" alt="Post"
                   onerror="this.style.opacity='.2'">`
            }
          </div>
        `;
      }).join("");

      grid.querySelectorAll("[data-post-id]").forEach(tile => {
        tile.onclick = () => {
          const postId = tile.dataset.postId;

          document.dispatchEvent(new CustomEvent("open-notification-post", {
            detail: { postId, fromUid: viewingUid }
          }));
        };
      });
    };

    drawGrid();

    content.querySelectorAll("[data-tab]").forEach(button => {
      button.onclick = () => {
        content.querySelectorAll("[data-tab]").forEach(tab =>
          tab.classList.remove("active")
        );

        button.classList.add("active");
        drawGrid(button.dataset.tab);
      };
    });

    content.querySelector("#ipShare").onclick = async () => {
      const shareData = {
        title: name + " on InstaPro",
        text: "Check out @" + username + " on InstaPro",
        url: location.href
      };

      try {
        if (navigator.share) {
          await navigator.share(shareData);
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(shareData.url);
          alert("Profile link copied.");
        } else {
          alert(shareData.text);
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Profile share error:", error);
        }
      }
    };

    const editButton = content.querySelector("#ipEdit");

    if (editButton) {
      editButton.onclick = async () => {
        const newName = prompt("Enter your name:", name);
        if (newName === null) return;

        const newBio = prompt("Enter your bio:", bio);
        if (newBio === null) return;

        try {
          await updateDoc(userRef, {
            displayName: newName.trim(),
            bio: newBio.trim()
          });

          alert("Profile updated successfully.");
        } catch (error) {
          console.error("Profile update error:", error);
          alert("Profile update failed. Check Firestore Rules.");
        }
      };
    }

    const followButton = content.querySelector("#ipFollow");

    if (followButton) {
      const loggedInUser = auth.currentUser;

      if (loggedInUser) {
        getDoc(doc(db, "users", loggedInUser.uid)).then(mySnap => {
          const followingList = mySnap.exists()
            ? mySnap.data().following || []
            : [];

          const followingArray = Array.isArray(followingList)
            ? followingList
            : [];

          followButton.textContent = followingArray.includes(viewingUid)
            ? "Following"
            : "Follow";
        }).catch(console.error);
      }

      followButton.onclick = () => {
        document.dispatchEvent(new CustomEvent("open-notification-profile", {
          detail: { uid: viewingUid }
        }));

        alert("Follow action ko existing app follow system se connect karna hoga.");
      };
    }
  };

  stopProfileListener = onSnapshot(
    userRef,
    async snapshot => {
      if (!snapshot.exists()) {
        content.innerHTML = `
          <div class="ip-glass" style="padding:25px;text-align:center">
            Profile data nahi mila.
          </div>
        `;
        return;
      }

      const data = snapshot.data();

      try {
        const postsRef = collection(db, "posts");
        const postsQuery = query(
          postsRef,
          where("uid", "==", viewingUid),
          limit(100)
        );

        if (stopPostsListener) stopPostsListener();

        stopPostsListener = onSnapshot(
          postsQuery,
          postsSnapshot => {
            const posts = postsSnapshot.docs.map(item => ({
              id: item.id,
              ...item.data()
            }));

            renderProfile(data, posts);
          },
          error => {
            console.error("Profile posts error:", error);
            renderProfile(data, []);
          }
        );
      } catch (error) {
        console.error("Profile posts query error:", error);
        renderProfile(data, []);
      }
    },
    error => {
      console.error("Profile loading error:", error);

      content.innerHTML = `
        <div class="ip-glass" style="padding:25px;text-align:center">
          Profile load nahi hua. Firestore Rules check karein.
        </div>
      `;
    }
  );
}

export function closeProfilePage() {
  closeProfile();
            }
