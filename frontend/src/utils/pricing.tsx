export type PricedProduct = {
  price?: number | string | null;
  mrp?: number | string | null;
  offerPrice?: number | string | null;
};

export const getEffectivePrice = (product: PricedProduct) => {
  const offerPrice = Number(product.offerPrice ?? product.price ?? 0);
  return Number.isFinite(offerPrice) ? offerPrice : 0;
};

export const getMrp = (product: PricedProduct) => {
  const mrp = Number(product.mrp ?? 0);
  return Number.isFinite(mrp) ? mrp : 0;
};

export const hasDiscount = (product: PricedProduct) => {
  const offerPrice = getEffectivePrice(product);
  const mrp = getMrp(product);
  return mrp > offerPrice && offerPrice > 0;
};

export const formatPrice = (value: number) => `Rs. ${value.toFixed(0)}`;

export const ProductPrice = ({
  product,
  size = 'md',
  quantity = 1,
  align = 'left',
  tone = 'dark',
}: {
  product: PricedProduct;
  size?: 'sm' | 'md' | 'lg';
  quantity?: number;
  align?: 'left' | 'right';
  tone?: 'dark' | 'light';
}) => {
  const offerPrice = getEffectivePrice(product) * quantity;
  const mrp = getMrp(product) * quantity;
  const discounted = hasDiscount(product);
  const sizeClass = {
    sm: 'text-sm',
    md: 'text-base sm:text-xl',
    lg: 'text-2xl sm:text-3xl',
  }[size];

  return (
    <div className={`flex flex-wrap items-baseline gap-x-2 gap-y-1 ${align === 'right' ? 'justify-end text-right' : ''}`}>
      {discounted && (
        <span className={`text-xs font-semibold line-through sm:text-sm ${tone === 'light' ? 'text-slate-300' : 'text-slate-400'}`}>
          {formatPrice(mrp)}
        </span>
      )}
      <span className={`${sizeClass} font-bold ${tone === 'light' ? 'text-white' : 'text-slate-900'}`}>
        {formatPrice(offerPrice)}
      </span>
    </div>
  );
};
