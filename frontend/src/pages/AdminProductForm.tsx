import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { createProduct, getProductImageUrl, updateProduct } from '../services/product';
import { fetchCategories } from '../services/category';
import { categories as defaultCategories } from '../constants/categories';

type VariantForm = {
  id?: string;
  colorName: string;
  colorCode: string;
  mrp: number | '';
  offerPrice: number | '';
  sizeStocks: { size: string; stock: number | '' }[];
  existingImages: string[];
  images: File[];
  previews: { file: File; url: string }[];
};

const parseNumberInput = (value: string) => (value === '' ? '' : Number(value));
const toNumber = (value: number | '') => (value === '' ? 0 : Number(value));

const createEmptyVariant = (): VariantForm => ({
  colorName: 'Default',
  colorCode: '#94a3b8',
  mrp: 0,
  offerPrice: 0,
  sizeStocks: [
    { size: 'S', stock: 0 },
    { size: 'M', stock: 0 },
    { size: 'L', stock: 0 },
  ],
  existingImages: [],
  images: [],
  previews: [],
});

const AdminProductForm = () => {
  const { id } = useParams();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('shirts');
  const [variants, setVariants] = useState<VariantForm[]>([createEmptyVariant()]);
  const [categories, setCategories] = useState<any[]>(defaultCategories);
  const [isTrending, setIsTrending] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const loadProduct = async () => {
      if (!id) return;
      const response = await api.get(`/products/${id}`);
      const product = response.data;
      setName(product.name);
      setDescription(product.description || '');
      setCategory(product.category);
      setIsTrending(!!product.isTrending);
      setVariants((product.variants?.length ? product.variants : [product]).map((variant: any) => ({
        id: variant.id,
        colorName: variant.colorName || 'Default',
        colorCode: variant.colorCode || '#94a3b8',
        mrp: Number(variant.mrp ?? variant.price ?? 0),
        offerPrice: Number(variant.offerPrice ?? variant.price ?? 0),
        sizeStocks: (variant.sizeStocks?.length
          ? variant.sizeStocks
          : (variant.sizes || []).map((size: string, sizeIndex: number) => ({
              size,
              stock: Number(variant.stock ?? 0),
            }))).map((item: any) => ({
              size: String(item.size || ''),
              stock: Number(item.stock || 0),
            })),
        existingImages: variant.images || [],
        images: [],
        previews: [],
      })));
    };
    loadProduct();
  }, [id]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const result = await fetchCategories();
        const mergedCategories = [...defaultCategories];
        if (Array.isArray(result)) {
          result.forEach((item) => {
            if (!mergedCategories.some((categoryItem) => categoryItem.value === item.value)) {
              mergedCategories.push(item);
            }
          });
        }
        setCategories(mergedCategories);
        if (!id && mergedCategories.length > 0) setCategory(mergedCategories[0].value);
      } catch {
        setCategories(defaultCategories);
        if (!id && defaultCategories.length > 0) setCategory(defaultCategories[0].value);
      }
    };

    loadCategories();
  }, [id]);

  useEffect(() => (
    () => variants.forEach((variant) => variant.previews.forEach(({ url }) => URL.revokeObjectURL(url)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), []);

  const updateVariant = (index: number, updates: Partial<VariantForm>) => {
    setVariants((current) => current.map((variant, variantIndex) => (
      variantIndex === index ? { ...variant, ...updates } : variant
    )));
  };

  const addVariant = () => {
    setVariants((current) => [...current, { ...createEmptyVariant(), colorName: `Color ${current.length + 1}` }]);
  };

  const removeVariant = (index: number) => {
    if (variants.length === 1) {
      setMessage('A product must have at least one variant.');
      return;
    }
    setVariants((current) => {
      current[index].previews.forEach(({ url }) => URL.revokeObjectURL(url));
      return current.filter((_, variantIndex) => variantIndex !== index);
    });
  };

  const updateVariantSize = (variantIndex: number, sizeIndex: number, updates: Partial<{ size: string; stock: number | '' }>) => {
    setVariants((current) => current.map((variant, index) => (
      index === variantIndex
        ? {
            ...variant,
            sizeStocks: variant.sizeStocks.map((sizeRow, rowIndex) => (
              rowIndex === sizeIndex ? { ...sizeRow, ...updates } : sizeRow
            )),
          }
        : variant
    )));
  };

  const addVariantSize = (variantIndex: number) => {
    setVariants((current) => current.map((variant, index) => (
      index === variantIndex
        ? { ...variant, sizeStocks: [...variant.sizeStocks, { size: '', stock: 0 }] }
        : variant
    )));
  };

  const removeVariantSize = (variantIndex: number, sizeIndex: number) => {
    setVariants((current) => current.map((variant, index) => (
      index === variantIndex
        ? { ...variant, sizeStocks: variant.sizeStocks.filter((_, rowIndex) => rowIndex !== sizeIndex) }
        : variant
    )));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');

    const missingImages = variants.some((variant) => variant.existingImages.length + variant.images.length === 0);
    if (missingImages) {
      setMessage('Each variant needs at least one image.');
      return;
    }

    const missingSizes = variants.some((variant) => variant.sizeStocks.length === 0 || variant.sizeStocks.some((item) => !item.size.trim()));
    if (missingSizes) {
      setMessage('Each variant needs at least one size with a size name.');
      return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('isTrending', isTrending ? 'true' : 'false');
    formData.append('variants', JSON.stringify(variants.map((variant) => ({
      id: variant.id,
      colorName: variant.colorName,
      colorCode: variant.colorCode,
      mrp: toNumber(variant.mrp),
      offerPrice: toNumber(variant.offerPrice),
      price: toNumber(variant.offerPrice),
      stock: variant.sizeStocks.reduce((sum, item) => sum + toNumber(item.stock), 0),
      sizes: variant.sizeStocks.map((item) => item.size).join(','),
      sizeStocks: variant.sizeStocks.map((item) => ({ ...item, stock: toNumber(item.stock) })),
      existingImages: variant.existingImages,
    }))));
    variants.forEach((variant, index) => {
      variant.images.slice(0, 4).forEach((file) => formData.append(`variantImages_${index}`, file));
    });

    try {
      if (id) {
        await updateProduct(id, formData);
        setMessage('Product updated successfully');
      } else {
        await createProduct(formData);
        setMessage('Product created successfully');
      }
      navigate('/admin');
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Something went wrong while saving product.');
    }
  };

  return (
    <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-semibold text-slate-900">{id ? 'Edit product' : 'Create product'}</h1>
      {message && <p className="mt-4 rounded-2xl bg-slate-100 p-4 text-sm text-slate-700">{message}</p>}
      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700">Name</label>
          <input value={name} onChange={(event) => setName(event.target.value)} required className="mt-2 w-full p-3" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700">Description</label>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} required className="mt-2 w-full p-3" rows={4} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-slate-700">Category</label>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 w-full p-3">
              {categories.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-3 rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
            <input
              type="checkbox"
              checked={isTrending}
              onChange={(event) => setIsTrending(event.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-maroon focus:ring-maroon/20"
            />
            Mark as trending style
          </label>
        </div>

        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-slate-900">Color variants</h2>
          <button type="button" onClick={addVariant} className="rounded-full border border-maroon bg-white px-4 py-2 text-sm font-semibold text-maroon hover:bg-maroon/10">
            Add variant
          </button>
        </div>

        <div className="space-y-4">
          {variants.map((variant, index) => (
            <div key={variant.id || index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full border border-slate-300" style={{ backgroundColor: variant.colorCode }} />
                  <p className="font-semibold text-slate-900">Variant {index + 1}</p>
                </div>
                <button type="button" onClick={() => removeVariant(index)} className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                  Remove
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Color name</label>
                  <input value={variant.colorName} onChange={(event) => updateVariant(index, { colorName: event.target.value })} required className="mt-2 w-full p-3" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Color code</label>
                  <div className="mt-2 flex gap-2">
                    <input type="color" value={variant.colorCode} onChange={(event) => updateVariant(index, { colorCode: event.target.value })} className="h-12 w-14 rounded-lg border border-slate-300 bg-white p-1" />
                    <input value={variant.colorCode} onChange={(event) => updateVariant(index, { colorCode: event.target.value })} className="w-full p-3" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700">MRP</label>
                  <input type="number" min={0} value={variant.mrp} onChange={(event) => updateVariant(index, { mrp: parseNumberInput(event.target.value) })} required className="mt-2 w-full p-3" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Offer price</label>
                  <input type="number" min={0} value={variant.offerPrice} onChange={(event) => updateVariant(index, { offerPrice: parseNumberInput(event.target.value) })} required className="mt-2 w-full p-3" />
                </div>
                <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Sizes and stock</label>
                      <p className="mt-1 text-xs text-slate-500">Total stock: {variant.sizeStocks.reduce((sum, item) => sum + toNumber(item.stock), 0)}</p>
                    </div>
                    <button type="button" onClick={() => addVariantSize(index)} className="rounded-full border border-maroon px-3 py-2 text-xs font-semibold text-maroon">
                      Add size
                    </button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {variant.sizeStocks.map((sizeRow, sizeIndex) => (
                      <div key={sizeIndex} className="grid grid-cols-[minmax(0,1fr)_120px_auto] gap-2">
                        <input
                          value={sizeRow.size}
                          onChange={(event) => updateVariantSize(index, sizeIndex, { size: event.target.value })}
                          required
                          placeholder="Size"
                          className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm"
                        />
                        <input
                          type="number"
                          min={0}
                          value={sizeRow.stock}
                          onChange={(event) => updateVariantSize(index, sizeIndex, { stock: parseNumberInput(event.target.value) })}
                          required
                          className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeVariantSize(index, sizeIndex)}
                          className="rounded-full bg-red-100 px-3 py-2 text-xs font-semibold text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700">Variant images</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => {
                      const files = event.target.files;
                      if (!files) return;
                      const newFiles = Array.from(files);
                      const total = variant.existingImages.length + variant.images.length + newFiles.length;
                      if (total > 4) {
                        setMessage('Please select no more than 4 images per variant.');
                        return;
                      }
                      updateVariant(index, {
                        images: [...variant.images, ...newFiles],
                        previews: [...variant.previews, ...newFiles.map((file) => ({ file, url: URL.createObjectURL(file) }))],
                      });
                    }}
                    className="mt-2 w-full"
                  />
                  {(variant.previews.length > 0 || variant.existingImages.length > 0) && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-4">
                      {variant.previews.map(({ file, url }) => (
                        <div key={file.name + file.size} className="relative overflow-hidden rounded-2xl border border-slate-200">
                          <img src={url} alt={file.name} className="h-20 w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              URL.revokeObjectURL(url);
                              updateVariant(index, {
                                images: variant.images.filter((item) => item !== file),
                                previews: variant.previews.filter((item) => item.file !== file),
                              });
                            }}
                            className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-xs text-slate-900 shadow"
                          >
                            x
                          </button>
                        </div>
                      ))}
                      {variant.existingImages.map((imageUrl) => (
                        <div key={imageUrl} className="relative overflow-hidden rounded-2xl border border-slate-200">
                          <img src={getProductImageUrl(imageUrl)} alt="Existing product" className="h-20 w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => updateVariant(index, { existingImages: variant.existingImages.filter((item) => item !== imageUrl) })}
                            className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-xs text-slate-900 shadow"
                          >
                            x
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button type="submit" className="rounded-full bg-maroon px-5 py-4 text-sm font-semibold text-white shadow hover:bg-maroon/90">
          Save product
        </button>
      </form>
    </div>
  );
};

export default AdminProductForm;
