import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const generateAccessTokenAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went wrong");
  }
};

const registerController = asyncHandler(async (req, res) => {
  try {
    const { username, fullName, email, password } = req.body;

    // 1. Validate fields
    if (
      [fullName, email, username, password].some(
        (field) => field?.trim() === ""
      )
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
  } catch (error) {
    throw new ApiError(500, "Error in register API");
  }
});

//Login
const loginUser = asyncHandler(async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!(username || email)) {
      throw new ApiError(400, "Username or email is required");
    }
    const user = await User.findOne({
      $or: [{ username }, { email }],
    });
    if (!user) {
      throw new ApiError(404, "User does not exit");
    }
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
      throw new ApiError(401, "Invalid credentials");
    }

    const { accessToken, refreshToken } =
      await generateAccessTokenAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    const options = {
      httpOnly: true,
      secure: true,
    };
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            user: loggedInUser,
            accessToken,
            refreshToken,
          },
          "User logged in suucessfully"
        )
      );
  } catch (error) {
    throw new ApiError(500, "Something went wrong");
  }
});

//Logged out
const logOutUser = asyncHandler(async (req, res) => {
  User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    { new: true }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user?._id;
  const user = await User.findById(userId);
  const isPasswordCorrect = await User.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Old password is incorrect");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(201, {}, "Password changed successfully"));
});
//Get cuurent user
// const currentUser = asyncHandler(async (req, res) => {
//   return res
//     .status(200)
//     .json(new ApiResponse(201, req.user, "Current user fethed successfully"));
// });
const list = asyncHandler(async (req, res) => {
  const { username, role, page = 1, limit = 10 } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const query = [];
  if (username) {
    const safeUserName = username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.push({
      $match: {
        username: new RegExp(safeUserName, "i"),
      },
    });
  }
  if (role) {
    const safeUserRole = role.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.push({
      $match: {
        role: new RegExp(safeUserRole, "i"),
      },
    });
  }
  query.push({
    $facet: {
      metadata: [
        {
          $count: "total",
        },
      ],
      data: [
        {
          $skip: (pageNum - 1) * limitNum,
        },
        {
          $limit: limitNum,
        },
        {
          $project: { password: 0, refreshToken: 0 },
        },
      ],
    },
  });
  query.push({
    $addFields: {
      total: {
        $arrayElemAt: ["$metadata.total", 0],
      },
    },
  });

  const result = await User.aggregate(query);
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        users: result[0].data,
        total: result[0].total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(result[0].total / limitNum),
      },
      "Users fetched successfully"
    )
  );
});
//Update account
const updateUser = asyncHandler(async (req, res) => {
  const { fullName, email, username } = req.body;
  if ([fullName, username, email].some((field) => field?.trim())) {
    throw new ApiError(400, "All fields are required");
  }
  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { fullName, email, username },
    },
    { new: true }
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(201, updateUser, "User updated succeed"));
});
export {
  registerController,
  loginUser,
  logOutUser,
  changeCurrentPassword,
  // currentUser,
  list,
  updateUser,
};
