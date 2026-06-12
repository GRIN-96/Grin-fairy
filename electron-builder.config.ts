import { Configuration } from 'electron-builder'

const config: Configuration = {
  appId: 'com.grinfairy.app',
  productName: 'Grin-Fairy',
  copyright: 'grin',
  directories: {
    buildResources: 'build',
    output: 'release'
  },
  files: [
    'out/**/*',
    'package.json'
  ],
  win: {
    target: [
      { target: 'nsis', arch: ['x64'] },
      { target: 'portable', arch: ['x64'] }
    ]
  },
  mac: {
    target: [
      { target: 'dmg', arch: ['x64', 'arm64'] }
    ],
    category: 'public.app-category.productivity'
  },
  linux: {
    target: ['AppImage']
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    installerIcon: 'build/icon.ico',
    uninstallerIcon: 'build/icon.ico'
  }
}

export default config
