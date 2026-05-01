import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

type ProductCardProps = {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
};

const ProductCard = ({ id, name, price, image, category }: ProductCardProps) => (
  <motion.div
    whileHover={{ y: -5 }}
    transition={{ duration: 0.3 }}
    className="group relative overflow-hidden rounded-xl bg-secondary shadow-sm transition-all duration-300 hover:shadow-lg"
  >
    <Link to={`/product/${id}`} aria-label={`View details for ${name}`}>
      <div className="aspect-square overflow-hidden bg-accent">
        <img
          src={image || 'https://via.placeholder.com/400x400?text=No+Image'}
          alt={name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
      </div>
      <div className="p-6">
        <div className="mb-2 flex items-center justify-between text-sm uppercase tracking-wider text-accent">
          <span>{category}</span>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-primary">{name}</h3>
        <p className="text-xl font-bold text-primary">Rs. {price.toFixed(0)}</p>
      </div>
    </Link>
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
      <Link
        to={`/product/${id}`}
        className="pointer-events-auto rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg transition-colors hover:bg-orange-50"
      >
        View Details
      </Link>
    </div>
  </motion.div>
);

export default ProductCard;
