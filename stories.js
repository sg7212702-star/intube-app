document.addEventListener("DOMContentLoaded", () => {

  const addStory = document.querySelector(".addStory");
  const storyModal = document.getElementById("storyModal");
  const uploadStoryBtn = document.getElementById("uploadStoryBtn");
  const storyFile = document.getElementById("storyFile");

  if (addStory && storyModal) {
    addStory.addEventListener("click", () => {
      storyModal.hidden = false;
    });
  }

  storyModal?.addEventListener("click", (e) => {
    if (e.target === storyModal) {
      storyModal.hidden = true;
    }
  });

  uploadStoryBtn?.addEventListener("click", () => {

    if (!storyFile.files.length) {
      alert("Please select a story image");
      return;
    }

    alert("Story upload system connected successfully!");
  });

});
