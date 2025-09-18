import express from "express";
import { registerController } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.js";
const router = express.Router();

router.post(
  "/register",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerController
);

export default router;
