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
      setTimeout(onComplete, 500);
    }, 2500);

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
            <motion.div
              initial={{ scale: 8, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{
                duration: 1.15,
                ease: [0.22, 1, 0.36, 1],
                delay: 0.1,
              }}
              className="mb-6"
            >
              <picture>
                <source srcSet="/mbrlogo.webp" type="image/webp" />
                <img
                  src="/mbrlogo.png"
                  alt="MBR The Fashion Hub"
                  width="320"
                  height="320"
                  decoding="async"
                  className="mx-auto h-auto w-56 object-contain sm:w-72 md:w-80"
                />
              </picture>
            </motion.div>

            <motion.p
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                duration: 0.7,
                delay: 1.25,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="text-xl font-extrabold tracking-[0.08em] text-primary sm:text-2xl md:text-3xl"
            >
              Men&apos;s Fashion Starts Here
            </motion.p>

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
                    ease: 'easeInOut',
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
