const Course = require('../models/Course');
const User = require('../models/User');
const Reply = require('../models/Reply');
const { verify, verifyTokenAuth, verifyTokenAdmin } = require('./verifyToken');

const router = require('express').Router();

// Create a new Course post
router.post('/', verifyTokenAuth, async (req, res) => {
  try {
    const newCoursePost = new Course(req.body);
    const savedCoursePost = await newCoursePost.save();

    // Update the user's posts array
    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { posts: savedCoursePost._id } // $addToSet ensures no duplicates
    }).exec();

    res.status(201).json(savedvPost);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Get all Course posts with populated replies
router.get('/', async (req, res) => {
  try {
    const coursePosts = await Course.find()
      .populate({
        path: 'replies',
        populate: {
          path: 'creator',
          select: '-password' // Exclude password field
        }
      })
      .populate('creator', '-password')
      .sort({ createdAt: -1 });

    res.status(200).json(coursePosts);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Get a single course post by ID
router.get('/find/:id', async (req, res) => {
  try {
    const coursePost = await Course.findById(req.params.id)
      .populate({
        path: 'replies',
        populate: {
          path: 'creator',
          select: '-password' // Exclude password field
        }
      })
      .populate('creator', '-password');
    if (!coursePost) {
      return res.status(404).json({ message: 'Course post not found' });
    }
    res.status(200).json(coursePost);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Update a course post
router.put('/:id', verifyTokenAuth, async (req, res) => {
  try {
    const updatedCoursePost = await Course.findByIdAndUpdate(
      req.params.id,
      {
        $set: req.body
      },
      { new: true }
    );
    if (!updatedCoursePost) {
      return res.status(404).json({ message: 'Course post not found' });
    }
    res.status(200).json(updatedCoursePost);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Delete a v post
router.delete('/:id', verifyTokenAuth, async (req, res) => {
  const courseID = req.params.id;

  try {
    const course = await Course.findById(courseID);
    if (!course) {
      return res.status(404).json('Course not found.');
    }

    const isAdmin = req.user.role === 'admin';
    const isCreator = course.creator.toString() === req.user.id;

    if (!isAdmin && !isCreator) {
      return res.status(403).json('You are not allowed to delete this course.');
    }

    await Promise.all(
      course.replies.map(async (reply) => {
        await Reply.findByIdAndDelete(reply._id);
      })
    );

    if (isCreator) {
      await User.findByIdAndUpdate(req.user.id, {
        $pull: { posts: courseID },
        $inc: { postsCount: -1 }
      }).exec();
    }

    if (isAdmin && !isCreator) {
      await User.findByIdAndUpdate(course.creator, {
        $pull: { posts: courseID },
        $inc: { postsCount: -1 }
      }).exec();
    }

    await Course.deleteOne({ _id: courseID });
    return res.status(200).json('Course deleted.');
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

module.exports = router;
