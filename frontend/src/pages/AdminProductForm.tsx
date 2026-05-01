import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { createProduct, updateProduct } from '../services/product';

const AdminProductForm = () => {
  const { id } = useParams();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('shirts');
  const [price, setPrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [sizes, setSizes] = useState('S,M,L');
  const [images, setImages] = useState<FileList | null>(null);
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
      setPrice(product.price);
      setStock(product.stock);
      setSizes(product.sizes.join(','));
    };
    loadProduct();
  }, [id]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('price', price.toString());
    formData.append('stock', stock.toString());
    formData.append('sizes', sizes);
    if (images) {
      Array.from(images).forEach((file) => formData.append('images', file));
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
              <option value="shirts">Shirts</option>
              <option value="t-shirts">T-Shirts</option>
              <option value="jeans">Jeans</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700">Price</label>
            <input type="number" min={0} value={price} onChange={(event) => setPrice(Number(event.target.value))} required className="mt-2 w-full p-3" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-slate-700">Stock</label>
            <input type="number" min={0} value={stock} onChange={(event) => setStock(Number(event.target.value))} required className="mt-2 w-full p-3" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700">Sizes</label>
            <input value={sizes} onChange={(event) => setSizes(event.target.value)} required className="mt-2 w-full p-3" placeholder="S,M,L,XL" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700">Image</label>
          <input type="file" accept="image/*" onChange={(event) => setImages(event.target.files)} className="mt-2 w-full" />
        </div>
        <button type="submit" className="rounded-full bg-orange-600 px-5 py-4 text-sm font-semibold text-white shadow hover:bg-orange-700">
          Save product
        </button>
      </form>
    </div>
  );
};

export default AdminProductForm;
