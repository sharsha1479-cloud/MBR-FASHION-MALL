import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Hero = () => (
  <section className="relative h-screen flex items-center justify-center bg-primary text-secondary overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/50"></div>
    <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
      <motion.h1
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-5xl md:text-7xl font-bold mb-6"
      >
        Modern Wardrobe Essentials
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="text-xl md:text-2xl mb-8 text-accent"
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
          className="inline-block bg-secondary text-primary px-8 py-4 text-lg font-semibold rounded-full hover:bg-accent hover:text-primary transition-all duration-300 transform hover:scale-105"
        >
          Shop Now
        </Link>
      </motion.div>
    </div>
    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80')" }}></div>
  </section>
);

export default Hero;
