// Keep the device policy tied to visible, running practice, never to app startup.
export function practiceNeedsScreen({active, view, readerVisible, scoreVisible, hidden}) {
  return !hidden && active?.runningSince != null && (view === 'session' || readerVisible || scoreVisible);
}

export function createScreenAwake(apply) {
  let desired = false, applied, queue = Promise.resolve();
  return enabled => {
    desired = Boolean(enabled);
    queue = queue.catch(() => {}).then(async () => {
      if (applied === desired) return;
      const next = desired;
      await apply(next);
      applied = next;
    });
    return queue;
  };
}
