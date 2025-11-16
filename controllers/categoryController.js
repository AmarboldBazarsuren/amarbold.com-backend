const db = require('../config/db');

// @desc    Бүх ангиллыг авах
// @route   GET /api/categories
// @access  Public
exports.getAllCategories = async (req, res) => {
  try {
    const [categories] = await db.query(`
      SELECT 
        c.id, c.name, c.slug, c.description, c.icon,
        (SELECT COUNT(*) FROM courses WHERE category_id = c.id AND status = 'published') as course_count
      FROM categories c
      ORDER BY c.name ASC
    `);

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error('GetAllCategories Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};

// @desc    Ангилал үүсгэх
// @route   POST /api/categories
// @access  Private/Admin
exports.createCategory = async (req, res) => {
  try {
    const { name, description, icon } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Ангиллын нэр шаардлагатай'
      });
    }

    // Slug үүсгэх
    const slug = name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');

    // Давхардсан slug шалгах
    const [existing] = await db.query(
      'SELECT id FROM categories WHERE slug = ?',
      [slug]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Энэ ангилал аль хэдийн байна'
      });
    }

    const [result] = await db.query(
      'INSERT INTO categories (name, slug, description, icon) VALUES (?, ?, ?, ?)',
      [name, slug, description || null, icon || null]
    );

    res.status(201).json({
      success: true,
      message: 'Ангилал амжилттай үүсгэлээ',
      data: {
        id: result.insertId,
        name,
        slug
      }
    });
  } catch (error) {
    console.error('CreateCategory Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};

// @desc    Ангилал шинэчлэх
// @route   PUT /api/categories/:id
// @access  Private/Admin
exports.updateCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const { name, description, icon } = req.body;

    const [categories] = await db.query(
      'SELECT id FROM categories WHERE id = ?',
      [categoryId]
    );

    if (categories.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ангилал олдсонгүй'
      });
    }

    // Slug шинэчлэх
    let slug = null;
    if (name) {
      slug = name
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
    }

    await db.query(
      `UPDATE categories SET 
        name = COALESCE(?, name),
        slug = COALESCE(?, slug),
        description = COALESCE(?, description),
        icon = COALESCE(?, icon)
      WHERE id = ?`,
      [name, slug, description, icon, categoryId]
    );

    res.status(200).json({
      success: true,
      message: 'Ангилал амжилттай шинэчлэгдлээ'
    });
  } catch (error) {
    console.error('UpdateCategory Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};

// @desc    Ангилал устгах
// @route   DELETE /api/categories/:id
// @access  Private/Admin
exports.deleteCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;

    // Ангилал байгаа эсэх шалгах
    const [categories] = await db.query(
      'SELECT name FROM categories WHERE id = ?',
      [categoryId]
    );

    if (categories.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ангилал олдсонгүй'
      });
    }

    // Энэ ангилалд хичээл байгаа эсэх шалгах
    const [courses] = await db.query(
      'SELECT COUNT(*) as count FROM courses WHERE category_id = ?',
      [categoryId]
    );

    if (courses[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Энэ ангилалд хичээл байна. Устгах боломжгүй'
      });
    }

    await db.query('DELETE FROM categories WHERE id = ?', [categoryId]);

    res.status(200).json({
      success: true,
      message: 'Ангилал устгагдлаа'
    });
  } catch (error) {
    console.error('DeleteCategory Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};