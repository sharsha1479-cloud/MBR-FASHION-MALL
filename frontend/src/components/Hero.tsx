import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Hero = () => (
  <section className="relative h-[80vh] sm:h-screen flex items-center justify-center bg-primary text-secondary overflow-hidden">
    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80')" }}></div>
    <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/55 to-slate-950/35"></div>
    <div className="relative z-10 text-center max-w-4xl mx-auto px-4 sm:px-6">
      <motion.h1
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-3 sm:mb-6 text-black [text-shadow:0_2px_18px_rgba(255,255,255,0.95)]"
      >
        Modern Wardrobe Essentials
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="text-sm sm:text-base md:text-xl lg:text-2xl mb-6 sm:mb-8 text-black [text-shadow:0_2px_14px_rgba(255,255,255,0.9)]"
      >
        Discover premium shirts, tees, and denim for the contemporary man.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
      >
        <Link
          to="/products"
          className="inline-block bg-secondary text-primary px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base md:text-lg font-semibold rounded-full hover:bg-accent hover:text-primary transition-all duration-300 transform hover:scale-105"
        >
          Shop Now
        </Link>
      </motion.div>
    </div>
  </section>
);

export default Hero;
