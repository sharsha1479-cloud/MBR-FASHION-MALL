import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { createProduct, getProductImageUrl, updateProduct } from '../services/product';
import { fetchCategories } from '../services/category';
import { categories as defaultCategories } from '../constants/categories';

const AdminProductForm = () => {
  const { id } = useParams();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('shirts');
  const [mrp, setMrp] = useState(0);
  const [offerPrice, setOfferPrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [sizes, setSizes] = useState('S,M,L');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<{ file: File; url: string }[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
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
      setMrp(Number(product.mrp ?? product.price ?? 0));
      setOfferPrice(Number(product.offerPrice ?? product.price ?? 0));
      setStock(product.stock);
      setSizes(product.sizes.join(','));
      setIsTrending(!!product.isTrending);
      setExistingImages(product.images || []);
    };
    loadProduct();
  }, [id]);

  useEffect(() => {
    return () => {
      imagePreviews.forEach(({ url }) => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const result = await fetchCategories();
        if (Array.isArray(result) && result.length > 0) {
          const mergedCategories = [...defaultCategories];
          result.forEach((category) => {
            if (!mergedCategories.some((item) => item.value === category.value)) {
              mergedCategories.push(category);
            }
          });
          setCategories(mergedCategories);
          if (!id && mergedCategories.length > 0) {
            setCategory(mergedCategories[0].value);
          }
        } else {
          setCategories(defaultCategories);
          if (!id && defaultCategories.length > 0) {
            setCategory(defaultCategories[0].value);
          }
        }
      } catch (error) {
        console.error('Failed to load categories', error);
        setCategories(defaultCategories);
        if (!id && defaultCategories.length > 0) {
          setCategory(defaultCategories[0].value);
        }
      }
    };

    loadCategories();
  }, [id]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('mrp', mrp.toString());
    formData.append('offerPrice', offerPrice.toString());
    formData.append('price', offerPrice.toString());
    formData.append('stock', stock.toString());
    formData.append('sizes', sizes);
    formData.append('isTrending', isTrending ? 'true' : 'false');
    if (images.length > 0) {
      images.slice(0, 4).forEach((file) => formData.append('images', file));
    }

    try {
      if (id) {
        await updateProduct(id, formData);
        setMessage('Product updated successfully');
      } else {
        await createProduct(formData);
        setMessage('Product created successfully');
      }
      navigate('/admin');
    } catch (error) {
      setMessage('Something went wrong while saving product.');
    }
  };

  return (
    <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
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
              {(categories.length > 0 ? categories : defaultCategories).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700">MRP</label>
            <input type="number" min={0} value={mrp} onChange={(event) => setMrp(Number(event.target.value))} required className="mt-2 w-full p-3" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-slate-700">Offer price</label>
            <input type="number" min={0} value={offerPrice} onChange={(event) => setOfferPrice(Number(event.target.value))} required className="mt-2 w-full p-3" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700">Stock</label>
            <input type="number" min={0} value={stock} onChange={(event) => setStock(Number(event.target.value))} required className="mt-2 w-full p-3" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700">Sizes</label>
            <input value={sizes} onChange={(event) => setSizes(event.target.value)} required className="mt-2 w-full p-3" placeholder="S,M,L,XL" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-3xl border border-slate-300 bg-white px-4 py-3 shadow-sm">
            <input
              id="trending"
              type="checkbox"
              checked={isTrending}
              onChange={(event) => setIsTrending(event.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
            />
            <label htmlFor="trending" className="text-sm font-semibold text-slate-700">
              Mark as trending style
            </label>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700">Product images</label>
            <input
              name="images"
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                const files = event.target.files;
                if (!files) return;

                const newFiles = Array.from(files);
                const combinedFiles = [...images, ...newFiles];
                if (combinedFiles.length > 4) {
                  setMessage('Please select no more than 4 images in total.');
                  return;
                }

                const previewFiles = newFiles.map((file) => ({
                  file,
                  url: URL.createObjectURL(file),
                }));

                setMessage('');
                setImages(combinedFiles);
                setImagePreviews((current) => [...current, ...previewFiles]);
              }}
              className="mt-2 w-full"
            />
            <p className="mt-2 text-xs text-slate-500">You can upload up to 4 images. Selecting additional files will add them to the current upload list.</p>
            {(imagePreviews.length > 0 || existingImages.length > 0) && (
              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                {imagePreviews.map(({ file, url }) => (
                  <div key={file.name + file.size} className="relative overflow-hidden rounded-2xl border border-slate-200">
                    <img src={url} alt={file.name} className="h-20 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setImages((current) => current.filter((item) => item !== file));
                        setImagePreviews((current) => current.filter((item) => item.file !== file));
                        URL.revokeObjectURL(url);
                      }}
                      className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-xs text-slate-900 shadow"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {imagePreviews.length === 0 && existingImages.map((imageUrl) => (
                  <img
                    key={imageUrl}
                    src={getProductImageUrl(imageUrl)}
                    alt="Existing product"
                    className="h-20 w-full rounded-2xl object-cover border border-slate-200"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
        <button type="submit" className="rounded-full bg-orange-600 px-5 py-4 text-sm font-semibold text-white shadow hover:bg-orange-700">
          Save product
        </button>
      </form>
    </div>
  );
};

export default AdminProductForm;
