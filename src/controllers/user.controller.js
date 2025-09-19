import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const registerController = asyncHandler(async (req, res) => {
  const { username, fullName, email, password } = req.body;

  // 1. Validate fields
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // 2. Check existing user
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new ApiError(
      409,
      "User with this username or email is already exist"
    );
  }

  // 3. Handle file uploads
  const avatarFile = req.files?.avatar[0].path;
  // const coverFile = req.files?.coverImage[0].path;
  let coverFile;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverFile = req.files.coverImage[0].path;
  }
  if (!avatarFile) {
    throw new ApiError(400, "Avatar file is required");
  }
  const avatar = await uploadOnCloudinary(avatarFile);
  const coverImage = coverFile ? await uploadOnCloudinary(coverFile) : null;
  if (!avatar) {
    throw new ApiError(400, "Failed to upload Avatar");
  }

  // 4. Create user
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "something went wrong");
  }

  // 5. Return response with user data
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User register successfully"));
});
export { registerController };
