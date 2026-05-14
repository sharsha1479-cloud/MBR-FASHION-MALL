import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

type ComboCardProps = {
  name: string;
  description?: string | null;
  mrp?: number | null;
  offerPrice: number;
  image: string;
  stock?: number | null;
  link?: string | null;
};

const ComboCard = ({ name, description, mrp, offerPrice, image, stock, link }: ComboCardProps) => {
  const inStock = Number(stock ?? 0) > 0;

  const content = (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25 }}
      className="group h-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-lg sm:rounded-2xl"
    >
      <div className="aspect-[4/3] overflow-hidden bg-slate-100">
        <img src={image} alt={name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
      </div>
      <div className="p-2.5 sm:p-5">
        <p className="mb-1 text-[8px] font-bold uppercase tracking-[0.18em] text-maroon sm:mb-2 sm:text-[10px] sm:tracking-[0.26em]">Combo offer</p>
        <h3 className="line-clamp-2 text-sm font-bold leading-5 text-slate-950 sm:text-xl">{name}</h3>
        {stock !== undefined && (
          <p className={`mt-1 text-[10px] font-semibold sm:text-xs ${inStock ? 'text-green-700' : 'text-red-700'}`}>
            {inStock ? `${stock} in stock` : 'Out of stock'}
          </p>
        )}
        {description && <p className="mt-1.5 line-clamp-2 text-[10px] leading-4 text-slate-600 sm:mt-2 sm:text-sm sm:leading-5">{description}</p>}
        <div className="mt-2 flex flex-wrap items-end gap-1.5 sm:mt-4 sm:gap-2">
          <span className="text-sm font-bold text-slate-950 sm:text-xl">Rs. {Number(offerPrice).toFixed(2)}</span>
          {mrp && mrp > offerPrice && (
            <span className="pb-0.5 text-[10px] font-semibold text-slate-400 line-through sm:text-sm">Rs. {Number(mrp).toFixed(2)}</span>
          )}
        </div>
      </div>
    </motion.article>
  );

  if (!link) return content;
  if (/^https?:\/\//.test(link)) {
    return <a href={link} target="_blank" rel="noreferrer" className="block h-full">{content}</a>;
  }

  return <Link to={link} className="block h-full">{content}</Link>;
};

export default ComboCard;
