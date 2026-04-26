const test = require('node:test');
const assert = require('node:assert/strict');

const {
  TITLE_BAR_HEIGHT,
  getBrowserWindowAppearanceOptions,
  getTitleBarOverlayOptions,
} = require('./window-appearance.cjs');

test('uses the desktop headbar color for the dark window controls overlay', () => {
  assert.deepEqual(getTitleBarOverlayOptions('dark'), {
    color: '#090a0c',
    symbolColor: '#f3f4f6',
    height: TITLE_BAR_HEIGHT,
  });
});

test('uses the desktop headbar color for the light window controls overlay', () => {
  assert.deepEqual(getTitleBarOverlayOptions('light'), {
    color: '#ece4d5',
    symbolColor: '#1f2430',
    height: TITLE_BAR_HEIGHT,
  });
});

test('enables a colored title bar overlay on Windows and Linux', () => {
  assert.deepEqual(getBrowserWindowAppearanceOptions('win32', 'dark'), {
    backgroundColor: '#090a0c',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#090a0c',
      symbolColor: '#f3f4f6',
      height: TITLE_BAR_HEIGHT,
    },
  });

  assert.equal(getBrowserWindowAppearanceOptions('linux', 'dark').titleBarStyle, 'hidden');
});

test('keeps the macOS inset title bar behavior', () => {
  assert.deepEqual(getBrowserWindowAppearanceOptions('darwin', 'dark'), {
    backgroundColor: '#090a0c',
    titleBarStyle: 'hiddenInset',
  });
});
