import { db, auth } from "./firebase.js";
import {
collection,
query,
orderBy,
onSnapshot,
doc,
updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
  <div style="position:fixed;inset:0;background:rgba(10,10,12,0.72);backdrop-filter:blur(30px) saturate(180%);-webkit-backdrop-filter:blur(30px) saturate(180%);z-index:9999;display:flex;flex-direction:column;color:white">
    <div style="height:60px;flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:0 16px;border-bottom:1px solid rgba(255,255,255,.15)">
      <div style="display:flex;align-items:center;gap:12px">
        <div id="closeNotifFull" style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center;cursor:pointer">←</div>
        <b style="font-size:18px">Notifications</b>
      </div>
    </div>
    <div id="realNotifList" style="flex:1;overflow-y:auto;padding:16px">
      <p style="text-align:center;opacity:.7;padding:30px">Loading notifications...</p>
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
list.innerHTML = '<p style="text-align:center;padding:30px;opacity:.75">Notifications dekhne ke liye login karein.</p>';
return;
}

if (unsubscribeNotifications) {
unsubscribeNotifications();
unsubscribeNotifications = null;
}

const notificationsRef = collection(db, "users", user.uid, "notifications");
const notificationsQuery = query(notificationsRef, orderBy("createdAt", "desc"));

unsubscribeNotifications = onSnapshot(
notificationsQuery,
(snapshot) => {
if (snapshot.empty) {
list.innerHTML = " <div style="text-align:center;padding:60px 20px;opacity:.75"> <div style="font-size:48px">🔔</div> <h3 style="margin:12px 0 6px">No notifications yet</h3> <p style="font-size:13px;opacity:.7">Likes, comments aur follows yahan dikhenge.</p> </div>";
return;
}

  list.innerHTML = snapshot.docs.map((item) => {
    const n = item.data();
    const username = escapeHTML(n.fromUsername || "InstaPro User");
    const message = escapeHTML(n.message || "interacted with you");
    const photo = escapeHTML(n.fromPhoto || "https://www.gravatar.com/avatar/?d=mp");
    const type = escapeHTML(n.type || "activity");
    const unread = n.read === false;
    const time = n.createdAt?.toDate
      ? escapeHTML(n.createdAt.toDate().toLocaleString())
      : "";

    return `
      <div data-notif-id="${escapeHTML(item.id)}"
           data-post-id="${escapeHTML(n.postId || "")}"
           data-from-uid="${escapeHTML(n.fromUid || "")}"
           style="display:flex;gap:12px;align-items:center;padding:14px 12px;margin-bottom:10px;border:1px solid rgba(255,255,255,.14);border-radius:16px;background:${unread ? "rgba(100,150,255,.15)" : "rgba(255,255,255,.06)"};cursor:pointer">
        <img src="${photo}" alt="" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0" onerror="this.src='https://www.gravatar.com/avatar/?d=mp'">
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;overflow-wrap:anywhere"><strong>${username}</strong> ${message}</div>
          <div style="font-size:11px;opacity:.65;margin-top:5px">${type.toUpperCase()}${time ? " · " + time : ""}</div>
        </div>
        ${unread ? '<span style="width:8px;height:8px;background:#70a7ff;border-radius:50%;flex-shrink:0"></span>' : ""}
      </div>`;
  }).join("");

  list.querySelectorAll("[data-notif-id]").forEach((row) => {
    row.onclick = async () => {
      const notificationId = row.dataset.notifId;

      try {
        await updateDoc(
          doc(db, "users", user.uid, "notifications", notificationId),
          { read: true }
        );
      } catch (error) {
        console.error("Notification read update error:", error);
      }

      const postId = row.dataset.postId;
      const fromUid = row.dataset.fromUid;

      if (postId) {
        document.dispatchEvent(new CustomEvent("open-notification-post", {
          detail: { postId, fromUid }
        }));
      } else if (fromUid) {
        document.dispatchEvent(new CustomEvent("open-notification-profile", {
          detail: { uid: fromUid }
        }));
      }
    };
  });
},
(error) => {
  console.error("Notifications loading error:", error);
  list.innerHTML = '<p style="text-align:center;padding:30px">Notifications load nahi hue. Firestore Rules aur indexes check karein.</p>';
}

);
}

const oldBox = document.getElementById("notifBox");
if (oldBox) oldBox.remove();
