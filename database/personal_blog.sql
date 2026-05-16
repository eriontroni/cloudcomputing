-- ============================================================
-- DATABASE: personal_blog
-- ============================================================
USE personal_blog;
GO

CREATE TABLE users (
    user_id       INT IDENTITY(1,1) PRIMARY KEY,
    username      NVARCHAR(50)  NOT NULL UNIQUE,
    email         NVARCHAR(100) NOT NULL UNIQUE,
    full_name     NVARCHAR(100),
    password_hash NVARCHAR(255) NOT NULL,
    role          NVARCHAR(20)  NOT NULL DEFAULT 'author',  -- author, admin, editor
    is_active     BIT           NOT NULL DEFAULT 1,
    created_at    DATETIME      NOT NULL DEFAULT GETDATE()
);

CREATE TABLE categories (
    category_id INT IDENTITY(1,1) PRIMARY KEY,
    name        NVARCHAR(100) NOT NULL,
    slug        NVARCHAR(100) NOT NULL UNIQUE,
    description NVARCHAR(500)
);

CREATE TABLE tags (
    tag_id INT IDENTITY(1,1) PRIMARY KEY,
    name   NVARCHAR(50)  NOT NULL UNIQUE,
    slug   NVARCHAR(50)  NOT NULL UNIQUE
);

CREATE TABLE posts (
    post_id       INT IDENTITY(1,1) PRIMARY KEY,
    title         NVARCHAR(255) NOT NULL,
    slug          NVARCHAR(255) NOT NULL UNIQUE,
    content       NVARCHAR(MAX),
    author_id     INT REFERENCES users(user_id),
    category_id   INT REFERENCES categories(category_id),
    status        NVARCHAR(20) NOT NULL DEFAULT 'draft',  -- draft, published, archived
    is_deleted    BIT          NOT NULL DEFAULT 0,
    likes_count   INT          NOT NULL DEFAULT 0,
    views_count   INT          NOT NULL DEFAULT 0,
    created_at    DATETIME     NOT NULL DEFAULT GETDATE(),
    published_at  DATETIME
);

CREATE TABLE post_tags (
    post_id INT REFERENCES posts(post_id),
    tag_id  INT REFERENCES tags(tag_id),
    PRIMARY KEY (post_id, tag_id)
);

CREATE TABLE comments (
    comment_id  INT IDENTITY(1,1) PRIMARY KEY,
    post_id     INT REFERENCES posts(post_id),
    author_id   INT REFERENCES users(user_id),
    content     NVARCHAR(MAX) NOT NULL,
    is_approved BIT           NOT NULL DEFAULT 0,
    is_deleted  BIT           NOT NULL DEFAULT 0,
    created_at  DATETIME      NOT NULL DEFAULT GETDATE()
);

-- ── Seed Data ──────────────────────────────────────────────
INSERT INTO users (username, email, full_name, password_hash, role) VALUES
('admin',   'admin@blog.com',   'Admin User',   'hashed_pw', 'admin'),
('john',    'john@blog.com',    'John Doe',     'hashed_pw', 'author'),
('jane',    'jane@blog.com',    'Jane Smith',   'hashed_pw', 'editor');

INSERT INTO categories (name, slug, description) VALUES
('Technology', 'technology', 'Tech articles'),
('Travel',     'travel',     'Travel stories'),
('Food',       'food',       'Food & recipes');

INSERT INTO tags (name, slug) VALUES
('Python', 'python'), ('JavaScript', 'javascript'), ('Travel', 'travel'), ('Recipes', 'recipes');

INSERT INTO posts (title, slug, content, author_id, category_id, status, published_at) VALUES
('Getting Started with React', 'getting-started-react', 'React is a JavaScript library...', 2, 1, 'published', GETDATE()),
('My Trip to Italy', 'trip-to-italy', 'Italy was amazing...', 2, 2, 'published', GETDATE()),
('Best Pasta Recipe', 'best-pasta-recipe', 'Here is my favorite pasta...', 3, 3, 'draft', NULL);

INSERT INTO comments (post_id, author_id, content, is_approved) VALUES
(1, 3, 'Great post!', 1),
(1, 2, 'Very helpful, thanks!', 0),
(2, 3, 'Italy is beautiful!', 1);
