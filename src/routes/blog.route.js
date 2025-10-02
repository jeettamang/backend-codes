import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createBlog, list } from "../controllers/blog.controller.js";
const router = express.Router();

router.post("/create", verifyJWT, createBlog).get("/list", list);
export default router;
