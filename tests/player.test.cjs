const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const player = fs.readFileSync(path.join(__dirname, '../player.jsx'), 'utf8');

function pipRuntime() {
  const context = vm.createContext({ document: {}, Promise, Error });
  vm.runInContext(player.slice(player.indexOf('function videoPipMode('), player.indexOf('function VideoPlayer(')), context);
  return context;
}

test('standard PiP runs synchronously in the click and can exit', async () => {
  const context = pipRuntime(), calls = [];
  const video = { requestPictureInPicture() { calls.push('enter'); } };
  const doc = { pictureInPictureEnabled: true, exitPictureInPicture() { calls.push('exit'); } };
  const result = context.toggleVideoPip(video, doc);
  assert.deepEqual(calls, ['enter']);
  await result;
  doc.pictureInPictureElement = video;
  await context.toggleVideoPip(video, doc);
  assert.deepEqual(calls, ['enter', 'exit']);
});

test('Safari uses its supported presentation API, without a standard API', async () => {
  const context = pipRuntime(), modes = [];
  const video = { webkitPresentationMode: 'inline',
    webkitSupportsPresentationMode: mode => mode === 'picture-in-picture',
    webkitSetPresentationMode: mode => modes.push(mode) };
  await context.toggleVideoPip(video, {});
  video.webkitPresentationMode = 'picture-in-picture';
  await context.toggleVideoPip(video, {});
  assert.deepEqual(modes, ['picture-in-picture', 'inline']);
});

test('WebKit host denial is not bypassed by a misleading standard capability', async () => {
  const context = pipRuntime();
  let requested = false;
  const video = { webkitSupportsPresentationMode: () => false, webkitSetPresentationMode() {},
    requestPictureInPicture() { requested = true; } };
  assert.equal(context.videoPipMode(video, { pictureInPictureEnabled: true }), null);
  await assert.rejects(context.toggleVideoPip(video, { pictureInPictureEnabled: true }));
  assert.equal(requested, false);
});

test('PiP handles unsupported, disabled and rejected host requests', async () => {
  const context = pipRuntime();
  for (const video of [null, {}, { disablePictureInPicture: true, requestPictureInPicture() {} }]) {
    assert.equal(context.videoPipMode(video, { pictureInPictureEnabled: true }), null);
    await assert.rejects(context.toggleVideoPip(video, { pictureInPictureEnabled: true }));
  }
  await assert.rejects(context.toggleVideoPip({ requestPictureInPicture() { throw new Error('NotAllowed'); } },
    { pictureInPictureEnabled: true }), /NotAllowed/);
});

function navigationRuntime() {
  const source = fs.readFileSync(path.join(__dirname, '../app.jsx'), 'utf8');
  const start = source.indexOf('const nav = React.useMemo(');
  const end = source.indexOf('const background =', start);
  const context = vm.createContext({ React: { useMemo: fn => fn() },
    SCREENS: { home: true, video: true, artist: true, profile: true, saved: true, shorts: true },
    SCREEN_TO_TAB: {}, TAB_TO_SCREEN: { home: 'home', favorites: 'saved', shorts: 'shorts' },
    stack: [{ screen: 'home', params: {} }], current: { screen: 'home', params: {} },
    videoSession: null, videoMinimized: false, isPro: true, user: {}, userState: {},
    homeVideosState: { items: [] }, shortsPlayer: null, inviteAccess: null, paywallOpen: false,
    setPro() {}, setShortsPlayer() {}, setInviteAccess() {}, setPaywallOpen() {},
    normalizeInviteAccess: value => value, window: {}, console,
  });
  context.setStack = fn => { context.stack = typeof fn === 'function' ? fn(context.stack) : fn; };
  context.setVideoSession = value => { context.videoSession = value; };
  const refresh = () => {
    context.current = context.stack[context.stack.length - 1];
    context.videoMinimized = !!context.videoSession && context.current.screen !== 'video';
    return vm.runInContext(`(() => { ${source.slice(start, end)}; return nav; })()`, context);
  };
  return { context, refresh };
}

test('startup suspension restores the original mute preference before resuming', async () => {
  const start = player.indexOf('let playPending = false;');
  const end = player.indexOf('function showError(', start);
  for (const initiallyMuted of [false, true]) {
    let resolvePlay;
    const media = { muted: initiallyMuted, paused: true, readyState: 2,
      play() { this.paused = false; return new Promise(resolve => { resolvePlay = resolve; }); },
      pause() { this.paused = true; } };
    const suspendedRef = { current: false }, resumeAfterSuspend = { current: false };
    const context = vm.createContext({ vEl: media, suspendedRef, resumeAfterSuspend,
      manuallyPaused: { current: false }, mountedRef: { current: true },
      HTMLMediaElement: { HAVE_CURRENT_DATA: 2 }, markReady() {}, console });
    vm.runInContext(player.slice(start, end), context);
    context.tryPlay();
    assert.equal(media.muted, true);
    suspendedRef.current = true;
    resolvePlay();
    await Promise.resolve();
    assert.equal(media.muted, initiallyMuted);
    assert.equal(media.paused, true);
    assert.equal(resumeAfterSuspend.current, true);
  }
});

