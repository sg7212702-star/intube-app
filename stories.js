let myStories = JSON.parse(localStorage.getItem('myStories') || '[]');

function initYourStory(){
  const yourStoryEl = document.querySelector('.story');
  if(!yourStoryEl) return;
  yourStoryEl.style.cursor = 'pointer';
  yourStoryEl.onclick = () => {
    if(myStories.length === 0){
      const input = document.getElementById('storyInput') || document.getElementById('fileInput');
      if(input) input.click();
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
  if(myStories.length > 0){
    const ring = document.querySelector('.story.ring');
    if(ring) ring.style.boxShadow = '0 0 20px rgba(255,77,154,0.9), 0 0 40px rgba(255,77,154,0.5)';
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  initYourStory();
  renderStories();
  const storyInput = document.getElementById('storyInput');
  if(storyInput){
    storyInput.onchange = (e)=>{
      const file = e.target.files[0];
      if(!file) return;
      const url = URL.createObjectURL(file);
      const type = file.type.startsWith('video')? 'video' : 'image';
      myStories.push({url, type, name: file.name, time: Date.now()});
      localStorage.setItem('myStories', JSON.stringify(myStories));
      localStorage.setItem('openStory', JSON.stringify(myStories[myStories.length-1]));
      location.href = 'story-viewer.html';
    };
  }
});
