document.addEventListener("DOMContentLoaded", () => {

  const storyBtn = document.getElementById("storyBtn");
  const storyModal = document.getElementById("storyModal");

  if (storyBtn && storyModal) {
    storyBtn.addEventListener("click", () => {
      storyModal.hidden = false;
    });
  }

  storyModal?.addEventListener("click", (e) => {
    if (e.target === storyModal) {
      storyModal.hidden = true;
    }
  });

});
