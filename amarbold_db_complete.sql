-- ============================================
-- AmarBold.mn - Бүрэн Database Setup
-- Огноо: 2024-11-15
-- ============================================

-- Database үүсгэх
CREATE DATABASE IF NOT EXISTS amarbold_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE amarbold_db;

-- ============================================
-- TABLES
-- ============================================

-- Users table (Хэрэглэгчид)
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'test_admin', 'admin') DEFAULT 'user',
    status ENUM('active', 'suspended', 'banned') DEFAULT 'active',
    profile_image VARCHAR(255),
    profile_banner VARCHAR(255),
    bio TEXT,
    teaching_categories VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_status (status)
);

-- Categories table (Ангилал)
CREATE TABLE IF NOT EXISTS categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Courses table (Хичээлүүд)
CREATE TABLE IF NOT EXISTS courses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    full_description LONGTEXT,
    thumbnail VARCHAR(255),
    preview_video_url VARCHAR(500) NULL,
    category_id INT NULL,
    instructor_id INT NOT NULL,
    price DECIMAL(10, 2) DEFAULT 0.00,
    is_free BOOLEAN DEFAULT FALSE,
    duration INT DEFAULT 0,
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    rating DECIMAL(3, 2) DEFAULT 0.00,
    total_students INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_category (category_id),
    INDEX idx_instructor (instructor_id)
);

-- Course Sections (Хичээлийн бүлгүүд)
CREATE TABLE IF NOT EXISTS course_sections (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_number INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    INDEX idx_course (course_id)
);

-- Lessons (Хичээлүүд)
CREATE TABLE IF NOT EXISTS lessons (
    id INT PRIMARY KEY AUTO_INCREMENT,
    section_id INT NOT NULL,
    course_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    video_url VARCHAR(500),
    duration INT DEFAULT 0,
    order_number INT DEFAULT 0,
    is_free_preview BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (section_id) REFERENCES course_sections(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    INDEX idx_section (section_id),
    INDEX idx_course (course_id)
);

-- Enrollments (Бүртгэл)
CREATE TABLE IF NOT EXISTS enrollments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    course_id INT NOT NULL,
    payment_status ENUM('free', 'paid', 'pending') DEFAULT 'free',
    payment_amount DECIMAL(10, 2) DEFAULT 0.00,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_enrollment (user_id, course_id),
    INDEX idx_user (user_id),
    INDEX idx_course (course_id)
);

-- Lesson Progress (Хичээлийн явц)
CREATE TABLE IF NOT EXISTS lesson_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    lesson_id INT NOT NULL,
    course_id INT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    watch_time INT DEFAULT 0,
    last_watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_progress (user_id, lesson_id),
    INDEX idx_user (user_id),
    INDEX idx_lesson (lesson_id),
    INDEX idx_course (course_id)
);

-- Reviews (Үнэлгээ)
CREATE TABLE IF NOT EXISTS reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    course_id INT NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_review (user_id, course_id),
    INDEX idx_course (course_id)
);

-- Certificates (Гэрчилгээ)
CREATE TABLE IF NOT EXISTS certificates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    course_id INT NOT NULL,
    certificate_code VARCHAR(50) UNIQUE NOT NULL,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_certificate (user_id, course_id),
    INDEX idx_user (user_id),
    INDEX idx_code (certificate_code)
);

-- Admin Activity Logs (Админы үйл ажиллагааны бүртгэл)
CREATE TABLE IF NOT EXISTS admin_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id INT,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_admin (admin_id),
    INDEX idx_action (action),
    INDEX idx_created (created_at)
);

-- Course Discounts (Хичээлийн хямдрал)
CREATE TABLE IF NOT EXISTS course_discounts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    discount_percent INT NOT NULL CHECK (discount_percent >= 1 AND discount_percent <= 100),
    start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_course (course_id),
    INDEX idx_dates (start_date, end_date),
    INDEX idx_active (is_active)
);

-- ============================================
-- АНХНЫ ӨГӨГДӨЛ
-- ============================================

-- Анхны categories нэмэх
INSERT INTO categories (name, slug, description) VALUES
('Програмчлал', 'programming', 'Web болон Software Development'),
('Дизайн', 'design', 'UI/UX болон Graphic Design'),
('Бизнес', 'business', 'Бизнес удирдлага болон стратеги'),
('Маркетинг', 'marketing', 'Цахим маркетинг болон брэндинг'),
('Хувийн хөгжил', 'personal-development', 'Ур чадвар хөгжүүлэх')
ON DUPLICATE KEY UPDATE name=name;

-- Анхны Admin хэрэглэгч үүсгэх
-- Нууц үг: admin123 (bcrypt hash)
INSERT INTO users (name, email, password, role) VALUES
('Super Admin', 'admin@amarbold.mn', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'admin')
ON DUPLICATE KEY UPDATE name=name;

-- ============================================
-- БҮТЦИЙН ШАЛГАЛТ
-- ============================================

-- Бүх table-ууд харуулах
SHOW TABLES;

-- Courses table-ийн бүтэц харуулах
DESCRIBE courses;

-- Users table-ийн бүтэц харуулах
DESCRIBE users;

-- Course_discounts table-ийн бүтэц харуулах
DESCRIBE course_discounts;

SELECT 'Database setup амжилттай!' as STATUS;