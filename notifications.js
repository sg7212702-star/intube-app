import { db, auth } from "./firebase.js";

import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let unsubscribeNotifications = null;

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

export function openNotif() {
  let page = document.getElementById("notifFullPage");

  if (!page) {
    page = document.createElement("div");
    page.id = "notifFullPage";

    page.innerHTML = `
      <div style="
        position:fixed;
        inset:0;
        z-index:9999;
        display:flex;
        flex-direction:column;
        color:white;
        background:rgba(10,10,15,.72);
        backdrop-filter:blur(30px) saturate(180%);
        -webkit-backdrop-filter:blur(30px) saturate(180%);
        font-family:inherit;
      ">
        <div style="
          height:64px;
          flex-shrink:0;
          display:flex;
          align-items:center;
          gap:14px;
          padding:0 18px;
          border-bottom:1px solid rgba(255,255,255,.15);
          background:rgba(255,255,255,.04);
        ">
          <button id="closeNotifFull" aria-label="Back" style="
            width:40px;
            height:40px;
            border-radius:50%;
            border:1px solid rgba(255,255,255,.22);
            background:rgba(255,255,255,.09);
            color:white;
            font-size:24px;
            cursor:pointer;
          ">‹</button>

          <div style="flex:1">
            <div style="font-size:19px;font-weight:700">
              Notifications
            </div>
            <div style="font-size:11px;opacity:.6;margin-top:2px">
              Your latest activity
            </div>
          </div>

          <div style="
            width:38px;
            height:38px;
            display:flex;
            align-items:center;
            justify-content:center;
            border-radius:50%;
            border:1px solid rgba(255,255,255,.15);
            background:rgba(255,255,255,.07);
            font-size:19px;
          ">♧</div>
        </div>

        <div id="realNotifList" style="
          flex:1;
          overflow-y:auto;
          padding:16px;
          overscroll-behavior:contain;
        ">
          <div style="text-align:center;padding:50px 15px;opacity:.7">
            Loading notifications...
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(page);

    page.querySelector("#closeNotifFull").onclick = () => {
      page.style.display = "none";
      document.body.style.overflow = "";

      if (unsubscribeNotifications) {
        unsubscribeNotifications();
        unsubscribeNotifications = null;
      }
    };
  }

  page.style.display = "block";
  document.body.style.overflow = "hidden";

  const list = page.querySelector("#realNotifList");
  const user = auth.currentUser;

  if (!user) {
    list.innerHTML = `
      <div style="
        text-align:center;
        padding:60px 20px;
        border:1px solid rgba(255,255,255,.14);
        border-radius:22px;
        background:rgba(255,255,255,.06);
        backdrop-filter:blur(20px);
      ">
        <div style="font-size:42px;margin-bottom:12px">🔐</div>
        <div style="font-size:16px;font-weight:600">Login required</div>
        <p style="font-size:13px;opacity:.7">
          Notifications dekhne ke liye login karein.
        </p>
      </div>
    `;
    return;
  }

  if (unsubscribeNotifications) {
    unsubscribeNotifications();
    unsubscribeNotifications = null;
  }

  list.innerHTML = `
    <div style="text-align:center;padding:50px 15px;opacity:.7">
      Loading notifications...
    </div>
  `;

  const notificationsRef = collection(
    db,
    "users",
    user.uid,
    "notifications"
  );

  const notificationsQuery = query(
    notificationsRef,
    orderBy("createdAt", "desc")
  );

  unsubscribeNotifications = onSnapshot(
    notificationsQuery,

    (snapshot) => {
      if (snapshot.empty) {
        list.innerHTML = `
          <div style="
            text-align:center;
            padding:60px 20px;
            border:1px solid rgba(255,255,255,.13);
            border-radius:24px;
            background:rgba(255,255,255,.055);
            backdrop-filter:blur(24px);
            -webkit-backdrop-filter:blur(24px);
          ">
            <div style="font-size:52px;margin-bottom:12px">🔔</div>
            <h3 style="margin:10px 0;font-size:18px">
              No notifications yet
            </h3>
            <p style="font-size:13px;line-height:1.6;opacity:.65">
              Likes, comments aur follows ki notifications yahan dikhenge.
            </p>
          </div>
        `;
        return;
      }

      list.innerHTML = snapshot.docs.map((item) => {
        const n = item.data();

        const username = escapeHTML(
          n.fromUsername || "InstaPro User"
        );

        const message = escapeHTML(
          n.message || "interacted with you"
        );

        const photo = escapeHTML(
          n.fromPhoto || "https://www.gravatar.com/avatar/?d=mp"
        );

        const type = escapeHTML(n.type || "activity");

        const unread = n.read === false;

        const time = n.createdAt?.toDate
          ? escapeHTML(n.createdAt.toDate().toLocaleString())
          : "";

        const requestActions = n.type === "follow_request" && n.fromUid
          ? `
            <div style="display:flex;gap:7px;margin-top:9px;flex-wrap:wrap">
              <button type="button" data-follow-accept="${escapeHTML(n.fromUid)}" data-notif-action-id="${escapeHTML(item.id)}" style="border:0;border-radius:9px;padding:8px 14px;background:#1688ff;color:#fff;font-weight:700;cursor:pointer">Confirm</button>
              <button type="button" data-follow-reject="${escapeHTML(n.fromUid)}" data-notif-action-id="${escapeHTML(item.id)}" style="border:1px solid rgba(255,255,255,.2);border-radius:9px;padding:8px 14px;background:rgba(255,255,255,.08);color:#fff;font-weight:700;cursor:pointer">Delete</button>
            </div>`
          : "";

        return `
          <div
            data-notif-id="${escapeHTML(item.id)}"
            data-post-id="${escapeHTML(n.postId || "")}"
            data-story-id="${escapeHTML(n.storyId || "")}"
            data-from-uid="${escapeHTML(n.fromUid || "")}"
            style="
              display:flex;
              align-items:center;
              gap:12px;
              padding:14px;
              margin-bottom:12px;
              border:1px solid rgba(255,255,255,.15);
              border-radius:20px;
              background:${unread
                ? "rgba(100,150,255,.15)"
                : "rgba(255,255,255,.055)"};
              box-shadow:0 8px 25px rgba(0,0,0,.08);
              backdrop-filter:blur(22px);
              -webkit-backdrop-filter:blur(22px);
              cursor:pointer;
              transition:background .2s;
            "
          >
            <img
              data-notif-profile="${escapeHTML(n.fromUid || "")}"
              role="button"
              tabindex="0"
              title="View profile"
              src="${photo}"
              alt=""
              onerror="this.onerror=null;this.src='https://www.gravatar.com/avatar/?d=mp'"
              style="
                width:46px;
                height:46px;
                flex-shrink:0;
                border-radius:50%;
                object-fit:cover;
                border:1px solid rgba(255,255,255,.25);
                cursor:pointer;
              "
            >

            <div style="flex:1;min-width:0">
              <div style="
                font-size:14px;
                line-height:1.5;
                overflow-wrap:anywhere;
              ">
                <strong data-notif-profile="${escapeHTML(n.fromUid || "")}" style="cursor:pointer">${username}</strong> ${message}
              </div>

              <div style="
                display:flex;
                flex-wrap:wrap;
                gap:6px;
                margin-top:6px;
                font-size:10px;
                opacity:.65;
              ">
                <span>${type.toUpperCase()}</span>
                ${time ? `<span>· ${time}</span>` : ""}
              </div>
              ${requestActions}
            </div>

            ${unread ? `
              <span style="
                width:9px;
                height:9px;
                flex-shrink:0;
                border-radius:50%;
                background:#78aaff;
                box-shadow:0 0 10px rgba(120,170,255,.5);
              "></span>
            ` : ""}
          </div>
        `;
      }).join("");

      list.querySelectorAll("[data-notif-profile]").forEach((person) => {
        const openPersonProfile = async (event) => {
          event.preventDefault();
          event.stopPropagation();
          const uid = person.dataset.notifProfile;
          if (!uid) return;
          try {
            await import("./profile.js");
            if (typeof window.openProfile === "function") {
              await window.openProfile(uid);
            } else {
              document.dispatchEvent(new CustomEvent("open-notification-profile", { detail: { uid } }));
            }
          } catch (error) {
            console.error("Notification profile open error:", error);
          }
        };
        person.addEventListener("click", openPersonProfile);
        if (person.tagName === "IMG") {
          person.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") openPersonProfile(event);
          });
        }
      });

      list.querySelectorAll("[data-follow-accept], [data-follow-reject]").forEach(button => {
        button.onclick = async event => {
          event.preventDefault();
          event.stopPropagation();
          const requesterUid = button.dataset.followAccept || button.dataset.followReject;
          const accept = Boolean(button.dataset.followAccept);
          const notificationId = button.dataset.notifActionId;
          const actionButtons = button.parentElement.querySelectorAll("button");
          actionButtons.forEach(b => b.disabled = true);
          try {
            const privateSystem = window.InstaProPrivate;
            if (!privateSystem?.respondFollowRequest) throw new Error("Follow request system load nahi hua. App refresh karein.");
            await privateSystem.respondFollowRequest(requesterUid, accept);
            await updateDoc(doc(db, "users", user.uid, "notifications", notificationId), {
              read: true,
              requestAction: accept ? "accepted" : "rejected"
            });
            const actions = button.parentElement;
            actions.innerHTML = `<span style="font-size:12px;font-weight:700;opacity:.8">${accept ? "✓ Request confirmed" : "Request deleted"}</span>`;
          } catch (error) {
            console.error("Follow request notification action failed:", error);
            alert(error.message || "Follow request update nahi hui.");
            actionButtons.forEach(b => b.disabled = false);
          }
        };
      });

      list.querySelectorAll("[data-notif-id]").forEach((row) => {
        row.onclick = async (event) => {
          if (event.target.closest("[data-follow-accept], [data-follow-reject]")) return;
          const notificationId = row.dataset.notifId;
          const postId = row.dataset.postId;
          const storyId = row.dataset.storyId;
          const fromUid = row.dataset.fromUid;

          try {
            await updateDoc(
              doc(
                db,
                "users",
                user.uid,
                "notifications",
                notificationId
              ),
              { read: true }
            );
          } catch (error) {
            console.error(
              "Notification read update error:",
              error
            );
          }

          // Instagram-style routing: close Activity first, then open the exact
          // content/profile instead of dispatching an event with no guaranteed listener.
          page.style.display = "none";
          document.body.style.overflow = "";
          if (unsubscribeNotifications) {
            unsubscribeNotifications();
            unsubscribeNotifications = null;
          }

          if (storyId) {
            document.dispatchEvent(new CustomEvent("open-notification-story", {
              detail: { storyId, fromUid }
            }));
            // Story viewers may be lazily loaded; profile is a safe fallback.
            setTimeout(async () => {
              const storyViewer = document.querySelector('[data-story-id="' + CSS.escape(String(storyId)) + '"]');
              if (!storyViewer && fromUid && typeof window.openProfile === "function") {
                try { await window.openProfile(fromUid); } catch (error) { console.error("Notification story fallback:", error); }
              }
            }, 350);
          } else if (postId) {
            const feedCard = document.querySelector('#feed [data-post-id="' + CSS.escape(String(postId)) + '"]');
            if (feedCard) {
              feedCard.scrollIntoView({ behavior: "smooth", block: "start" });
              feedCard.animate?.([{ opacity: .65 }, { opacity: 1 }], { duration: 450 });
            } else {
              // Video posts can be opened directly in the existing full-screen Reels viewer.
              try {
                await import("./reels.js");
                const opener = window.InstaProReels?.openPost;
                if (typeof opener === "function") {
                  opener(postId, null);
                } else if (fromUid && typeof window.openProfile === "function") {
                  await window.openProfile(fromUid);
                } else {
                  alert("Yeh post abhi feed mein nahi mili. Feed refresh karke dobara try karein.");
                }
              } catch (error) {
                console.error("Notification post open error:", error);
                if (fromUid && typeof window.openProfile === "function") {
                  try { await window.openProfile(fromUid); } catch (_) {}
                } else {
                  alert("Post open nahi ho payi. App refresh karke dobara try karein.");
                }
              }
            }
          } else if (fromUid) {
            try {
              await import("./profile.js");
              if (typeof window.openProfile === "function") {
                await window.openProfile(fromUid);
              } else {
                document.dispatchEvent(new CustomEvent("open-notification-profile", { detail: { uid: fromUid } }));
              }
            } catch (error) {
              console.error("Notification profile open error:", error);
            }
          }
        };
      });
    },

    (error) => {
      console.error("Notifications loading error:", error);

      list.innerHTML = `
        <div style="
          text-align:center;
          padding:35px 20px;
          border:1px solid rgba(255,100,100,.2);
          border-radius:20px;
          background:rgba(255,80,80,.07);
        ">
          <div style="font-size:36px">⚠️</div>
          <p style="font-size:14px">
            Notifications load nahi hue.
          </p>
          <p style="font-size:12px;opacity:.7">
            Firestore Rules aur createdAt field check karein.
          </p>
        </div>
      `;
    }
  );
}


/* Live Instagram-style unread notification counter on the top notification button. */
let unsubscribeUnreadCount = null;
let lastUnreadCount = 0;

function renderNotificationBadge(count) {
  const button = document.getElementById("notifBtn");
  if (!button) return;
  let badge = button.querySelector(".notification-badge");
  if (!badge) {
    const oldDot = button.querySelector(".dot");
    if (oldDot) oldDot.remove();
    badge = document.createElement("span");
    badge.className = "notification-badge";
    badge.setAttribute("aria-live", "polite");
    badge.setAttribute("aria-label", "Unread notifications");
    button.appendChild(badge);
  }
  const safeCount = Math.max(0, Number(count) || 0);
  badge.textContent = safeCount > 99 ? "99+" : String(safeCount);
  badge.hidden = safeCount === 0;
  badge.classList.toggle("notification-badge-pop", safeCount > lastUnreadCount);
  if (safeCount > lastUnreadCount) {
    window.setTimeout(() => badge.classList.remove("notification-badge-pop"), 450);
  }
  lastUnreadCount = safeCount;
}

onAuthStateChanged(auth, (user) => {
  if (unsubscribeUnreadCount) {
    unsubscribeUnreadCount();
    unsubscribeUnreadCount = null;
  }
  lastUnreadCount = 0;
  renderNotificationBadge(0);
  if (!user) return;

  const unreadRef = collection(db, "users", user.uid, "notifications");
  unsubscribeUnreadCount = onSnapshot(unreadRef, (snapshot) => {
    const unread = snapshot.docs.reduce((total, item) => {
      const data = item.data();
      return total + (data.read === false || data.read == null ? 1 : 0);
    }, 0);
    renderNotificationBadge(unread);
  }, (error) => {
    console.error("Unread notification count error:", error);
  });
});

const oldBox = document.getElementById("notifBox");
if (oldBox) oldBox.remove();
