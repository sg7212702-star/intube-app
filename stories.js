document.addEventListener("DOMContentLoaded", () => {

  const addStory = document.querySelector(".addStory");
  const storyModal = document.getElementById("storyModal");

  if (addStory && storyModal) {
    addStory.addEventListener("click", () => {
      storyModal.hidden = false;
    });
  }

  if (storyModal) {
    storyModal.addEventListener("click", (e) => {
      if (e.target === storyModal) {
        storyModal.hidden = true;
      }
    });
  }

});
