// LOCAL STORAGE SYSTEM - No Cloudinary, No Firebase Storage
console.log("Local Storage Mode ON");

// Image ko Base64 me convert karke Local Storage me save karega
export async function uploadToLocal(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target.result); // yehi image ka URL ban jayega
    };
    reader.readAsDataURL(file);
  });
}

// Profile Save
export function saveProfileLocal(data) {
  localStorage.setItem("intube_profile", JSON.stringify(data));
}

// Profile Get
export function getProfileLocal() {
  return JSON.parse(localStorage.getItem("intube_profile") || "{}");
}
