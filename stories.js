let myStories = JSON.parse(localStorage.getItem('myStories') || '[]');

// Your Story button
function initYourStory(){
  const yourStoryEl = document.querySelector('.story'); // pehla wala
  if(!yourStoryEl) return;
  yourStoryEl.onclick = () => {
    if(myStories.length === 0){
      // Kuch nahi hai -> Gallery kholo
      document.getElementById('storyInput')?.click() || document.getElementById('fileInput')?.click();
    } else {
      openMyStory();
    }
  };
}

function openMyStory(){
  const last = myStories[myStories.length-1];
  if(!last) return;
  localStorage.setItem('openStory', JSON.stringify(last));
  location.href = 'story-viewer.html';
}

function renderStories(){
  // Agar story hai to Your Story ka ring pink active
  if(myStories.length > 0){
    const ring = document.querySelector('.story.ring');
    if(ring) ring.style.boxShadow = '0 0 20px rgba(255,77,154,0.8)';
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  initYourStory();
  renderStories();
});

// Story upload se
const storyInput = document.getElementById('storyInput');
if(storyInput){
  storyInput.onchange = (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const url = URL.createObjectURL(file);
    const type = file.type.startsWith('video')? 'video' : 'image';
    myStories.push({url, type, name: file.name, time: Date.now()});
    localStorage.setItem('myStories', JSON.stringify(myStories));
    location.href = 'story-viewer.html';
  };
}
