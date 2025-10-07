import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createBlog,
  getBySlug,
  list,
  removeBySlug,
  updateBySlug,
  updateByStatus,
} from "../controllers/blog.controller.js";
const router = express.Router();

router
  .post("/create", verifyJWT, createBlog)
  .get("/list", list)
  .get("/getBySlug/:slug", getBySlug)
  .put("/update-by-slug/:slug", updateBySlug)
  .patch("/status-slug/:slug", updateByStatus)
  .delete("/delete-by-slug/:slug", removeBySlug);
export default router;
