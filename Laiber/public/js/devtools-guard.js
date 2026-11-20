(() => {
  const devtoolsCombos = new Set(['i', 'j', 'c']);
  window.addEventListener('keydown', (event) => {
    const key = String(event.key || '').toLowerCase();
    const mod = event.ctrlKey || event.metaKey;
    const isDevtools = event.key === 'F12' || (mod && event.shiftKey && devtoolsCombos.has(key));
    const isViewSource = mod && key === 'u';
    if (isDevtools || isViewSource) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
})();
