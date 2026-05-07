import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ProductPrice } from '../utils/pricing';

const PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect width="100%25" height="100%25" fill="%23f8fafc"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%2364748b" font-family="Arial,sans-serif" font-size="32"%3ENo Image%3C/text%3E%3C/svg%3E';

type ProductCardProps = {
  id: string;
  name: string;
  price: number;
  mrp?: number | null;
  offerPrice?: number | null;
  image: string;
  category: string;
  variant?: 'default' | 'featured';
};

const ProductCard = ({ id, name, price, mrp, offerPrice, image, category, variant = 'default' }: ProductCardProps) => {
  const featured = variant === 'featured';

  return (
  <motion.div
    whileHover={{ y: -5 }}
    transition={{ duration: 0.3 }}
    className={`group relative overflow-hidden rounded-xl shadow-sm transition-all duration-300 hover:shadow-lg ${
      featured
        ? 'border border-white/15 bg-slate-950/55 text-white shadow-slate-950/30 backdrop-blur hover:border-orange-200/50 hover:bg-slate-900/75'
        : 'bg-secondary'
    }`}
  >
    <Link to={`/product/${id}`} aria-label={`View details for ${name}`}>
      <div className={`aspect-square overflow-hidden ${featured ? 'bg-white/10' : 'bg-accent'}`}>
        <img
          src={image || PLACEHOLDER_IMAGE}
          alt={name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
      </div>
      <div className="p-6">
        <div className={`mb-2 flex items-center justify-between text-sm uppercase tracking-wider ${featured ? 'text-orange-200' : 'text-accent'}`}>
          <span>{category}</span>
        </div>
        <h3 className={`mb-2 text-lg font-semibold ${featured ? 'text-white' : 'text-primary'}`}>{name}</h3>
        <ProductPrice product={{ price, mrp, offerPrice }} tone={featured ? 'light' : 'dark'} />
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
};

export default ProductCard;
