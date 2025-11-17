import { z } from "zod";

const addNewUser = z.object({
    email: z.string().email({ message: "Invalid Email" }),
    password: z.string().min(4, "Password too short"),
    newEmail: z.string().email({ message: "Invalid Email" }),
})

const adminDetais = z.object({
    email: z.string().email({ message: "Invalid Email" }),
    password: z.string().min(4, "Password too short"),
})

export {
    addNewUser,
    adminDetais
}