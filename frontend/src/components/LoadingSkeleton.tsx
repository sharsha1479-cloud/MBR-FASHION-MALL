import { motion } from 'framer-motion';

const LoadingSkeleton = () => (
  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
    {Array.from({ length: 8 }).map((_, index) => (
      <motion.div
        key={index}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.1 }}
        className="rounded-xl bg-accent p-6 shadow-sm"
      >
        <div className="aspect-square bg-primary/10 rounded-lg mb-4 animate-pulse"></div>
        <div className="h-4 bg-primary/10 rounded mb-2 animate-pulse"></div>
        <div className="h-6 bg-primary/10 rounded animate-pulse"></div>
      </motion.div>
    ))}
  </div>
);

export default LoadingSkeleton;
