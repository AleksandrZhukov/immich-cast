// @ts-nocheck
window.onload = () => {
  function startReceiver() {
    const context = cast.framework.CastReceiverContext.getInstance();
    const playerManager = context.getPlayerManager();
    window.playerManager = playerManager;

    const deviceCaps = context.getDeviceCapabilities();
    if (!deviceCaps) {
      console.error('Device capabilities unavailable');
      return;
    }

    setupMutationObservers();

    const mediaPlayer = document.createElement('cast-media-player');
    mediaPlayer.style.display = 'none';
    document.body.appendChild(mediaPlayer);

    context.addEventListener(cast.framework.system.EventType.READY, () => {
      context.setApplicationState('Immich Receiver Ready');
      playDummyMedia();
    });

    const options = new cast.framework.CastReceiverOptions();
    options.disableIdleTimeout = true;
    context.start(options);

    console.log('Cast receiver started.');
  }

  // Play dummy image
  let dummyMediaTimer = null;

  function scheduleDummyMedia(delayMs) {
    // Keep a single timer handle. Without this, each ~9-min refresh AND every
    // 5s error retry forked an extra timer chain on a receiver that runs for
    // weeks, so the callback rate multiplied without bound.
    if (dummyMediaTimer) clearTimeout(dummyMediaTimer);
    dummyMediaTimer = setTimeout(playDummyMedia, delayMs);
  }

  function playDummyMedia() {
    const loadRequestData = new cast.framework.messages.LoadRequestData();
    loadRequestData.autoplay = true;
    loadRequestData.media = new cast.framework.messages.MediaInformation();
    loadRequestData.media.contentId = 'https://dummyimage.com/3/09f/fff.jpg';
    loadRequestData.media.contentType = 'image/jpeg';
    loadRequestData.media.streamType = cast.framework.messages.StreamType.BUFFERED;

    const metadata = new cast.framework.messages.GenericMediaMetadata();
    metadata.title = 'Immich Cast View ' + new Date().toLocaleTimeString();
    loadRequestData.media.metadata = metadata;
    loadRequestData.requestId = 0;

    playerManager
      .load(loadRequestData)
      .then(() => {
        console.log('Dummy image loaded');
        scheduleDummyMedia(60 * 9 * 1000); // Refresh every ~9 mins
      })
      .catch((err) => {
        console.error('Error loading dummy image', err);
        scheduleDummyMedia(5000);
      });
  }

  // Remove overlays
  function setupMutationObservers() {
    const observer1 = new MutationObserver(() => {
      const touch = document.body.querySelector('touch-controls');
      if (touch) touch.remove();
    });
    observer1.observe(document.body, { childList: true, subtree: true });

    const observer2 = new MutationObserver(() => {
      Array.from(document.querySelectorAll('div')).forEach((el) => {
        if (el.innerHTML.includes('--cast-controls')) el.remove();
      });
    });
    observer2.observe(document.body, { childList: true, subtree: true });
  }

  startReceiver();
};
