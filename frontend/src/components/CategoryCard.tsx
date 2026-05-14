import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CATEGORY_PLACEHOLDER_IMAGE } from '../services/category';

type CategoryCardProps = {
  label: string;
  value: string;
  image: string;
  to?: string;
};

const CategoryCard = ({ label, value, image, to }: CategoryCardProps) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    transition={{ duration: 0.3 }}
    className="group relative overflow-hidden rounded-xl bg-accent shadow-sm hover:shadow-lg transition-all duration-300"
  >
    <Link to={to ?? `/products?category=${value}`}>
      <div className="aspect-square overflow-hidden">
        <img
          src={image || CATEGORY_PLACEHOLDER_IMAGE}
          alt={label}
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = CATEGORY_PLACEHOLDER_IMAGE;
          }}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
      </div>
      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
        <h3 className="text-2xl font-bold text-secondary">{label}</h3>
      </div>
    </Link>
  </motion.div>
);

export default CategoryCard;
