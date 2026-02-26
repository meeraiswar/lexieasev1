import User from "../models/User.js";
import StudentTherapist from "../models/StudentTherapist.js";
import jwt from "jsonwebtoken";

const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const sendTokenResponse = (user, res) => {
  const token = generateToken(user);

  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // true in production (HTTPS)
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
};

export const register = async (req, res) => {
  try {
    const { name, email, password, role, therapistId, age } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const userData = {
      name,
      email,
      password,
      role,
    };
    if (age != null) userData.age = age;

    const user = await User.create(userData);

    // If registering as a student, potentially create therapist link
    if (role === "student") {
      try {
        if (therapistId) {
          // explicit therapist selected by user
          await StudentTherapist.create({
            studentId: user._id,
            therapistId,
          });
        } else {
          // no therapist chosen; if exactly one therapist exists, assign automatically
          const therapists = await User.find({ role: "therapist" }).select("_id");
          if (therapists.length === 1) {
            await StudentTherapist.create({
              studentId: user._id,
              therapistId: therapists[0]._id,
            });
          }
        }
      } catch (err) {
        console.error("Error assigning therapist:", err);
        // don't block registration on assignment failure
      }
    }

    sendTokenResponse(user, res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // update lastActive timestamp
    try {
      user.lastActive = new Date();
      await user.save();
    } catch (err) {
      console.error("Failed to update lastActive:", err);
    }

    sendTokenResponse(user, res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const logout = (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
  });

  res.json({ message: "Logged out" });
};

/* ================================
   GET ALL THERAPISTS
================================ */
export const getTherapists = async (req, res) => {
  try {
    const therapists = await User.find({ role: "therapist" }).select("_id name email");
    
    return res.json({
      success: true,
      therapists
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
