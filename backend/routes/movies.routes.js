const router = require('express').Router();
const c = require('../controllers/movies.controller');

router.get('/stats', c.getStats);
router.get('/genres', c.getGenres);

// Customers — must come BEFORE /:id
router.get('/customers', c.getCustomers);
router.post('/customers', c.createCustomer);
router.put('/customers/:id', c.updateCustomer);
router.delete('/customers/:id', c.deleteCustomer);

// Rentals & transactions — must come BEFORE /:id
router.get('/rentals/active', c.getActiveRentals);
router.post('/rent', c.rentMovie);
router.post('/return/:id', c.returnMovie);

router.get('/transactions', c.getTransactions);

router.post('/queue', c.addToQueue);

// Movies CRUD — /:id LAST so it doesn't swallow specific routes
router.get('/', c.getMovies);
router.get('/:id', c.getMovieById);
router.post('/', c.createMovie);
router.put('/:id', c.updateMovie);
router.delete('/:id', c.deleteMovie);

module.exports = router;
