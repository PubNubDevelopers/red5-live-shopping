import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})


export const metadata: Metadata = {
  title: 'Soccer Live — PubNub + Red5 Pro Demo',
  description:
    'Interactive live streaming demo with real-time chat, reactions, and in-play betting — powered by PubNub and Red5 Pro.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} antialiased bg-black text-white`}>
        {children}
        <Script
          src="https://darryncampbell-pubnub.github.io/pubnub-demo-utils/js/interactive-demo-interface/v2/demo-interface.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}