test('overlapping startup retries do not capture temporary autoplay muting', async () => {
  const start = player.indexOf('let playPending = false;');
  const end = player.indexOf('function showError(', start);
  let resolvePlay, calls = 0;
  const media = { muted: false, readyState: 2,
    play() { calls++; return new Promise(resolve => { resolvePlay = resolve; }); } };
  const context = vm.createContext({ vEl: media, suspendedRef: { current: false },
    resumeAfterSuspend: { current: false }, manuallyPaused: { current: false },
    mountedRef: { current: true }, HTMLMediaElement: { HAVE_CURRENT_DATA: 2 }, markReady() {}, console });
  vm.runInContext(player.slice(start, end), context);
  context.tryPlay();
  context.tryPlay();
  assert.equal(calls, 1);
  resolvePlay();
  await Promise.resolve();
  assert.equal(media.muted, false);
});

test('collapse, navigation and restore retain the same video session', () => {
  const { context, refresh } = navigationRuntime();
  const session = { id: 7, video: { id: 7 } };
  refresh().go('video', session);
  refresh().minimizeVideo();
  assert.equal(context.stack.at(-1).screen, 'home');
  refresh().go('artist', { id: 10 });
  assert.equal(context.videoSession, session);
  refresh().restoreVideo();
  assert.equal(context.stack.at(-1).screen, 'video');
  assert.equal(context.videoSession, session);
  refresh().minimizeVideo();
  assert.equal(context.stack.at(-1).screen, 'artist');
});

test('background autoplay changes the session without interrupting browsing', () => {
  const { context, refresh } = navigationRuntime();
  refresh().go('video', { id: 7 });
  refresh().minimizeVideo();
  refresh().go('profile');
  refresh().replace('video', { id: 8, queueIdx: 1 });
  assert.equal(context.videoSession.id, 8);
  assert.equal(context.stack.at(-1).screen, 'profile');
  refresh().restoreVideo();
  assert.equal(context.stack.at(-1).params.id, 8);
});

test('changing video does not stack video pages; close preserves the underlying page', () => {
  const { context, refresh } = navigationRuntime();
  refresh().go('artist', { id: 1 });
  refresh().go('video', { id: 7 });
  refresh().go('video', { id: 8 });
  assert.equal(context.stack.filter(entry => entry.screen === 'video').length, 1);
  refresh().closeVideo();
  assert.equal(context.videoSession, null);
  assert.equal(context.stack.at(-1).screen, 'artist');
});

test('a cached playable URL cannot cross Telegram sessions or survive logout', async () => {
  let identity = 'isolated-session-a', calls = 0;
  const context = vm.createContext({ window: { getInitData: () => identity, API_BASE: 'https://fixture.invalid' },
    fetch: async () => ({ ok: true, json: async () => ({ url: `https://fixture.invalid/${++calls}` }) }),
    Map, Date, Error, Promise });
  vm.runInContext(player.slice(0, player.indexOf('function videoPipMode(')), context);
  await context.fetchPlayableContent(7);
  await context.fetchPlayableContent(7);
  assert.equal(calls, 1);
  identity = 'isolated-session-b';
  await context.fetchPlayableContent(7);
  assert.equal(calls, 2);
  identity = '';
  await assert.rejects(context.fetchPlayableContent(7), error => error.status === 403);
});

test('an old in-flight session cannot overwrite the new session cache', async () => {
  let identity = 'isolated-a';
  const pending = [];
  const context = vm.createContext({ window: { getInitData: () => identity, API_BASE: 'https://fixture.invalid' },
    fetch: () => new Promise(resolve => pending.push(resolve)), Map, Date, Error, Promise });
  vm.runInContext(player.slice(0, player.indexOf('function videoPipMode(')), context);
  const first = context.fetchPlayableContent(7);
  identity = 'isolated-b';
  const second = context.fetchPlayableContent(7);
  pending[1]({ ok: true, json: async () => ({ url: 'https://fixture.invalid/b' }) });
  await second;
  pending[0]({ ok: true, json: async () => ({ url: 'https://fixture.invalid/a' }) });
  await first;
  assert.equal((await context.fetchPlayableContent(7)).url, 'https://fixture.invalid/b');
});

test('ongoing playback survives profile revalidation but not confirmed denial', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app.jsx'), 'utf8');
  const start = source.indexOf('const confirmedPlaybackAccess =');
  const end = source.indexOf('// Global shorts player', start);
  const ref = { current: false };
  const context = vm.createContext({ React: { useRef: () => ref }, isPro: true, userState: { loading: false } });
  const read = () => vm.runInContext(`(() => { ${source.slice(start, end)}; return playbackAuthorized; })()`, context);
  assert.equal(read(), true);
  context.isPro = false;
  context.userState = { loading: true };
  assert.equal(read(), true);
  context.userState = { loading: false, error: { status: 503 } };
  assert.equal(read(), true);
  context.userState = { loading: false, error: { status: 401 } };
  assert.equal(read(), false);
  context.userState = { loading: false };
  assert.equal(read(), false);
  context.userState = { loading: true };
  assert.equal(read(), false);
});

test('a video already supplied by navigation does not issue a null-ID request', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../api.jsx'), 'utf8');
  const start = source.indexOf('function useVideo('), end = source.indexOf('function useShorts(', start);
  let calls = 0;
  const context = vm.createContext({ useFetch: (_key, fetcher) => fetcher(),
    apiGet: async () => { calls++; return { id: 7 }; }, normalizeVideo: value => value });
  vm.runInContext(source.slice(start, end), context);
  assert.equal(await context.useVideo(null), null);
  assert.equal(calls, 0);
  assert.equal((await context.useVideo(7)).id, 7);
  assert.equal(calls, 1);
});
