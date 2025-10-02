import { Blog } from "../models/blog.model.js";
import { generateSlug } from "../utils/slug.js";

const createBlog = async (req, res) => {
  try {
    const { title, content } = req.body;
    const userId = req.user?._id;
    if (!userId) {
      throw new Error("User not found");
    }
    if (!title || !content) {
      throw new Error("Title and content are required");
    }
    const slug = generateSlug(title);
    const existedBlog = await Blog.findOne({ slug });
    if (existedBlog) {
      throw new Error("Blog already exist");
    }
    const blog = await Blog.create({
      title,
      content,
      author: userId,
      slug,
    });
    return res
      .status(200)
      .json({ message: "Blog created successfully", data: blog });
  } catch (error) {
    res.status(500).json("Failed to create blog");
    console.log({ error });
  }
};
const list = async (req, res) => {
  try {
    const { title, page = 1, limit = 10 } = req.query;
    const query = [];
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    //Search
    if (title) {
      query.push({
        $match: { title: new RegExp(title, "i") },
      });
    }
    //Lookup author info
    query.push({
      $lookup: {
        from: "users",
        localField: "author",
        foreignField: "_id",
        as: "author",
        pipeline: [
          {
            $project: {
              username: 0,
              password: 0,
              avatar: 0,
              refreshToken: 0,
              coverImage: 0,
            },
          },
        ],
      },
    });
    //pagination
    query.push({
      $facet: {
        metadata: [{ $count: "total" }],
        data: [
          { $skip: (pageNum - 1) * limitNum },
          { $limit: limitNum },
          {
            $project: {
              title: 1,
              slug: 1,
              author: 1,
              content: 1,
              createdAt: 1,
              updatedAt: 1,
            },
          },
        ],
      },
    });
    const result = await Blog.aggregate(query);
    const blogs = result[0]?.data || [];
    const total = result[0]?.metadata[0]?.total || 0;

    return res.status(200).json({
      message: "All blogs are listed",
      data: {
        blogs,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: total > 0 ? Math.ceil(total / limitNum) : 0,
      },
    });
  } catch (error) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
};

export { createBlog, list };
