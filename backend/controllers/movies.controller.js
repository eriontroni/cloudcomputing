const { sql, moviesPool } = require('../config/db');

// ── STATS ──────────────────────────────────────────────────────────────────
exports.getStats = async (req, res, next) => {
  try {
    const pool = await moviesPool;
    const result = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM movies) AS totalMovies,
        (SELECT COUNT(*) FROM rentals WHERE return_date IS NULL) AS activeRentals,
        (SELECT COUNT(*) FROM customers WHERE is_active=1) AS totalCustomers,
        (SELECT ISNULL(SUM(amount),0) FROM transactions WHERE MONTH(transaction_date)=MONTH(GETDATE()) AND YEAR(transaction_date)=YEAR(GETDATE())) AS monthlyRevenue
    `);
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

// ── MOVIES ─────────────────────────────────────────────────────────────────
exports.getMovies = async (req, res, next) => {
  try {
    const pool = await moviesPool;
    const { search = '', genre = '', year = '', min_rating = '', page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    let where = `WHERE (m.title LIKE @search OR d.first_name + ' ' + d.last_name LIKE @search)`;
    if (genre) where += ` AND EXISTS (SELECT 1 FROM movie_genres mg JOIN genres g ON mg.genre_id=g.genre_id WHERE mg.movie_id=m.movie_id AND g.name=@genre)`;
    if (year) where += ` AND m.release_year = @year`;
    if (min_rating) where += ` AND m.rating >= @min_rating`;

    const req2 = pool.request()
      .input('search', sql.NVarChar, `%${search}%`)
      .input('offset', sql.Int, parseInt(offset))
      .input('limit', sql.Int, parseInt(limit));
    if (genre) req2.input('genre', sql.NVarChar, genre);
    if (year) req2.input('year', sql.Int, parseInt(year));
    if (min_rating) req2.input('min_rating', sql.Decimal(3, 1), parseFloat(min_rating));

    const result = await req2.query(`
      SELECT m.movie_id, m.title, m.release_year, m.rating, m.rental_price AS rental_rate,
             m.available_copies, m.total_copies, m.poster_url, m.description, m.language, m.duration_minutes,
             d.first_name + ' ' + d.last_name AS director,
             (SELECT TOP 1 g.name FROM movie_genres mg JOIN genres g ON mg.genre_id=g.genre_id WHERE mg.movie_id=m.movie_id ORDER BY g.name) AS genre,
             (SELECT COUNT(*) FROM rentals r WHERE r.movie_id=m.movie_id AND r.return_date IS NULL) AS active_rentals
      FROM movies m
      LEFT JOIN directors d ON m.director_id = d.director_id
      ${where}
      ORDER BY m.title
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    const countReq = pool.request().input('search', sql.NVarChar, `%${search}%`);
    if (genre) countReq.input('genre', sql.NVarChar, genre);
    if (year) countReq.input('year', sql.Int, parseInt(year));
    if (min_rating) countReq.input('min_rating', sql.Decimal(3, 1), parseFloat(min_rating));
    const count = await countReq.query(`
      SELECT COUNT(*) AS total FROM movies m
      LEFT JOIN directors d ON m.director_id = d.director_id
      ${where}
    `);

    res.json({ success: true, data: result.recordset, total: count.recordset[0].total });
  } catch (err) { next(err); }
};

