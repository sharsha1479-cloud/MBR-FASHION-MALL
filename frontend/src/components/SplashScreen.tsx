import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 500); // Wait for exit animation
    }, 2500); // Show for 2.5 seconds

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-secondary"
        >
          <div className="text-center">
            {/* Logo Animation */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                duration: 1,
                ease: "easeOut",
                delay: 0.2
              }}
              className="mb-6"
            >
              <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto rounded-full bg-maroon flex items-center justify-center shadow-2xl shadow-maroon/30">
                <span className="text-3xl sm:text-4xl font-extrabold text-secondary tracking-wider">
                  MBR
                </span>
              </div>
            </motion.div>

            {/* Brand Name */}
            <motion.h1
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                duration: 0.8,
                delay: 0.8,
                ease: "easeOut"
              }}
              className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-primary mb-2 tracking-[0.15em] uppercase"
            >
              MBR Fashion Hub
            </motion.h1>

            {/* Tagline */}
            <motion.p
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                duration: 0.6,
                delay: 1.2,
                ease: "easeOut"
              }}
              className="text-sm sm:text-base text-maroon/80 font-medium"
            >
              Where Style Meets Elegance
            </motion.p>

            {/* Loading Dots */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="mt-8 flex justify-center space-x-2"
            >
              {[0, 1, 2].map((index) => (
                <motion.div
                  key={index}
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1, 0] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: index * 0.2,
                    ease: "easeInOut"
                  }}
                  className="w-3 h-3 bg-maroon rounded-full"
                />
              ))}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;