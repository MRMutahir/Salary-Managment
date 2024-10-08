import {
  generateResetPasswordToken,
  generateToken,
  hashPassword,
  sendResponse,
} from "../helpers/common.js";
import { deleteToken, findToken } from "../services/tokenService.js";
import { findUser, findUserAndUpdate } from "../services/users.js";
import mongoose from "mongoose";

const accountVerification = async (req, res, next) => {
  const { email, code } = req.body;

  // Validate email and code presence
  if (!email) return sendResponse(res, "Email is required", false, 400);
  if (!code) return sendResponse(res, "Code is required", false, 400);

  console.log("code", code);
  console.log("email", email);

  try {
    // Find the token
    const token = await findToken(code);
    if (!token)
      return sendResponse(res, "Invalid or expired token", false, 401);
    // Update the user to be verified
    const isVerifiedUser = await findUserAndUpdate(token.userID, {
      isVerified: true,
    });
    if (!isVerifiedUser) return sendResponse(res, "User not found", false, 404);
    // after isVerifiedUser delete token
    await deleteToken(token);
    // Send success response
    return sendResponse(res, "You are now verified", true, 200);
  } catch (error) {
    console.error(`Error during account verification: ${error}`);
    return sendResponse(res, "Internal Server Error", false, 500);
  }
};

const resetPasswordToken = async (req, res, next) => {
  const { email } = req.body;

  // Validate email
  if (!email) {
    return sendResponse(res, "Enter a valid email", true, 400);
  }

  try {
    // Find user by email
    const user = await findUser({ email });

    // User not found
    if (!user) {
      return sendResponse(res, "You are not an authenticated user", true, 404);
    }

    // Generate reset password token
    const token = await generateResetPasswordToken(user._id);

    // Send response with token
    return sendResponse(res, "Your reset password token", false, 200, {
      token,
    });
  } catch (error) {
    // Handle unexpected errors
    console.error(error);
    return sendResponse(res, "An unexpected error occurred", true, 500);
  }
};

const resetPassword = async (req, res, next) => {
  const { code, newPassword } = req.body; // Extract code and newPassword from request body

  if (!code) {
    return sendResponse(res, "Code not found", false, 404);
  }

  if (!newPassword) {
    return sendResponse(res, "Password not found", false, 404);
  }

  try {
    const token = await findToken(code);
    if (!token) {
      return sendResponse(res, "Invalid code", false, 404);
    }

    const user = await findUser({ _id: token.userID });
    if (!user) {
      return sendResponse(res, "User not found", false, 404);
    }

    const secretPassword = await hashPassword(newPassword);

    const updatePassword = await findUserAndUpdate(user._id, {
      password: secretPassword,
    });
    if (updatePassword) {
      await deleteToken(token);
      return sendResponse(res, "New password successfully added", true, 200);
    } else {
      return sendResponse(res, "Failed to update password", false, 500);
    }
  } catch (error) {
    return sendResponse(res, "Internal server error", false, 500);
  }
};

const resendCode = async (req, res, next) => {
  const { userID, tokenType } = req.body;
  console.log("userID", userID);
  console.log("tokenType", tokenType);

  // Validate input
  if (!userID) {
    return sendResponse(res, "User ID is required", true, 400);
  }

  if (!mongoose.Types.ObjectId.isValid(userID)) {
    return sendResponse(res, "Invalid User ID format", true, 400);
  }

  if (!tokenType) {
    return sendResponse(res, "Token type is required", true, 400);
  }

  try {
    // Find user by userID
    console.log("try catch");
    const user = await findUser({ _id: new mongoose.Types.ObjectId(userID) });
    console.log("user", user);

    // User not found
    if (!user) {
      return sendResponse(res, "User not found", true, 404);
    }

    // Generate token
    const token = await generateToken(user._id, tokenType);
    console.log("token", token);

    // Send response with token
    return sendResponse(res, "Token generated successfully", false, 200, token);
  } catch (error) {
    console.error(`Error during token generation: ${error}`);
    return sendResponse(res, "Internal Server Error", true, 500);
  }
};

export { accountVerification, resetPasswordToken, resetPassword, resendCode };
