import express from "express";
import {
  list,
  loginUser,
  logOutUser,
  registerController,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = express.Router();

router
  .post(
    "/register",
    upload.fields([
      { name: "avatar", maxCount: 1 },
      { name: "coverImage", maxCount: 1 },
    ]),
    registerController
  )
  .post("/login", loginUser)
  .post("/logout", verifyJWT, logOutUser)
  .get("/list", list);

export default router;