exports.getMovieById = async (req, res, next) => {
  try {
    const pool = await moviesPool;
    const { id } = req.params;
    const result = await pool.request().input('id', sql.Int, id).query(`
      SELECT m.*, d.first_name + ' ' + d.last_name AS director_name,
             m.rental_price AS rental_rate
      FROM movies m
      LEFT JOIN directors d ON m.director_id = d.director_id
      WHERE m.movie_id=@id
    `);
    if (!result.recordset.length) return res.status(404).json({ success: false, message: 'Movie not found' });
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

exports.createMovie = async (req, res, next) => {
  try {
    const pool = await moviesPool;
    const { title, genre, director, release_year, rating, total_copies, rental_rate, poster_url, description } = req.body;

    // Find or create director
    let director_id = null;
    if (director) {
      const parts = director.trim().split(' ');
      const last = parts.pop();
      const first = parts.join(' ') || last;
      const dirCheck = await pool.request()
        .input('first', sql.NVarChar, first)
        .input('last', sql.NVarChar, last)
        .query(`SELECT director_id FROM directors WHERE first_name=@first AND last_name=@last`);
      if (dirCheck.recordset.length) {
        director_id = dirCheck.recordset[0].director_id;
      } else {
        const newDir = await pool.request()
          .input('first', sql.NVarChar, first)
          .input('last', sql.NVarChar, last)
          .query(`INSERT INTO directors (first_name,last_name) OUTPUT INSERTED.director_id VALUES (@first,@last)`);
        director_id = newDir.recordset[0].director_id;
      }
    }

    const result = await pool.request()
      .input('title', sql.NVarChar, title)
      .input('director_id', sql.Int, director_id)
      .input('release_year', sql.Int, release_year)
      .input('rating', sql.Decimal(3, 1), rating)
      .input('total_copies', sql.Int, total_copies)
      .input('available_copies', sql.Int, total_copies)
      .input('rental_price', sql.Decimal(8, 2), rental_rate)
      .input('poster_url', sql.NVarChar, poster_url || null)
      .input('description', sql.NVarChar(sql.MAX), description || null)
      .query(`INSERT INTO movies (title,director_id,release_year,rating,total_copies,available_copies,rental_price,poster_url,description,is_available) OUTPUT INSERTED.* VALUES (@title,@director_id,@release_year,@rating,@total_copies,@available_copies,@rental_price,@poster_url,@description,1)`);

    const movie_id = result.recordset[0].movie_id;

    // Link genre
    if (genre) {
      const genreCheck = await pool.request()
        .input('name', sql.NVarChar, genre)
        .query(`SELECT genre_id FROM genres WHERE name=@name`);
      let genre_id;
      if (genreCheck.recordset.length) {
        genre_id = genreCheck.recordset[0].genre_id;
      } else {
        const newGenre = await pool.request()
          .input('name', sql.NVarChar, genre)
          .query(`INSERT INTO genres (name) OUTPUT INSERTED.genre_id VALUES (@name)`);
        genre_id = newGenre.recordset[0].genre_id;
      }
      await pool.request()
        .input('movie_id', sql.Int, movie_id)
        .input('genre_id', sql.Int, genre_id)
        .query(`INSERT INTO movie_genres (movie_id,genre_id) VALUES (@movie_id,@genre_id)`);
    }

    res.status(201).json({ success: true, data: { ...result.recordset[0], genre, director } });
  } catch (err) { next(err); }
};

exports.updateMovie = async (req, res, next) => {
  try {
    const pool = await moviesPool;
    const { id } = req.params;
    const { title, genre, director, release_year, rating, rental_rate, poster_url, description } = req.body;

    // Find or create director
    let director_id = null;
    if (director) {
      const parts = director.trim().split(' ');
      const last = parts.pop();
      const first = parts.join(' ') || last;
      const dirCheck = await pool.request()
        .input('first', sql.NVarChar, first)
        .input('last', sql.NVarChar, last)
        .query(`SELECT director_id FROM directors WHERE first_name=@first AND last_name=@last`);
      if (dirCheck.recordset.length) {
        director_id = dirCheck.recordset[0].director_id;
      } else {
        const newDir = await pool.request()
          .input('first', sql.NVarChar, first)
          .input('last', sql.NVarChar, last)
          .query(`INSERT INTO directors (first_name,last_name) OUTPUT INSERTED.director_id VALUES (@first,@last)`);
        director_id = newDir.recordset[0].director_id;
      }
    }

    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('title', sql.NVarChar, title)
      .input('director_id', sql.Int, director_id)
      .input('release_year', sql.Int, release_year)
      .input('rating', sql.Decimal(3, 1), rating)
      .input('rental_price', sql.Decimal(8, 2), rental_rate)
      .input('poster_url', sql.NVarChar, poster_url || null)
      .input('description', sql.NVarChar(sql.MAX), description || null)
      .query(`UPDATE movies SET title=@title,director_id=@director_id,release_year=@release_year,rating=@rating,rental_price=@rental_price,poster_url=@poster_url,description=@description OUTPUT INSERTED.* WHERE movie_id=@id`);

    // Update genre: remove old, add new
    if (genre) {
      await pool.request().input('id', sql.Int, id).query(`DELETE FROM movie_genres WHERE movie_id=@id`);
      const genreCheck = await pool.request()
        .input('name', sql.NVarChar, genre)
        .query(`SELECT genre_id FROM genres WHERE name=@name`);
      let genre_id;
      if (genreCheck.recordset.length) {
        genre_id = genreCheck.recordset[0].genre_id;
      } else {
        const newGenre = await pool.request()
          .input('name', sql.NVarChar, genre)
          .query(`INSERT INTO genres (name) OUTPUT INSERTED.genre_id VALUES (@name)`);
        genre_id = newGenre.recordset[0].genre_id;
      }
      await pool.request()
        .input('movie_id', sql.Int, id)
        .input('genre_id', sql.Int, genre_id)
        .query(`INSERT INTO movie_genres (movie_id,genre_id) VALUES (@movie_id,@genre_id)`);
    }

    res.json({ success: true, data: { ...result.recordset[0], genre, director } });
  } catch (err) { next(err); }
};

exports.deleteMovie = async (req, res, next) => {
  try {
    const pool = await moviesPool;
    const { id } = req.params;
    await pool.request().input('id', sql.Int, id).query(`DELETE FROM movie_genres WHERE movie_id=@id`);
    await pool.request().input('id', sql.Int, id).query(`DELETE FROM movie_actors WHERE movie_id=@id`);
    await pool.request().input('id', sql.Int, id).query(`DELETE FROM movies WHERE movie_id=@id`);
    res.json({ success: true, message: 'Movie deleted' });
  } catch (err) { next(err); }
};

exports.getGenres = async (req, res, next) => {
  try {
    const pool = await moviesPool;
    const result = await pool.request().query(`SELECT name FROM genres ORDER BY name`);
    res.json({ success: true, data: result.recordset.map(r => r.name) });
  } catch (err) { next(err); }
};

// ── CUSTOMERS ──────────────────────────────────────────────────────────────
exports.getCustomers = async (req, res, next) => {
  try {
    const pool = await moviesPool;
    const { search = '', page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const result = await pool.request()
      .input('search', sql.NVarChar, `%${search}%`)
      .input('offset', sql.Int, parseInt(offset))
      .input('limit', sql.Int, parseInt(limit))
      .query(`
        SELECT c.customer_id, c.first_name, c.last_name, c.email, c.phone, c.membership_type, c.is_active, c.created_at,
               (SELECT COUNT(*) FROM rentals r WHERE r.customer_id=c.customer_id AND r.return_date IS NULL) AS active_rentals,
               (SELECT COUNT(*) FROM rentals r WHERE r.customer_id=c.customer_id) AS total_rentals
        FROM customers c
        WHERE (c.first_name LIKE @search OR c.last_name LIKE @search OR c.email LIKE @search) AND c.is_active=1
        ORDER BY c.last_name, c.first_name
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);
    const count = await pool.request()
      .input('search', sql.NVarChar, `%${search}%`)
      .query(`SELECT COUNT(*) AS total FROM customers c WHERE (c.first_name LIKE @search OR c.last_name LIKE @search OR c.email LIKE @search) AND c.is_active=1`);
    res.json({ success: true, data: result.recordset, total: count.recordset[0].total });
  } catch (err) { next(err); }
};

exports.createCustomer = async (req, res, next) => {
  try {
    const pool = await moviesPool;
    const { first_name, last_name, email, phone, membership_type = 'basic' } = req.body;

    // Generate a unique username from first_name.last_name
    const baseUsername = `${first_name}.${last_name}`.toLowerCase().replace(/\s+/g, '');
    const existing = await pool.request()
      .input('base', sql.NVarChar, `${baseUsername}%`)
      .query(`SELECT COUNT(*) AS cnt FROM customers WHERE username LIKE @base`);
    const count = existing.recordset[0].cnt;
    const username = count > 0 ? `${baseUsername}${count}` : baseUsername;

    const result = await pool.request()
      .input('first_name', sql.NVarChar, first_name)
      .input('last_name', sql.NVarChar, last_name)
      .input('username', sql.NVarChar, username)
      .input('email', sql.NVarChar, email)
      .input('phone', sql.NVarChar, phone || null)
      .input('membership_type', sql.NVarChar, membership_type)
      .input('password_hash', sql.NVarChar, 'not_set')
      .query(`INSERT INTO customers (first_name,last_name,username,email,phone,membership_type,password_hash,is_active,created_at) OUTPUT INSERTED.* VALUES (@first_name,@last_name,@username,@email,@phone,@membership_type,@password_hash,1,GETDATE())`);
    res.status(201).json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

exports.updateCustomer = async (req, res, next) => {
  try {
    const pool = await moviesPool;
    const { id } = req.params;
    const { first_name, last_name, email, phone, membership_type } = req.body;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('first_name', sql.NVarChar, first_name)
      .input('last_name', sql.NVarChar, last_name)
      .input('email', sql.NVarChar, email)
      .input('phone', sql.NVarChar, phone || null)
      .input('membership_type', sql.NVarChar, membership_type)
      .query(`UPDATE customers SET first_name=@first_name,last_name=@last_name,email=@email,phone=@phone,membership_type=@membership_type OUTPUT INSERTED.* WHERE customer_id=@id`);
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

exports.deleteCustomer = async (req, res, next) => {
  try {
    const pool = await moviesPool;
    const { id } = req.params;
    await pool.request().input('id', sql.Int, id).query(`UPDATE customers SET is_active=0 WHERE customer_id=@id`);
    res.json({ success: true, message: 'Customer deactivated' });
  } catch (err) { next(err); }
};

// ── RENTALS ────────────────────────────────────────────────────────────────
exports.getActiveRentals = async (req, res, next) => {
  try {
    const pool = await moviesPool;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const result = await pool.request()
      .input('offset', sql.Int, parseInt(offset))
      .input('limit', sql.Int, parseInt(limit))
      .query(`
        SELECT r.rental_id, r.rental_date, r.due_date, r.return_date, r.rental_price,
               m.title AS movie_title,
               c.first_name + ' ' + c.last_name AS customer_name, c.email AS customer_email,
               CASE WHEN r.due_date < GETDATE() THEN 1 ELSE 0 END AS is_overdue,
               CASE WHEN r.due_date < GETDATE()
                    THEN DATEDIFF(day, r.due_date, GETDATE()) * 1.00 ELSE 0 END AS late_fee
        FROM rentals r
        JOIN movies m ON r.movie_id = m.movie_id
        JOIN customers c ON r.customer_id = c.customer_id
        WHERE r.return_date IS NULL
        ORDER BY r.due_date ASC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);
    const count = await pool.request().query(`SELECT COUNT(*) AS total FROM rentals WHERE return_date IS NULL`);
    res.json({ success: true, data: result.recordset, total: count.recordset[0].total });
  } catch (err) { next(err); }
};

exports.rentMovie = async (req, res, next) => {
  try {
    const pool = await moviesPool;
    const { movie_id, customer_id, days = 7 } = req.body;

    const movieCheck = await pool.request()
      .input('movie_id', sql.Int, movie_id)
      .query(`SELECT available_copies, rental_price FROM movies WHERE movie_id=@movie_id`);

    if (!movieCheck.recordset.length) return res.status(404).json({ success: false, message: 'Movie not found' });
    if (movieCheck.recordset[0].available_copies <= 0) return res.status(400).json({ success: false, message: 'No available copies' });

    const rental_price = movieCheck.recordset[0].rental_price;
    const total_amount = rental_price * days;

    const rental = await pool.request()
      .input('movie_id', sql.Int, movie_id)
      .input('customer_id', sql.Int, customer_id)
      .input('days', sql.Int, days)
      .input('rental_price', sql.Decimal(8, 2), rental_price)
      .query(`
        INSERT INTO rentals (movie_id,customer_id,rental_date,due_date,rental_price)
        OUTPUT INSERTED.*
        VALUES (@movie_id,@customer_id,GETDATE(),DATEADD(day,@days,GETDATE()),@rental_price)
      `);

    await pool.request()
      .input('movie_id', sql.Int, movie_id)
      .query(`UPDATE movies SET available_copies=available_copies-1 WHERE movie_id=@movie_id`);

    await pool.request()
      .input('rental_id', sql.Int, rental.recordset[0].rental_id)
      .input('customer_id', sql.Int, customer_id)
      .input('amount', sql.Decimal(8, 2), total_amount)
      .query(`INSERT INTO transactions (rental_id,customer_id,amount,transaction_type,transaction_date,payment_method) VALUES (@rental_id,@customer_id,@amount,'rental',GETDATE(),'cash')`);

    res.status(201).json({ success: true, data: rental.recordset[0], message: 'Movie rented successfully' });
  } catch (err) { next(err); }
};

exports.returnMovie = async (req, res, next) => {
  try {
    const pool = await moviesPool;
    const { id } = req.params;

    const rental = await pool.request()
      .input('id', sql.Int, id)
      .query(`SELECT r.*, m.rental_price FROM rentals r JOIN movies m ON r.movie_id=m.movie_id WHERE r.rental_id=@id AND r.return_date IS NULL`);

    if (!rental.recordset.length) return res.status(404).json({ success: false, message: 'Active rental not found' });

    const r = rental.recordset[0];
    const daysLate = Math.max(0, Math.floor((new Date() - new Date(r.due_date)) / (1000 * 60 * 60 * 24)));
    const late_fee = daysLate * 1.00;

    await pool.request().input('id', sql.Int, id)
      .query(`UPDATE rentals SET return_date=GETDATE() WHERE rental_id=@id`);

    await pool.request().input('movie_id', sql.Int, r.movie_id)
      .query(`UPDATE movies SET available_copies=available_copies+1 WHERE movie_id=@movie_id`);

    if (late_fee > 0) {
      await pool.request()
        .input('rental_id', sql.Int, id)
        .input('customer_id', sql.Int, r.customer_id)
        .input('amount', sql.Decimal(8, 2), late_fee)
        .query(`INSERT INTO transactions (rental_id,customer_id,amount,transaction_type,transaction_date,payment_method) VALUES (@rental_id,@customer_id,@amount,'late_fee',GETDATE(),'cash')`);
    }

    res.json({ success: true, message: 'Movie returned', data: { days_late: daysLate, late_fee } });
  } catch (err) { next(err); }
};

// ── TRANSACTIONS ───────────────────────────────────────────────────────────
exports.getTransactions = async (req, res, next) => {
  try {
    const pool = await moviesPool;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const result = await pool.request()
      .input('offset', sql.Int, parseInt(offset))
      .input('limit', sql.Int, parseInt(limit))
      .query(`
        SELECT t.transaction_id, t.amount, t.transaction_type, t.transaction_date,
               c.first_name + ' ' + c.last_name AS customer_name,
               m.title AS movie_title
        FROM transactions t
        JOIN customers c ON t.customer_id = c.customer_id
        LEFT JOIN rentals r ON t.rental_id = r.rental_id
        LEFT JOIN movies m ON r.movie_id = m.movie_id
        ORDER BY t.transaction_date DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);
    const count = await pool.request().query(`SELECT COUNT(*) AS total FROM transactions`);
    res.json({ success: true, data: result.recordset, total: count.recordset[0].total });
  } catch (err) { next(err); }
};

// ── QUEUE ──────────────────────────────────────────────────────────────────
exports.addToQueue = async (req, res, next) => {
  try {
    const pool = await moviesPool;
    const { movie_id, customer_id } = req.body;
    const exists = await pool.request()
      .input('movie_id', sql.Int, movie_id)
      .input('customer_id', sql.Int, customer_id)
      .query(`SELECT 1 FROM rental_queue WHERE movie_id=@movie_id AND customer_id=@customer_id AND fulfilled=0`);
    if (exists.recordset.length) return res.status(400).json({ success: false, message: 'Already in queue' });

    const result = await pool.request()
      .input('movie_id', sql.Int, movie_id)
      .input('customer_id', sql.Int, customer_id)
      .query(`INSERT INTO rental_queue (movie_id,customer_id,added_date,fulfilled) OUTPUT INSERTED.* VALUES (@movie_id,@customer_id,GETDATE(),0)`);
    res.status(201).json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};
