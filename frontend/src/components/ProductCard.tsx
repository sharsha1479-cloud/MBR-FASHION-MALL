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
    className={`group relative h-full overflow-hidden rounded-xl shadow-sm transition-all duration-300 hover:shadow-lg ${
      featured
        ? 'border border-[#ead7bb] bg-gradient-to-b from-[#fffaf2] via-white to-[#f8efe2] text-slate-950 shadow-xl shadow-maroon/20 hover:border-[#d7b36a] hover:shadow-2xl hover:shadow-maroon/25'
        : 'bg-secondary'
    }`}
  >
    <Link to={`/product/${id}`} aria-label={`View details for ${name}`} className="flex h-full flex-col">
      <div className={`relative aspect-square shrink-0 overflow-hidden ${featured ? 'bg-[#f4eadc]' : 'bg-accent'}`}>
        <img
          src={image || PLACEHOLDER_IMAGE}
          alt={name}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
        {featured && (
          <span className="absolute left-2.5 top-2.5 rounded-full border border-white/70 bg-white/90 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-maroon shadow-sm sm:left-4 sm:top-4 sm:text-[10px]">
            New
          </span>
        )}
      </div>
      {/* Keep this body height fixed so mixed product names/prices do not disturb grid layout. */}
      <div className={`flex h-[126px] flex-1 flex-col overflow-hidden p-2.5 sm:h-[176px] sm:p-6 ${featured ? 'relative' : ''}`}>
        {featured && <div className="mb-2 h-px w-12 bg-gradient-to-r from-[#c79a43] to-transparent" />}
        <div className={`mb-1 flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.16em] sm:mb-2 sm:text-sm sm:tracking-wider ${featured ? 'text-maroon/75' : 'text-slate-500'}`}>
          <span className="truncate">{category}</span>
        </div>
        <h3 className={`mb-1.5 text-sm font-semibold leading-5 line-clamp-2 sm:mb-2 sm:text-lg sm:leading-7 ${featured ? 'text-slate-950' : 'text-primary'}`}>{name}</h3>
        <div className="mt-auto min-h-[32px] sm:min-h-[36px]">
          <ProductPrice product={{ price, mrp, offerPrice }} tone="dark" />
        </div>
      </div>
    </Link>
    <div className={`pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${featured ? 'bg-maroon/18 backdrop-blur-[1px]' : 'bg-black/45'}`}>
      <Link
        to={`/product/${id}`}
        className={`pointer-events-auto rounded-full px-6 py-3 text-sm font-semibold shadow-lg transition-colors ${
          featured
            ? 'border border-[#d7b36a] bg-white text-maroon hover:bg-[#fff7e8]'
            : 'bg-white text-slate-900 hover:bg-maroon/10'
        }`}
      >
        View Details
      </Link>
    </div>
  </motion.div>
  );
};

export default ProductCard;
