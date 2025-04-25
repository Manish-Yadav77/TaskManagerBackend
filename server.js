import express from "express";
import sendMail from "./config/nodemailerConfig.js";
import cors from "cors";
import authenticateToken from "./middleware/auth.js";
import connectDB from "./database.js";
import User from "./Models/UserModel.js";
import jwt from "jsonwebtoken";
import boardRoutes from "./routes/boards.js";
import dotenv from "dotenv";
dotenv.config();
import bcrypt from "bcrypt";
const app = express();
connectDB();

app.use(
  cors({
    origin: ["http://localhost:5173", "https://tasks-managerr.netlify.app/"],
    credentials: true,
  })
);
app.use(express.json());

app.use("/api/boards", boardRoutes);

// Register
app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: "user",
      boardData: { boards: [], activeBoardId: null },
    });

    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error registering the user:\n", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Generate JWT Token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Return user info and token
    res.status(200).json({
      message: "Login successful 🚀",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:\n", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get logged-in user's data
app.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get all users (Admin access only)
app.get("/users", authenticateToken, async (req, res) => {
  if (req.user.role !== "Admin")
    return res.status(403).json({ message: "Access denied" });
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all tasks of logged-in user
app.get("/tasks", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    res.status(200).json(user.boardData.boards);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get all boards of logged-in user
app.get("/api/boards", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    res.status(200).json(user.boardData);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Frontend save and update board for per user
app.post("/api/saveBoards", authenticateToken, async (req, res) => {
  const { boards, activeBoardId } = req.body;
  const userId = req.user.userId;

  try {
    const user = await User.findById(userId);
    // console.log("Found user:", user);
    if (user) {
      user.boardData.boards = boards;
      user.boardData.activeBoardId = activeBoardId;
      user.markModified("boardData");
      await user.save();
      res.json({ message: "Boards saved successfully!" });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save boards" });
  }
});

// Send mail for reset password.....

const resetTokens = {};

app.post("/api/auth/request-reset", async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== "string") {
    return res.status(400).json({ message: "Please provide a valid email." });
  }

  try {
    // Find user (assuming Mongoose)
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Generate 6-digit OTP
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Save token
    resetTokens[email] = { token, expiresAt };

    // Email content
    const subject = "Your Password Reset Code";
    const html = `
      <h3>Hello ${user.name || "User"},</h3>
      <p>Your password reset code is:</p>
      <h2 style="color:blue;">${token}</h2>
      <p>This code will expire in 10 minutes.</p>
    `;

    // Send the email
    await sendMail(email, subject, "", html);

    res.json({ message: "Reset code sent successfully." });
  } catch (error) {
    console.error("Mail Error:", error.message);
    res.status(500).json({ message: "Failed to send reset email." });
  }
});

app.post("/api/auth/verify-code", (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ message: "Email and code are required." });
  }

  const tokenData = resetTokens[email];

  if (!tokenData) {
    return res.status(400).json({ message: "No reset code found. Please request a new one." });
  }

  const { token, expiresAt } = tokenData;

  if (Date.now() > expiresAt) {
    delete resetTokens[email];
    return res.status(400).json({ message: "Reset code has expired. Please request a new one." });
  }

  if (code !== token) {
    return res.status(400).json({ message: "Invalid reset code." });
  }

  delete resetTokens[email]; // Invalidate token after use
  return res.status(200).json({ message: "OTP verified successfully." });
});

app.post("/api/auth/reset-password", async (req, res) => {
  const { email, password, confirm } = req.body;

  if (!email || !password || !confirm) {
    return res.status(400).json({ message: "All fields are required." });
  }

  if (password !== confirm) {
    return res.status(400).json({ message: "Passwords do not match." });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;

    await user.save();

    res.json({ message: "Password reset successful." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Something went wrong." });
  }
});


app.listen(process.env.PORT, () => {
  console.log(`Server is running on localhost:${process.env.PORT} 🚀`);
});
