import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import toast from 'react-hot-toast';
import { blogApi } from '../services/api';
import { Users, FileText, MessageSquare, Tag, Plus, Edit2, Trash2, Check, BookOpen } from 'lucide-react';
import StatsCard from '../components/StatsCard';
import DataTable from '../components/DataTable';
import Modal, { ConfirmModal } from '../components/Modal';
import SearchBar from '../components/SearchBar';
import { useForm } from 'react-hook-form';

// ── Helpers ────────────────────────────────────────────────────────────────
const PAGE_LIMIT = 10;

function Badge({ children, variant = 'gray' }) {
  const v = { gray: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300', green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400', yellow: 'bg-yellow-100 text-yellow-700', red: 'bg-red-100 text-red-700', blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v[variant] || v.gray}`}>{children}</span>;
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500';

// ── OVERVIEW ──────────────────────────────────────────────────────────────
function BlogOverview() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    blogApi.getStats().then(r => setStats(r.data.data)).catch(() => toast.error('Failed to load stats'));
  }, []);
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard title="Total Posts" value={stats?.totalPosts} icon={FileText} color="blue" />
      <StatsCard title="Total Users" value={stats?.totalUsers} icon={Users} color="green" />
      <StatsCard title="Total Comments" value={stats?.totalComments} icon={MessageSquare} color="purple" />
      <StatsCard title="Total Likes" value={stats?.totalLikes} icon={BookOpen} color="orange" />
    </div>
  );
}

// ── USERS VIEW ─────────────────────────────────────────────────────────────
function UsersView() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await blogApi.getUsers({ search, page, limit: PAGE_LIMIT });
      setUsers(r.data.data); setTotal(r.data.total);
    } catch { toast.error('Failed to load users'); }
    setLoading(false);
  }, [search, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  const onSubmit = async (data) => {
    try {
      if (modal.user) { await blogApi.updateUser(modal.user.user_id, data); toast.success('User updated'); }
      else { await blogApi.createUser({ ...data, password_hash: 'changeme123' }); toast.success('User created'); }
      setModal(null); reset(); load();
    } catch (e) { toast.error(e.message); }
  };

  const handleDelete = async (id) => {
    try { await blogApi.deleteUser(id); toast.success('User deleted'); load(); }
    catch (e) { toast.error(e.message); }
  };

  const columns = [
    { key: 'username', label: 'Username', render: v => <span className="font-medium">{v}</span> },
    { key: 'email', label: 'Email' },
    { key: 'full_name', label: 'Full Name' },
    { key: 'role', label: 'Role', render: v => <Badge variant={v === 'admin' ? 'red' : 'blue'}>{v}</Badge> },
    { key: 'post_count', label: 'Posts' },
    { key: 'actions', label: '', render: (_, row) => (
      <div className="flex gap-2">
        <button onClick={() => { setModal({ user: row }); reset(row); }} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"><Edit2 size={15} /></button>
        <button onClick={() => setDeleteId(row.user_id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={15} /></button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search users..." />
        <button onClick={() => { setModal({}); reset({}); }} className="ml-3 flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm rounded-xl hover:bg-primary-700 transition-colors whitespace-nowrap">
          <Plus size={16} /> Add User
        </button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
        <DataTable columns={columns} data={users} loading={loading} total={total} page={page} limit={PAGE_LIMIT} onPageChange={setPage} />
      </div>
      <Modal isOpen={!!modal} onClose={() => { setModal(null); reset(); }} title={modal?.user ? 'Edit User' : 'Add User'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Username" error={errors.username?.message}>
            <input {...register('username', { required: 'Required' })} className={inputCls} />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <input {...register('email', { required: 'Required' })} type="email" className={inputCls} />
          </Field>
          <Field label="Full Name">
            <input {...register('full_name')} className={inputCls} />
          </Field>
          <Field label="Role">
            <select {...register('role')} className={inputCls}>
              <option value="author">Author</option>
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
            </select>
          </Field>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => { setModal(null); reset(); }} className="px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm rounded-xl bg-primary-600 text-white hover:bg-primary-700">Save</button>
          </div>
        </form>
      </Modal>
      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => handleDelete(deleteId)} message="This user will be deactivated." />
    </div>
  );
}

// ── POSTS VIEW ─────────────────────────────────────────────────────────────
function PostsView() {
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [authors, setAuthors] = useState([]);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await blogApi.getPosts({ search, page, limit: PAGE_LIMIT, status: statusFilter });
      setPosts(r.data.data); setTotal(r.data.total);
    } catch { toast.error('Failed to load posts'); }
    setLoading(false);
  }, [search, page, statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    blogApi.getCategories().then(r => setCategories(r.data.data)).catch(() => {});
    blogApi.getTags().then(r => setTags(r.data.data)).catch(() => {});
    blogApi.getUsers({ limit: 100 }).then(r => setAuthors(r.data.data)).catch(() => {});
  }, []);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const onSubmit = async (data) => {
    try {
      const payload = { ...data, tags: data.tags ? [data.tags] : [] };
      if (modal.post) { await blogApi.updatePost(modal.post.post_id, payload); toast.success('Post updated'); }
      else { await blogApi.createPost(payload); toast.success('Post created'); }
      setModal(null); reset(); load();
    } catch (e) { toast.error(e.message); }
  };

  const handleDelete = async (id) => {
    try { await blogApi.deletePost(id); toast.success('Post deleted'); load(); }
    catch (e) { toast.error(e.message); }
  };

  const statusColor = { published: 'green', draft: 'yellow', archived: 'gray' };
  const columns = [
    { key: 'title', label: 'Title', render: v => <span className="font-medium line-clamp-1 max-w-xs">{v}</span> },
    { key: 'author_name', label: 'Author' },
    { key: 'category_name', label: 'Category', render: v => v ? <Badge>{v}</Badge> : '—' },
    { key: 'status', label: 'Status', render: v => <Badge variant={statusColor[v] || 'gray'}>{v}</Badge> },
    { key: 'comment_count', label: 'Comments' },
    { key: 'likes_count', label: 'Likes' },
    { key: 'created_at', label: 'Date', render: v => new Date(v).toLocaleDateString() },
    { key: 'actions', label: '', render: (_, row) => (
      <div className="flex gap-2">
        <button onClick={() => { setModal({ post: row }); reset(row); }} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"><Edit2 size={15} /></button>
        <button onClick={() => setDeleteId(row.post_id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={15} /></button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="Search posts..." />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <button onClick={() => { setModal({}); reset({ status: 'draft' }); }} className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm rounded-xl hover:bg-primary-700 whitespace-nowrap">
          <Plus size={16} /> New Post
        </button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
        <DataTable columns={columns} data={posts} loading={loading} total={total} page={page} limit={PAGE_LIMIT} onPageChange={setPage} />
      </div>
      <Modal isOpen={!!modal} onClose={() => { setModal(null); reset(); }} title={modal?.post ? 'Edit Post' : 'New Post'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Title" error={errors.title?.message}>
            <input {...register('title', { required: 'Required' })} className={inputCls} />
          </Field>
          <Field label="Slug" error={errors.slug?.message}>
            <input {...register('slug', { required: 'Required' })} className={inputCls} />
          </Field>
          <Field label="Content">
            <textarea {...register('content')} rows={6} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Author">
              <select {...register('author_id')} className={inputCls}>
                {authors.map(u => <option key={u.user_id} value={u.user_id}>{u.username}</option>)}
              </select>
            </Field>
            <Field label="Category">
              <select {...register('category_id')} className={inputCls}>
                <option value="">None</option>
                {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Status">
            <select {...register('status')} className={inputCls}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </Field>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => { setModal(null); reset(); }} className="px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm rounded-xl bg-primary-600 text-white hover:bg-primary-700">Save</button>
          </div>
        </form>
      </Modal>
      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => handleDelete(deleteId)} />
    </div>
  );
}

// ── COMMENTS VIEW ──────────────────────────────────────────────────────────
function CommentsView() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await blogApi.getComments({ limit: 20 }); setComments(r.data.data); }
    catch { toast.error('Failed to load comments'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id) => {
    try { await blogApi.approveComment(id); toast.success('Comment approved'); load(); }
    catch (e) { toast.error(e.message); }
  };

  const handleDelete = async (id) => {
    try { await blogApi.deleteComment(id); toast.success('Comment deleted'); load(); }
    catch (e) { toast.error(e.message); }
  };

  const columns = [
    { key: 'author_name', label: 'Author' },
    { key: 'post_title', label: 'Post', render: v => <span className="line-clamp-1 max-w-xs">{v}</span> },
    { key: 'content', label: 'Comment', render: v => <span className="line-clamp-2 max-w-sm text-sm">{v}</span> },
    { key: 'is_approved', label: 'Status', render: v => <Badge variant={v ? 'green' : 'yellow'}>{v ? 'Approved' : 'Pending'}</Badge> },
    { key: 'created_at', label: 'Date', render: v => new Date(v).toLocaleDateString() },
    { key: 'actions', label: '', render: (_, row) => (
      <div className="flex gap-2">
        {!row.is_approved && <button onClick={() => handleApprove(row.comment_id)} className="p-1.5 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"><Check size={15} /></button>}
        <button onClick={() => setDeleteId(row.comment_id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={15} /></button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
        <DataTable columns={columns} data={comments} loading={loading} total={comments.length} page={1} limit={20} onPageChange={() => {}} />
      </div>
      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => handleDelete(deleteId)} />
    </div>
  );
}

// ── CATEGORIES VIEW ────────────────────────────────────────────────────────
function CategoriesView() {
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [activeTab, setActiveTab] = useState('categories');
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, tRes] = await Promise.all([blogApi.getCategories(), blogApi.getTags()]);
      setCategories(cRes.data.data); setTags(tRes.data.data);
    } catch { toast.error('Failed to load'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onSubmitCategory = async (data) => {
    try {
      if (modal?.cat) { await blogApi.updateCategory(modal.cat.category_id, data); toast.success('Category updated'); }
      else { await blogApi.createCategory(data); toast.success('Category created'); }
      setModal(null); reset(); load();
    } catch (e) { toast.error(e.message); }
  };

  const onSubmitTag = async (data) => {
    try { await blogApi.createTag(data); toast.success('Tag created'); setModal(null); reset(); load(); }
    catch (e) { toast.error(e.message); }
  };

  const catCols = [
    { key: 'name', label: 'Name', render: v => <span className="font-medium">{v}</span> },
    { key: 'slug', label: 'Slug' },
    { key: 'description', label: 'Description', render: v => <span className="line-clamp-1 max-w-xs text-sm">{v || '—'}</span> },
    { key: 'post_count', label: 'Posts' },
    { key: 'actions', label: '', render: (_, row) => (
      <div className="flex gap-2">
        <button onClick={() => { setModal({ cat: row }); reset(row); }} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"><Edit2 size={15} /></button>
        <button onClick={() => setDeleteId({ type: 'cat', id: row.category_id })} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={15} /></button>
      </div>
    )},
  ];

  const tagCols = [
    { key: 'name', label: 'Name', render: v => <Badge>{v}</Badge> },
    { key: 'slug', label: 'Slug' },
    { key: 'usage_count', label: 'Used in Posts' },
    { key: 'actions', label: '', render: (_, row) => (
      <button onClick={() => setDeleteId({ type: 'tag', id: row.tag_id })} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={15} /></button>
    )},
  ];

  const handleDeleteConfirm = async () => {
    try {
      if (deleteId.type === 'cat') await blogApi.deleteCategory(deleteId.id);
      else await blogApi.deleteTag(deleteId.id);
      toast.success('Deleted'); load();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <div className="flex border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          {['categories', 'tags'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${activeTab === t ? 'bg-primary-600 text-white' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>{t}</button>
          ))}
        </div>
        <button onClick={() => { setModal({ type: activeTab }); reset({}); }} className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm rounded-xl hover:bg-primary-700">
          <Plus size={16} /> Add {activeTab === 'categories' ? 'Category' : 'Tag'}
        </button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
        {activeTab === 'categories'
          ? <DataTable columns={catCols} data={categories} loading={loading} total={categories.length} page={1} limit={50} onPageChange={() => {}} />
          : <DataTable columns={tagCols} data={tags} loading={loading} total={tags.length} page={1} limit={50} onPageChange={() => {}} />
        }
      </div>
      <Modal isOpen={!!modal} onClose={() => { setModal(null); reset(); }} title={modal?.cat ? 'Edit Category' : modal?.type === 'tags' ? 'Add Tag' : 'Add Category'}>
        <form onSubmit={handleSubmit(modal?.type === 'tags' ? onSubmitTag : onSubmitCategory)} className="space-y-4">
          <Field label="Name" error={errors.name?.message}><input {...register('name', { required: 'Required' })} className={inputCls} /></Field>
          <Field label="Slug" error={errors.slug?.message}><input {...register('slug', { required: 'Required' })} className={inputCls} /></Field>
          {modal?.type !== 'tags' && <Field label="Description"><textarea {...register('description')} rows={3} className={inputCls} /></Field>}
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => { setModal(null); reset(); }} className="px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm rounded-xl bg-primary-600 text-white hover:bg-primary-700">Save</button>
          </div>
        </form>
      </Modal>
      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDeleteConfirm} />
    </div>
  );
}

// ── LAYOUT ─────────────────────────────────────────────────────────────────
const tabs = [
  { path: '', label: 'Overview', icon: BookOpen },
  { path: 'users', label: 'Users', icon: Users },
  { path: 'posts', label: 'Posts', icon: FileText },
  { path: 'comments', label: 'Comments', icon: MessageSquare },
  { path: 'categories', label: 'Categories & Tags', icon: Tag },
];

export default function BlogDashboard() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <BookOpen className="text-blue-500" size={28} /> Personal Blog Platform
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Database: personal_blog</p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        {tabs.map(({ path, label, icon: Icon }) => (
          <NavLink key={path} to={path} end={path === ''} className={({ isActive }) =>
            `flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${isActive ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`
          }>
            <Icon size={15} /> {label}
          </NavLink>
        ))}
      </div>

      <Routes>
        <Route index element={<BlogOverview />} />
        <Route path="users" element={<UsersView />} />
        <Route path="posts" element={<PostsView />} />
        <Route path="comments" element={<CommentsView />} />
        <Route path="categories" element={<CategoriesView />} />
      </Routes>
    </div>
  );
}
