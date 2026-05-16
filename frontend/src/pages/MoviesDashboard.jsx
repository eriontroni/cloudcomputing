import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import toast from 'react-hot-toast';
import { moviesApi } from '../services/api';
import { Film, Users, Clock, DollarSign, Plus, RotateCcw, Star, Copy, ListPlus, Edit2, Trash2 } from 'lucide-react';
import StatsCard from '../components/StatsCard';
import DataTable from '../components/DataTable';
import Modal, { ConfirmModal } from '../components/Modal';
import SearchBar from '../components/SearchBar';
import { useForm } from 'react-hook-form';

const PAGE_LIMIT = 12;

function Badge({ children, variant = 'gray' }) {
  const v = { gray: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300', green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400', red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400', yellow: 'bg-yellow-100 text-yellow-700', blue: 'bg-blue-100 text-blue-700', purple: 'bg-purple-100 text-purple-700' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v[variant] || v.gray}`}>{children}</span>;
}

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500';
function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ── OVERVIEW ──────────────────────────────────────────────────────────────
function MoviesOverview() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    moviesApi.getStats().then(r => setStats(r.data.data)).catch(() => toast.error('Failed to load stats'));
  }, []);
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard title="Total Movies" value={stats?.totalMovies} icon={Film} color="purple" />
      <StatsCard title="Active Rentals" value={stats?.activeRentals} icon={Clock} color="orange" />
      <StatsCard title="Customers" value={stats?.totalCustomers} icon={Users} color="blue" />
      <StatsCard title="Monthly Revenue" value={stats?.monthlyRevenue ? `$${Number(stats.monthlyRevenue).toFixed(2)}` : '$0.00'} icon={DollarSign} color="green" subtitle="This month" />
    </div>
  );
}

