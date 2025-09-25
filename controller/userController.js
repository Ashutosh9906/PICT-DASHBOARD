import mongoose from "mongoose";
import User from "../models/users.js";
import bcrypt from "bcryptjs";

async function handleAddAdmin(req, res) {
    try {
        const { email, password } = res.locals.validated;
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        const user = await User.create({
            email,
            password: hash
        });
        return res.status(200).json({ msg: "Admin added successfully", user });
    } catch (error) {
        console.log("Error", error);
    }
}

async function handleAddAllowedUsers(req, res) {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        const { email, password, newEmail } = res.locals.validated;
        const user = await User.findOne({
            email
        }).session(session);
        if (!user) throw new Error("Invalid Credentials");
        const match = await bcrypt.compare(password, user.password);
        if (!match) throw new Error("Invalid Password");
        if (newEmail && !user.allowedEmails.includes(newEmail)) {
            user.allowedEmails.push(newEmail);
            await user.save({ session });
        }
        await session.commitTransaction();
        session.endSession();
        return res.status(200).json({ msg: "Added new email", newEmail });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        if (error.message == "Invalid Credentials") return res.status(404).json({ msg: "Invalid Credentials" });
        if (error.message == "Invalid Password") return res.status(400).json({ msg: "Invalid Password" })
        res.status(500).json({ msg: "Server error", error: error.message });
    }
}

export {
    handleAddAdmin,
    handleAddAllowedUsers
}