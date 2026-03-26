'use client'

import { useState } from 'react'
import { Chat } from '@pubnub/chat'
import { AnimatePresence, motion } from 'framer-motion'
import LoginPage from './pages/loginPage'
import LiveStreamPage from './pages/liveStreamPage'
import { WalkthroughProvider } from './walkthrough/WalkthroughProvider'
import WalkthroughOverlay from './walkthrough/WalkthroughOverlay'
import WalkthroughLauncher from './walkthrough/WalkthroughLauncher'

const STREAM_NAME = 'soccer-live-demo'

export default function Home() {
  const [chat, setChat] = useState<Chat | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const isLoggedIn = !!userId && !!chat

  return (
    <AnimatePresence mode="wait">
      {!isLoggedIn ? (
        <motion.div
          key="login"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full h-full"
        >
          <LoginPage
            setChat={setChat}
            setUserId={setUserId}
            onLoginStart={() => setIsLoggingIn(true)}
          />
        </motion.div>
      ) : (
        <motion.div
          key="stream"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-full h-full"
        >
          <WalkthroughProvider>
            <LiveStreamPage
              chat={chat}
              userId={userId}
              streamName={STREAM_NAME}
              onLeave={() => {
                setUserId(null)
                setChat(null)
                setIsLoggingIn(false)
              }}
            />
            <WalkthroughOverlay />
            <WalkthroughLauncher />
          </WalkthroughProvider>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
