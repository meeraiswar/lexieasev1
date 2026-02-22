
import express from "express";
import { generateStudentReport } from "../controllers/reportController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/student", protect, authorizeRoles("student"), generateStudentReport);

export default router;