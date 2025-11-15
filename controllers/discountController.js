const db = require('../config/db');

/**
 * @desc    Хичээлд хямдрал үүсгэх
 * @route   POST /api/discounts/courses/:courseId
 * @access  Private (Test Admin болон Admin - өөрийн хичээл)
 */
exports.createCourseDiscount = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { discount_percent, end_date } = req.body;  // ✅ start_date устгасан
    const userId = req.user.id;

    // Validation
    if (!discount_percent || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Бүх талбарыг бөглөнө үү'
      });
    }

    if (discount_percent < 1 || discount_percent > 100) {
      return res.status(400).json({
        success: false,
        message: 'Хямдрал 1-100% хооронд байх ёстой'
      });
    }

    // Хичээл шалгах
    const [courses] = await db.query(
      'SELECT id, title, instructor_id, price FROM courses WHERE id = ?',
      [courseId]
    );

    if (courses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Хичээл олдсонгүй'
      });
    }

    const course = courses[0];

    // Эрх шалгах
    if (req.user.role === 'test_admin' && course.instructor_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Та зөвхөн өөрийн хичээлд хямдрал үүсгэж болно'
      });
    }

    // Огноо шалгах
    const endDate = new Date(end_date);
    const now = new Date();

    if (endDate <= now) {
      return res.status(400).json({
        success: false,
        message: 'Дуусах огноо ирээдүйд байх ёстой'
      });
    }

    // Идэвхтэй хямдрал байгаа эсэх
    const [existingDiscounts] = await db.query(`
      SELECT id FROM course_discounts 
      WHERE course_id = ? 
      AND is_active = 1 
      AND end_date > NOW()
    `, [courseId]);

    if (existingDiscounts.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Энэ хичээлд аль хэдийн идэвхтэй хямдрал байна'
      });
    }

    // ✅ start_date = одоо, end_date = хэрэглэгчийн сонгосон огноо
    const [result] = await db.query(`
      INSERT INTO course_discounts 
      (course_id, discount_percent, start_date, end_date, created_by, is_active)
      VALUES (?, ?, NOW(), ?, ?, 1)
    `, [courseId, discount_percent, endDate, userId]);

    const discountPrice = course.price * (1 - discount_percent / 100);

    res.status(201).json({
      success: true,
      message: 'Хямдрал амжилттай үүсгэлээ',
      data: {
        id: result.insertId,
        courseId,
        courseTitle: course.title,
        originalPrice: course.price,
        discountPercent: discount_percent,
        discountPrice: Math.round(discountPrice),
        startDate: now,  // ✅ Одоо
        endDate
      }
    });
  } catch (error) {
    console.error('CreateCourseDiscount Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};



/**
 * @desc    Хичээлийн бүх хямдралууд
 * @route   GET /api/discounts/courses/:courseId
 * @access  Private
 */
exports.getCourseDiscounts = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const [courses] = await db.query(
      'SELECT instructor_id FROM courses WHERE id = ?',
      [courseId]
    );

    if (courses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Хичээл олдсонгүй'
      });
    }

    if (req.user.role === 'test_admin' && courses[0].instructor_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Танд энэ хичээлийн хямдралыг харах эрх байхгүй'
      });
    }

    const [discounts] = await db.query(`
      SELECT 
        cd.*,
        u.name as created_by_name,
        CASE 
          WHEN NOW() < cd.start_date THEN 'upcoming'
          WHEN NOW() BETWEEN cd.start_date AND cd.end_date THEN 'active'
          ELSE 'expired'
        END as status
      FROM course_discounts cd
      JOIN users u ON cd.created_by = u.id
      WHERE cd.course_id = ?
      ORDER BY cd.created_at DESC
    `, [courseId]);

    res.status(200).json({
      success: true,
      count: discounts.length,
      data: discounts
    });
  } catch (error) {
    console.error('GetCourseDiscounts Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};



/**
 * @desc    Хямдрал идэвхгүй болгох
 * @route   PUT /api/discounts/:discountId/deactivate
 * @access  Private
 */
exports.deactivateDiscount = async (req, res) => {
  try {
    const { discountId } = req.params;
    const userId = req.user.id;

    const [discounts] = await db.query(`
      SELECT cd.*, c.instructor_id 
      FROM course_discounts cd
      JOIN courses c ON cd.course_id = c.id
      WHERE cd.id = ?
    `, [discountId]);

    if (discounts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Хямдрал олдсонгүй'
      });
    }

    const discount = discounts[0];

    if (req.user.role === 'test_admin' && discount.instructor_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Танд энэ хямдралыг идэвхгүй болгох эрх байхгүй'
      });
    }

    await db.query('UPDATE course_discounts SET is_active = 0 WHERE id = ?', [discountId]);

    res.status(200).json({
      success: true,
      message: 'Хямдрал идэвхгүй болсон'
    });
  } catch (error) {
    console.error('DeactivateDiscount Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};



/**
 * @desc    Хямдрал устгах
 * @route   DELETE /api/discounts/:discountId
 * @access  Private
 */
exports.deleteDiscount = async (req, res) => {
  try {
    const { discountId } = req.params;
    const userId = req.user.id;

    const [discounts] = await db.query(`
      SELECT cd.*, c.instructor_id 
      FROM course_discounts cd
      JOIN courses c ON cd.course_id = c.id
      WHERE cd.id = ?
    `, [discountId]);

    if (discounts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Хямдрал олдсонгүй'
      });
    }

    const discount = discounts[0];

    if (req.user.role === 'test_admin' && discount.instructor_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Танд энэ хямдралыг устгах эрх байхгүй'
      });
    }

    await db.query('DELETE FROM course_discounts WHERE id = ?', [discountId]);

    res.status(200).json({
      success: true,
      message: 'Хямдрал устгагдлаа'
    });
  } catch (error) {
    console.error('DeleteDiscount Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};



/**
 * @desc    Идэвхтэй хямдралтай хичээлүүд
 * @route   GET /api/discounts/active
 * @access  Public
 */
exports.getActiveDiscounts = async (req, res) => {
  try {
    const [discounts] = await db.query(`
      SELECT 
        c.id as course_id,
        c.title,
        c.description,
        c.thumbnail,
        c.price as original_price,
        cd.discount_percent,
        ROUND(c.price * (1 - cd.discount_percent / 100)) as discount_price,
        ROUND(c.price * (cd.discount_percent / 100)) as saved_amount,
        cd.end_date,
        u.name as instructor_name,
        cat.name as category_name
      FROM course_discounts cd
      JOIN courses c ON cd.course_id = c.id
      JOIN users u ON c.instructor_id = u.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE cd.is_active = 1 
      AND NOW() BETWEEN cd.start_date AND cd.end_date
      AND c.status = 'published'
      ORDER BY cd.discount_percent DESC, cd.created_at DESC
    `);

    res.status(200).json({
      success: true,
      count: discounts.length,
      data: discounts
    });
  } catch (error) {
    console.error('GetActiveDiscounts Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};


// ----------------------------------------------------
// ✔ БҮХ ФУНКЦИЙГ ЗӨВ ЗАРЛАХ ЭКСПОРТ
// ----------------------------------------------------
module.exports = exports;
