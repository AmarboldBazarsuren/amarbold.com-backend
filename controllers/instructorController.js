const db = require('../config/db');

// @desc    Бүх багш нарыг авах
// @route   GET /api/instructors
// @access  Private
exports.getAllInstructors = async (req, res) => {
  try {
    const [instructors] = await db.query(`
      SELECT 
        u.id, u.name, u.email, u.bio, u.teaching_categories,
        u.profile_image, u.profile_banner, u.created_at,
        (SELECT COUNT(*) FROM courses WHERE instructor_id = u.id AND status = 'published') as total_courses,
        (SELECT COUNT(DISTINCT e.user_id) FROM enrollments e 
         JOIN courses c ON e.course_id = c.id 
         WHERE c.instructor_id = u.id) as total_students
      FROM users u
      WHERE u.role IN ('test_admin', 'admin')
      ORDER BY total_courses DESC, total_students DESC
    `);

    res.status(200).json({
      success: true,
      count: instructors.length,
      data: instructors
    });
  } catch (error) {
    console.error('GetAllInstructors Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};

// @desc    Багшийн дэлгэрэнгүй мэдээлэл + хичээлүүд
// @route   GET /api/instructors/:id
// @access  Private
exports.getInstructorDetail = async (req, res) => {
  try {
    const instructorId = req.params.id;

    const [instructors] = await db.query(`
      SELECT 
        u.id, u.name, u.email, u.bio, u.teaching_categories,
        u.profile_image, u.profile_banner, u.created_at,
        (SELECT COUNT(*) FROM courses WHERE instructor_id = u.id AND status = 'published') as total_courses,
        (SELECT COUNT(DISTINCT e.user_id) FROM enrollments e 
         JOIN courses c ON e.course_id = c.id 
         WHERE c.instructor_id = u.id) as total_students
      FROM users u
      WHERE u.id = ? AND u.role IN ('test_admin', 'admin')
    `, [instructorId]);

    if (instructors.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Багш олдсонгүй'
      });
    }

    // Багшийн хичээлүүд
    const [courses] = await db.query(`
      SELECT 
        c.*,
        cat.name as category_name,
        cat.slug as category_slug,
        (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as total_students
      FROM courses c
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE c.instructor_id = ? AND c.status = 'published'
      ORDER BY c.created_at DESC
    `, [instructorId]);

    const formattedCourses = courses.map(course => ({
      id: course.id,
      title: course.title,
      description: course.description,
      thumbnail: course.thumbnail,
      category: course.category_slug,
      price: parseFloat(course.price),
      is_free: course.is_free === 1,
      duration: course.duration,
      level: course.level,
      rating: parseFloat(course.rating),
      students: course.total_students
    }));

    res.status(200).json({
      success: true,
      instructor: {
        ...instructors[0],
        courses: formattedCourses
      }
    });
  } catch (error) {
    console.error('GetInstructorDetail Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};

module.exports = {
  getAllInstructors,
  getInstructorDetail
};