const router = require('express').Router();
const c = require('../controllers/blog.controller');

router.get('/stats', c.getStats);

router.get('/users', c.getUsers);
router.post('/users', c.createUser);
router.put('/users/:id', c.updateUser);
router.delete('/users/:id', c.deleteUser);

router.get('/posts', c.getPosts);
router.get('/posts/:id', c.getPostById);
router.post('/posts', c.createPost);
router.put('/posts/:id', c.updatePost);
router.delete('/posts/:id', c.deletePost);

router.get('/comments', c.getComments);
router.put('/comments/:id/approve', c.approveComment);
router.delete('/comments/:id', c.deleteComment);

router.get('/categories', c.getCategories);
router.post('/categories', c.createCategory);
router.put('/categories/:id', c.updateCategory);
router.delete('/categories/:id', c.deleteCategory);

router.get('/tags', c.getTags);
router.post('/tags', c.createTag);
router.delete('/tags/:id', c.deleteTag);

module.exports = router;
