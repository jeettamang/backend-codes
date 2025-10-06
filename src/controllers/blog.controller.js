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
const getBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug) {
      return res.status(400).json({
        message: "Slug not found",
      });
    }
    const blog = await Blog.findOne({ slug }).populate(
      "author",
      "username email"
    );
    if (!blog) {
      return res.status(404).json({
        message: "Blog not found",
      });
    }
    res.status(200).json({ message: "Blog fetched successfully", data: blog });
  } catch (error) {
    console.error("Failed to get blog");
    res.status(500).json({ message: "Error is getBySlug API", error });
  }
};
const updateBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const { title, ...rest } = req.body;
    if (!slug) {
      return res.status(400).json({ message: "Slug is required" });
    }
    const updatedData = { ...rest };
    if (title) {
      updatedData.title = title;
      updatedData.slug = generateSlug(title);
    }
    const blog = await Blog.findOneAndUpdate(
      { slug },
      { $set: updatedData },
      { new: true }
    );
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
    res
      .status(200)
      .json({ message: "Blog updated successfully", data: updatedData });
  } catch (error) {
    console.error("Failed to update Blog");
    res.status(500).json({ message: "Error in update By slug API", error });
  }
};
const updateByStatus = async (req, res) => {
  try {
    const { slug } = req.params;
    const { status } = req.body;

    if (!["draft", "published"].includes(status)) {
      return res
        .status(400)
        .json({ message: "Invalid status or use 'draft or published only'" });
    }
    const blog = await Blog.findOneAndUpdate(
      { slug },
      { $set: { status: status } },
      { new: true }
    );
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
    res.status(200).json({ message: "Blog status updated successfully" });
  } catch (error) {
    console.error("Failed to update Blog");
    res.status(500).json({ message: "Error in update By slug API", error });
  }
};
export { createBlog, list, getBySlug, updateBySlug, updateByStatus };
