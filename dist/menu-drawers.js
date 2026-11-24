// The header is always draggable. A pull on the contents dismisses only from
// the top of its scroll area, leaving ordinary list scrolling and map taps free.
export function enableMenuDrawer(panel, isPhone, dismiss) {
  const handle = panel.querySelector('.menu-grip');
  handle.onclick = dismiss;
  const header = panel.querySelector('.panel-head');
  let start = null;
  header.addEventListener('pointerdown', event => {
    if (!isPhone() || !event.isPrimary || event.button !== 0 || event.target.closest('button')) return;
    start = { id: event.pointerId, y: event.clientY };
    header.setPointerCapture(event.pointerId);
  });
  header.addEventListener('pointerup', event => {
    if (event.pointerId === start?.id && event.clientY - start.y > 42) dismiss();
    start = null;
  });
  header.addEventListener('lostpointercapture', () => { start = null; });
  let pull = null;
  panel.addEventListener('touchstart', event => {
    pull = null;
    if (!isPhone() || event.touches.length !== 1 || event.target.closest('input, select, a, .filters')) return;
    for (let n=event.target; n && panel.contains(n); n=n.parentElement) {
      if (n.scrollTop > 1 && n.scrollHeight > n.clientHeight + 1) return;
      if (n === panel) break;
    }
    const t=event.touches[0];
    pull = { id:t.identifier, x:t.clientX, y:t.clientY };
  }, {passive:true});
  panel.addEventListener('touchend', event => {
    const t=event.changedTouches[0];
    if (pull && t.identifier===pull.id && !event.touches.length) {
      const dy=t.clientY-pull.y;
      if (dy>52 && dy>Math.abs(t.clientX-pull.x)*1.45) {
        if(event.cancelable)event.preventDefault();
        dismiss();
      }
    }
    pull=null;
  }, {passive:false});
  panel.addEventListener('touchcancel', () => { pull=null; }, {passive:true});
}
