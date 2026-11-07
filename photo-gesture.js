// Use completed clicks so a scroll or a cancelled touch cannot open a photograph.
function bindExercisePhotos(root, activate) {
  let last;
  function clear() { last = null; }
  root.addEventListener('pointercancel', clear);
  root.addEventListener('scroll', clear, true);
  root.addEventListener('click', event => {
    const photo = event.target.closest?.('[data-exercise-photo]');
    if (!photo) { clear(); return; }
    if (event.detail === 0) { clear(); activate(photo); return; } // Keyboard or assistive activation.
    const now = event.timeStamp;
    if (last && last.photo === photo && now - last.time <= 450 &&
        Math.hypot(event.clientX - last.x, event.clientY - last.y) <= 28) {
      clear();
      activate(photo);
    } else {
      last = {photo, time: now, x: event.clientX, y: event.clientY};
    }
  });
}