// ── MOVIES CATALOG ─────────────────────────────────────────────────────────
function MoviesCatalog() {
  const [movies, setMovies] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('');
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [rentModal, setRentModal] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [customers, setCustomers] = useState([]);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const { register: rentReg, handleSubmit: rentSubmit, reset: rentReset } = useForm({ defaultValues: { days: 7 } });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await moviesApi.getMovies({ search, page, limit: PAGE_LIMIT, genre });
      setMovies(r.data.data); setTotal(r.data.total);
    } catch { toast.error('Failed to load movies'); }
    setLoading(false);
  }, [search, page, genre]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    moviesApi.getGenres().then(r => setGenres(r.data.data)).catch(() => {});
    moviesApi.getCustomers({ limit: 100 }).then(r => setCustomers(r.data.data)).catch(() => {});
  }, []);
  useEffect(() => { setPage(1); }, [search, genre]);

  const onSubmit = async (data) => {
    try {
      if (modal.movie) { await moviesApi.updateMovie(modal.movie.movie_id, data); toast.success('Movie updated'); }
      else { await moviesApi.createMovie(data); toast.success('Movie added'); }
      setModal(null); reset(); load();
    } catch (e) { toast.error(e.message); }
  };

  const onRent = async (data) => {
    try {
      await moviesApi.rentMovie({ movie_id: rentModal.movie_id, customer_id: parseInt(data.customer_id), days: parseInt(data.days) });
      toast.success('Movie rented!'); setRentModal(null); rentReset(); load();
    } catch (e) { toast.error(e.message); }
  };

  const handleDelete = async (id) => {
    try { await moviesApi.deleteMovie(id); toast.success('Movie deleted'); load(); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="Search movies..." />
        <select value={genre} onChange={e => setGenre(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:outline-none">
          <option value="">All Genres</option>
          {genres.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <button onClick={() => { setModal({}); reset({}); }} className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm rounded-xl hover:bg-primary-700 whitespace-nowrap">
          <Plus size={16} /> Add Movie
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {movies.map(movie => (
            <div key={movie.movie_id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow group">
              <div className="h-36 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center relative">
                {movie.poster_url ? <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover" onError={e => e.target.style.display='none'} /> : <Film size={40} className="text-white/70" />}
                <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded-lg flex items-center gap-1">
                  <Star size={10} fill="currentColor" className="text-yellow-400" /> {movie.rating}
                </div>
                <div className={`absolute top-2 left-2 text-xs px-1.5 py-0.5 rounded-lg font-medium ${movie.available_copies > 0 ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
                  {movie.available_copies > 0 ? `${movie.available_copies} avail.` : 'Unavailable'}
                </div>
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-sm line-clamp-1 mb-0.5">{movie.title}</h3>
                <p className="text-xs text-gray-400">{movie.director} · {movie.release_year}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Badge variant="purple">{movie.genre}</Badge>
                  <span className="text-xs text-gray-400 ml-auto">${movie.rental_rate}/day</span>
                </div>
                <div className="flex gap-1 mt-3">
                  <button onClick={() => setRentModal(movie)} disabled={movie.available_copies <= 0}
                    className="flex-1 text-xs py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    Rent
                  </button>
                  <button onClick={() => { setModal({ movie }); reset(movie); }} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"><Edit2 size={13} /></button>
                  <button onClick={() => setDeleteId(movie.movie_id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {total > PAGE_LIMIT && (
        <div className="flex justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page <= 1} className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40">Prev</button>
          <span className="px-3 py-1 text-sm">Page {page} of {Math.ceil(total/PAGE_LIMIT)}</span>
          <button onClick={() => setPage(p => p+1)} disabled={page >= Math.ceil(total/PAGE_LIMIT)} className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40">Next</button>
        </div>
      )}

      {/* Add/Edit Movie Modal */}
      <Modal isOpen={!!modal} onClose={() => { setModal(null); reset(); }} title={modal?.movie ? 'Edit Movie' : 'Add Movie'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Title" error={errors.title?.message}><input {...register('title', { required: 'Required' })} className={inputCls} /></Field>
            <Field label="Genre"><input {...register('genre')} className={inputCls} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Director"><input {...register('director')} className={inputCls} /></Field>
            <Field label="Release Year"><input {...register('release_year')} type="number" className={inputCls} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Rating (0-10)"><input {...register('rating')} type="number" step="0.1" min="0" max="10" className={inputCls} /></Field>
            <Field label="Total Copies"><input {...register('total_copies')} type="number" className={inputCls} /></Field>
            <Field label="Rental Rate ($)"><input {...register('rental_rate')} type="number" step="0.01" className={inputCls} /></Field>
          </div>
          <Field label="Poster URL"><input {...register('poster_url')} className={inputCls} /></Field>
          <Field label="Description"><textarea {...register('description')} rows={3} className={inputCls} /></Field>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => { setModal(null); reset(); }} className="px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm rounded-xl bg-primary-600 text-white hover:bg-primary-700">Save</button>
          </div>
        </form>
      </Modal>

      {/* Rent Modal */}
      <Modal isOpen={!!rentModal} onClose={() => { setRentModal(null); rentReset(); }} title={`Rent: ${rentModal?.title}`}>
        <form onSubmit={rentSubmit(onRent)} className="space-y-4">
          <Field label="Customer">
            <select {...rentReg('customer_id', { required: true })} className={inputCls}>
              <option value="">Select customer...</option>
              {customers.map(c => <option key={c.customer_id} value={c.customer_id}>{c.first_name} {c.last_name}</option>)}
            </select>
          </Field>
          <Field label="Rental Days">
            <input {...rentReg('days')} type="number" min={1} max={30} className={inputCls} />
          </Field>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => { setRentModal(null); rentReset(); }} className="px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm rounded-xl bg-primary-600 text-white hover:bg-primary-700">Confirm Rent</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => handleDelete(deleteId)} />
    </div>
  );
}

// ── CUSTOMERS ──────────────────────────────────────────────────────────────
function CustomersView() {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await moviesApi.getCustomers({ search, page, limit: PAGE_LIMIT }); setCustomers(r.data.data); setTotal(r.data.total); }
    catch { toast.error('Failed to load customers'); }
    setLoading(false);
  }, [search, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  const onSubmit = async (data) => {
    try {
      if (modal.cust) { await moviesApi.updateCustomer(modal.cust.customer_id, data); toast.success('Customer updated'); }
      else { await moviesApi.createCustomer(data); toast.success('Customer added'); }
      setModal(null); reset(); load();
    } catch (e) { toast.error(e.message); }
  };

  const memberBadge = { premium: 'purple', standard: 'blue', basic: 'gray' };
  const columns = [
    { key: 'first_name', label: 'Name', render: (v, row) => <span className="font-medium">{v} {row.last_name}</span> },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone', render: v => v || '—' },
    { key: 'membership_type', label: 'Membership', render: v => <Badge variant={memberBadge[v] || 'gray'}>{v}</Badge> },
    { key: 'active_rentals', label: 'Active Rentals' },
    { key: 'total_rentals', label: 'Total Rentals' },
    { key: 'actions', label: '', render: (_, row) => (
      <div className="flex gap-2">
        <button onClick={() => { setModal({ cust: row }); reset(row); }} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"><Edit2 size={15} /></button>
        <button onClick={() => setDeleteId(row.customer_id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={15} /></button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search customers..." />
        <button onClick={() => { setModal({}); reset({}); }} className="ml-3 flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm rounded-xl hover:bg-primary-700 whitespace-nowrap">
          <Plus size={16} /> Add Customer
        </button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
        <DataTable columns={columns} data={customers} loading={loading} total={total} page={page} limit={PAGE_LIMIT} onPageChange={setPage} />
      </div>
      <Modal isOpen={!!modal} onClose={() => { setModal(null); reset(); }} title={modal?.cust ? 'Edit Customer' : 'Add Customer'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name" error={errors.first_name?.message}><input {...register('first_name', { required: 'Required' })} className={inputCls} /></Field>
            <Field label="Last Name" error={errors.last_name?.message}><input {...register('last_name', { required: 'Required' })} className={inputCls} /></Field>
          </div>
          <Field label="Email" error={errors.email?.message}><input {...register('email', { required: 'Required' })} type="email" className={inputCls} /></Field>
          <Field label="Phone"><input {...register('phone')} className={inputCls} /></Field>
          <Field label="Membership">
            <select {...register('membership_type')} className={inputCls}>
              <option value="basic">Basic</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
            </select>
          </Field>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => { setModal(null); reset(); }} className="px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm rounded-xl bg-primary-600 text-white hover:bg-primary-700">Save</button>
          </div>
        </form>
      </Modal>
      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { moviesApi.deleteCustomer(deleteId).then(() => { toast.success('Customer removed'); load(); }); }} />
    </div>
  );
}

// ── ACTIVE RENTALS ─────────────────────────────────────────────────────────
function ActiveRentals() {
  const [rentals, setRentals] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [returnId, setReturnId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await moviesApi.getActiveRentals({ page, limit: PAGE_LIMIT }); setRentals(r.data.data); setTotal(r.data.total); }
    catch { toast.error('Failed to load rentals'); }
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleReturn = async (id) => {
    try {
      const r = await moviesApi.returnMovie(id);
      const { days_late, late_fee } = r.data.data;
      if (days_late > 0) toast.success(`Returned! Late fee: $${late_fee.toFixed(2)} (${days_late} days late)`);
      else toast.success('Movie returned successfully!');
      load();
    } catch (e) { toast.error(e.message); }
  };

  const columns = [
    { key: 'movie_title', label: 'Movie', render: v => <span className="font-medium">{v}</span> },
    { key: 'customer_name', label: 'Customer' },
    { key: 'rental_date', label: 'Rented', render: v => new Date(v).toLocaleDateString() },
    { key: 'due_date', label: 'Due', render: (v, row) => (
      <span className={row.is_overdue ? 'text-red-500 font-medium' : ''}>{new Date(v).toLocaleDateString()}</span>
    )},
    { key: 'is_overdue', label: 'Status', render: (v, row) => v ? <Badge variant="red">Overdue +${Number(row.late_fee).toFixed(2)}</Badge> : <Badge variant="green">Active</Badge> },
    { key: 'actions', label: '', render: (_, row) => (
      <button onClick={() => setReturnId(row.rental_id)} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600">
        <RotateCcw size={12} /> Return
      </button>
    )},
  ];

  return (
    <div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
        <DataTable columns={columns} data={rentals} loading={loading} total={total} page={page} limit={PAGE_LIMIT} onPageChange={setPage} emptyMessage="No active rentals" />
      </div>
      <ConfirmModal isOpen={!!returnId} onClose={() => setReturnId(null)} onConfirm={() => handleReturn(returnId)} title="Return Movie" message="Confirm movie return. Late fees will be calculated automatically." />
    </div>
  );
}

// ── TRANSACTIONS ───────────────────────────────────────────────────────────
function TransactionsView() {
  const [txns, setTxns] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await moviesApi.getTransactions({ page, limit: PAGE_LIMIT }); setTxns(r.data.data); setTotal(r.data.total); }
    catch { toast.error('Failed to load transactions'); }
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const typeColor = { rental: 'blue', late_fee: 'red', refund: 'green' };
  const columns = [
    { key: 'movie_title', label: 'Movie' },
    { key: 'customer_name', label: 'Customer' },
    { key: 'transaction_type', label: 'Type', render: v => <Badge variant={typeColor[v] || 'gray'}>{v}</Badge> },
    { key: 'amount', label: 'Amount', render: v => <span className="font-semibold">${Number(v).toFixed(2)}</span> },
    { key: 'transaction_date', label: 'Date', render: v => new Date(v).toLocaleString() },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
      <DataTable columns={columns} data={txns} loading={loading} total={total} page={page} limit={PAGE_LIMIT} onPageChange={setPage} />
    </div>
  );
}

// ── LAYOUT ─────────────────────────────────────────────────────────────────
const tabs = [
  { path: '', label: 'Overview', icon: Film },
  { path: 'catalog', label: 'Movies Catalog', icon: Film },
  { path: 'customers', label: 'Customers', icon: Users },
  { path: 'rentals', label: 'Active Rentals', icon: Clock },
  { path: 'transactions', label: 'Transactions', icon: DollarSign },
];

export default function MoviesDashboard() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Film className="text-purple-500" size={28} /> Movie Rental Service
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Database: movie_rental</p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {tabs.map(({ path, label, icon: Icon }) => (
          <NavLink key={path} to={path} end={path === ''} className={({ isActive }) =>
            `flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${isActive ? 'border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`
          }>
            <Icon size={15} /> {label}
          </NavLink>
        ))}
      </div>

      <Routes>
        <Route index element={<MoviesOverview />} />
        <Route path="catalog" element={<MoviesCatalog />} />
        <Route path="customers" element={<CustomersView />} />
        <Route path="rentals" element={<ActiveRentals />} />
        <Route path="transactions" element={<TransactionsView />} />
      </Routes>
    </div>
  );
}
