import { Router } from "express";
import { handleAddAdmin, handleAddAllowedUsers } from "../controller/userController.js";
import { parseRequestBody } from "../middlewares/parseBody.js";
import { addNewUser, adminDetais } from "../schemas/userSchema.js";

const router = Router();

router.post("/addAdmin", parseRequestBody(adminDetais), handleAddAdmin);
router.post("/AllowedUser", parseRequestBody(addNewUser), handleAddAllowedUsers);
router.get("/adminPage", (req, res) => {
    return res.render("email-data")
})

export default router