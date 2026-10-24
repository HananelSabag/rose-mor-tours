import { combinePresetAndAppleSplashScreens, defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Must equal the logo's background, so padding and splash margins are seamless.
const BRAND = '#08727a'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: combinePresetAndAppleSplashScreens(
    {
      ...minimal2023Preset,
      // The source is already full-bleed with its artwork in the safe zone, so no white frame.
      maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: { background: BRAND } },
      apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: BRAND } },
    },
    {
      padding: 0.36,
      resizeOptions: { background: BRAND, fit: 'contain' },
      linkMediaOptions: { log: false, addMediaScreen: true, basePath: '/', xhtml: false },
      png: { compressionLevel: 9, quality: 70 },
      // The default namer adds "light-" only when the link generator passes dark=false, so the
      // <link> tags and the generated files disagree. One namer for both keeps them in sync.
      name: (landscape, size) => `apple-splash-${landscape ? 'landscape' : 'portrait'}-${size.width}x${size.height}.png`,
    },
    // iPhones from the X onward plus current iPads; sizes shared by several models are generated once.
    [
      'iPhone 17 Pro Max',
      'iPhone 17 Pro',
      'iPhone Air',
      'iPhone 17',
      'iPhone 16 Pro Max',
      'iPhone 16 Pro',
      'iPhone 16 Plus',
      'iPhone 16',
      'iPhone 16e',
      'iPhone 15 Pro Max',
      'iPhone 15 Pro',
      'iPhone 14 Plus',
      'iPhone 13 mini',
      'iPhone 11 Pro Max',
      'iPhone 11',
      'iPhone X',
      'iPhone SE 4.7"',
      'iPad Pro 12.9"',
      'iPad Pro 11"',
      'iPad Air 10.9"',
      'iPad 10.2"',
      'iPad mini 8.3"',
    ],
  ),
  images: ['public/logo.svg'],
})
