import { asyncHandler } from "../utils/asyncHandler.js";

const registerController = asyncHandler(async (req, res) => {
  res.status(200).json({
    message: "Ok",
  });
});
export { registerController };
