// The preview canvas handles rotation, stack browsing and case manipulation.
// Only the drawer handle captures vertical gestures.
export function createItemDrawer(panel, { openInfo, dismiss }) {
  const compactLayout = matchMedia('(max-width: 1024px), (any-pointer: coarse)');
  const grip = panel.querySelector('#drawerGrip');
  const label = panel.querySelector('#drawerLabel');
  const body = panel.querySelector('.drawer-body');
  let drag = null;
  let consumeClick = false;

  function setExpanded(value) {
    panel.dataset.expanded = String(value);
    grip.setAttribute('aria-expanded', String(value));
    label.textContent = value ? 'Less' : 'Details';
    grip.setAttribute('aria-label', value ? 'Collapse item details' : 'Show item details');
    body.scrollTop = 0;
  }

  function expand() {
    if (panel.dataset.view === 'stack') openInfo();
    setExpanded(true);
    grip.focus({ preventScroll: true });
  }

  function reset() {
    drag = null;
    setExpanded(false);
  }

  grip.addEventListener('click', event => {
    if (consumeClick && event.detail !== 0) {
      consumeClick = false;
      return;
    }
    if (panel.dataset.expanded === 'true') setExpanded(false);
    else expand();
  });

  grip.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    consumeClick = false;
    drag = { id: event.pointerId, y: event.clientY };
    grip.setPointerCapture(event.pointerId);
  });
  grip.addEventListener('pointerup', event => {
    if (event.pointerId !== drag?.id) return;
    const distance = event.clientY - drag.y;
    drag = null;
    if (Math.abs(distance) < 30) return;
    consumeClick = true;
    if (distance < 0) expand();
    else if (panel.dataset.expanded === 'true') setExpanded(false);
    else dismiss();
  });
  grip.addEventListener('lostpointercapture', () => { drag = null; });
  compactLayout.addEventListener('change', reset);
  return { reset, get compact() { return compactLayout.matches; } };
}
