import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Hero = () => (
  <section className="relative h-[34vh] min-h-[240px] overflow-hidden bg-primary text-secondary sm:flex sm:h-[50vh] sm:min-h-0 sm:items-center sm:justify-center md:h-screen">
    <div className="absolute inset-0 bg-cover bg-center sm:bg-center" style={{ backgroundImage: "image-set(url('/images/site/hero-fashion-store.avif') type('image/avif'), url('/images/site/hero-fashion-store.webp') type('image/webp'), url('/images/site/hero-fashion-store.jpg') type('image/jpeg'))" }}></div>
    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,18,32,0.1)_0%,rgba(11,18,32,0.52)_45%,rgba(11,18,32,0.92)_100%)] sm:bg-gradient-to-r sm:from-slate-950/80 sm:via-slate-950/55 sm:to-slate-950/35"></div>
    <div className="absolute inset-x-3 bottom-3 top-3 rounded-[1.1rem] ring-1 ring-white/20 sm:hidden"></div>
    <div className="relative z-10 flex h-full max-w-4xl flex-col justify-end px-5 pb-5 text-left sm:mx-auto sm:block sm:h-auto sm:px-6 sm:pb-0 sm:text-center">
      <motion.p
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="mb-1.5 inline-flex w-fit rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-white shadow-lg backdrop-blur sm:hidden"
      >
        New season edit
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mb-1.5 max-w-[17rem] text-[1.65rem] font-black leading-7 text-white sm:mx-auto sm:mb-6 sm:max-w-none sm:text-4xl sm:text-black md:text-5xl lg:text-7xl [text-shadow:0_3px_18px_rgba(0,0,0,0.42)] sm:[text-shadow:0_2px_14px_rgba(255,255,255,0.9)]"
      >
        The Great Looks Distracts Everyone
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="mb-3 max-w-[16rem] text-[11px] font-medium leading-4 text-white/88 sm:mx-auto sm:mb-8 sm:max-w-none sm:text-base sm:text-black md:text-xl lg:text-2xl [text-shadow:0_2px_12px_rgba(0,0,0,0.35)] sm:[text-shadow:0_2px_12px_rgba(255,255,255,0.9)]"
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
          className="inline-flex items-center rounded-full bg-white px-4 py-2 text-[11px] font-black text-primary shadow-xl shadow-black/25 transition-all duration-300 hover:bg-accent hover:text-primary sm:inline-block sm:bg-secondary sm:px-8 sm:py-4 sm:text-base sm:shadow-primary/20 sm:hover:scale-105 md:text-lg"
        >
          Shop Now
        </Link>
      </motion.div>
    </div>
  </section>
);

export default Hero;
