import type { ConfigProviderProps } from 'antd'

export const antdProviderProps: ConfigProviderProps = {
  theme: {
    token: {
      // Seed Token - WhatsApp Green
      colorPrimary: '#24d366',
      borderRadius: 1000,

      colorLink: '#24d366',
      // Alias Token
      colorBgContainer: '#ffffff',

      // Typography
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",

      // Colors from Figma design
      colorText: '#111b21',
      colorTextSecondary: '#494949',
      colorBgLayout: '#fdfdfd',
    },
    components: {
      Button: {
        borderRadius: 100,
        controlHeight: 46,
        paddingInline: 32,
      },
      Input: {
        borderRadius: 100,
        controlHeight: 52,
        paddingInline: 24,
      },
      Card: {
        borderRadiusLG: 24,
        boxShadowTertiary: '0px 0px 1px 0px rgba(0,0,0,0.4)',
      },
    },
  },
}

// CSS Variables for design tokens
export const cssVariables = {
  '--background': '#fdfdfd',
  '--paper': '#ffffff',
  '--primary': '#24d366',
  '--text-primary': '#111b21',
  '--text-secondary': '#494949',
  '--colors-orange': '#ff9500',
  '--colors-purple': '#af52de',
}
