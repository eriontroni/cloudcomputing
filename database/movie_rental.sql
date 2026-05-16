-- ============================================================
-- DATABASE: movie_rental
-- ============================================================
USE movie_rental;
GO

CREATE TABLE movies (
    movie_id         INT IDENTITY(1,1) PRIMARY KEY,
    title            NVARCHAR(200)  NOT NULL,
    genre            NVARCHAR(50),
    director         NVARCHAR(100),
    release_year     INT,
    rating           DECIMAL(3,1),
    available_copies INT            NOT NULL DEFAULT 0,
    total_copies     INT            NOT NULL DEFAULT 0,
    rental_rate      DECIMAL(8,2)   NOT NULL DEFAULT 1.99,
    poster_url       NVARCHAR(500),
    description      NVARCHAR(MAX)
);

CREATE TABLE customers (
    customer_id     INT IDENTITY(1,1) PRIMARY KEY,
    first_name      NVARCHAR(50)  NOT NULL,
    last_name       NVARCHAR(50)  NOT NULL,
    email           NVARCHAR(100) NOT NULL UNIQUE,
    phone           NVARCHAR(20),
    membership_type NVARCHAR(20)  NOT NULL DEFAULT 'basic',  -- basic, standard, premium
    is_active       BIT           NOT NULL DEFAULT 1,
    created_at      DATETIME      NOT NULL DEFAULT GETDATE()
);

CREATE TABLE rentals (
    rental_id    INT IDENTITY(1,1) PRIMARY KEY,
    movie_id     INT      REFERENCES movies(movie_id),
    customer_id  INT      REFERENCES customers(customer_id),
    rental_date  DATETIME NOT NULL DEFAULT GETDATE(),
    due_date     DATETIME NOT NULL,
    return_date  DATETIME
);

CREATE TABLE transactions (
    transaction_id   INT IDENTITY(1,1) PRIMARY KEY,
    rental_id        INT           REFERENCES rentals(rental_id),
    customer_id      INT           REFERENCES customers(customer_id),
    amount           DECIMAL(8,2)  NOT NULL,
    transaction_type NVARCHAR(20)  NOT NULL,  -- rental, late_fee, refund
    transaction_date DATETIME      NOT NULL DEFAULT GETDATE()
);

CREATE TABLE rental_queue (
    queue_id    INT IDENTITY(1,1) PRIMARY KEY,
    movie_id    INT      REFERENCES movies(movie_id),
    customer_id INT      REFERENCES customers(customer_id),
    added_date  DATETIME NOT NULL DEFAULT GETDATE(),
    fulfilled   BIT      NOT NULL DEFAULT 0
);

-- ── Seed Data ──────────────────────────────────────────────
INSERT INTO movies (title, genre, director, release_year, rating, available_copies, total_copies, rental_rate) VALUES
('The Dark Knight',    'Action',   'Christopher Nolan', 2008, 9.0, 3, 5, 2.99),
('Inception',          'Sci-Fi',   'Christopher Nolan', 2010, 8.8, 2, 4, 2.99),
('Interstellar',       'Sci-Fi',   'Christopher Nolan', 2014, 8.6, 1, 3, 2.49),
('The Godfather',      'Crime',    'Francis Coppola',   1972, 9.2, 2, 3, 1.99),
('Pulp Fiction',       'Crime',    'Quentin Tarantino', 1994, 8.9, 3, 3, 1.99),
('The Matrix',         'Action',   'The Wachowskis',    1999, 8.7, 4, 5, 2.49),
('Goodfellas',         'Crime',    'Martin Scorsese',   1990, 8.7, 2, 2, 1.99),
('Forrest Gump',       'Drama',    'Robert Zemeckis',   1994, 8.8, 5, 5, 1.99);

INSERT INTO customers (first_name, last_name, email, phone, membership_type) VALUES
('Alice',   'Johnson', 'alice@email.com',   '555-0101', 'premium'),
('Bob',     'Smith',   'bob@email.com',     '555-0102', 'standard'),
('Carol',   'White',   'carol@email.com',   '555-0103', 'basic'),
('David',   'Brown',   'david@email.com',   '555-0104', 'premium');

INSERT INTO rentals (movie_id, customer_id, rental_date, due_date) VALUES
(1, 1, GETDATE(), DATEADD(day, 7, GETDATE())),
(3, 2, GETDATE(), DATEADD(day, -2, GETDATE())),  -- overdue
(5, 3, GETDATE(), DATEADD(day, 5, GETDATE()));

INSERT INTO transactions (rental_id, customer_id, amount, transaction_type) VALUES
(1, 1, 20.93, 'rental'),
(2, 2, 17.43, 'rental'),
(3, 3, 13.93, 'rental');
